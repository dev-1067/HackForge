"""What a delivery rider may see about their own account. No scores, no internal reasons."""
from __future__ import annotations

from typing import Any

from sqlalchemy import select

from engine.profile import STATUS_ACTIVE, STATUS_HELD, STATUS_PENDING, STATUS_SUSPENDED, STATUS_WATCH

from .auth import AuthContext
from .errors import InvalidState
from .models import AuditRow, DecisionRow, RiderRow, SessionRow, StepupRow
from .service import TrustService, utcnow

STATE_TEXT = {
    "ok": ("Your account is in good standing.", "Nothing needs your attention."),
    "verification_needed": ("Please confirm it is you.",
                            "We noticed something different about your recent activity. A quick confirmation keeps your account safe."),
    "on_hold": ("Your payouts are on hold.",
                "Our team is taking a closer look at your account. You do not need to do anything right now."),
    "suspended": ("Your account is paused.", "Our team paused your account to protect it. You can ask for a review below."),
}
STATE_FROM_STATUS = {
    STATUS_ACTIVE: "ok", STATUS_WATCH: "ok", STATUS_PENDING: "verification_needed",
    STATUS_HELD: "on_hold", STATUS_SUSPENDED: "suspended",
}


def _device_label(device_id: str | None) -> str:
    return f"Phone ending {device_id[-4:]}" if device_id and device_id != "unknown" else "Unknown phone"


def _activity_note(level_num: int, flags: list[str]) -> tuple[str, str]:
    if level_num >= 2:
        return "We asked for an extra check.", "check"
    if "new_device" in flags:
        return "New phone noticed.", "noted"
    if "new_city" in flags:
        return "New city noticed.", "noted"
    if flags:
        return "Something new noticed.", "noted"
    return "Looked as usual.", "normal"


def ensure_rider_row(svc: TrustService, rider_id: str, name: str) -> None:
    with svc.db.session() as db:
        if db.get(RiderRow, rider_id) is None:
            db.add(RiderRow(rider_id=rider_id, archetype="unknown", status="active", created_at=utcnow()))
            db.commit()


def rider_overview(svc: TrustService, ctx: AuthContext) -> dict[str, Any]:
    assert ctx.rider_id is not None
    ensure_rider_row(svc, ctx.rider_id, ctx.name)
    state = svc.engine.get_state(ctx.rider_id)
    status = state.status if state is not None else STATUS_ACTIVE
    key = STATE_FROM_STATUS.get(status, "ok")
    headline, detail = STATE_TEXT[key]

    with svc.db.session() as db:
        rows = db.execute(
            select(SessionRow, DecisionRow).join(DecisionRow, DecisionRow.session_id == SessionRow.session_id)
            .where(SessionRow.rider_id == ctx.rider_id).order_by(SessionRow.started_at.desc()).limit(12)).all()
    activity = []
    for session, decision in rows:
        note, tone = _activity_note(decision.level_num, decision.context_flags or [])
        activity.append({"when": session.started_at.isoformat(), "city": session.context.get("city"),
                         "phone": _device_label(session.context.get("device_id")), "note": note, "tone": tone})

    notices = []
    if any(a["note"] == "New phone noticed." for a in activity[:3]):
        notices.append("We noticed a new phone on your account. If this was you, no action is needed.")
    return {
        "rider": {"name": ctx.name, "rider_id": ctx.rider_id},
        "account": {"state": key, "headline": headline, "detail": detail,
                    "action_required": key == "verification_needed"},
        "notices": notices,
        "explanation": status_explanation(svc, ctx.rider_id, key),
        "recent_activity": activity,
    }


def submit_verification(svc: TrustService, ctx: AuthContext, confirmed: bool) -> dict[str, Any]:
    assert ctx.rider_id is not None
    state = svc.engine.get_state(ctx.rider_id)
    if state is None or state.status != STATUS_PENDING:
        raise InvalidState("There is nothing to confirm right now.")
    svc.stepup_result(ctx.rider_id, confirmed, method="in_app_confirmation", actor=f"rider:{ctx.user_id}")
    return rider_overview(svc, ctx)


PLACE_FLAGS = {"new_city": "a city we had not seen you in", "new_zone": "a delivery area we had not seen you in",
               "new_network_provider": "a different internet connection", "new_network_type": "a different internet connection"}


def status_explanation(svc: TrustService, rider_id: str, key: str) -> dict[str, Any] | None:
    """Why the account is not simply 'fine', in the rider's own terms: what was noticed, when, what it means, what to do.

    Only things the rider can see for themselves (their own phones, cities and times) and plain sentences. No scores,
    thresholds or model terms, and never the reviewer's private note."""
    if key == "ok":
        return None
    with svc.db.session() as db:
        flagged = db.execute(
            select(DecisionRow, SessionRow).join(SessionRow, SessionRow.session_id == DecisionRow.session_id)
            .where(DecisionRow.rider_id == rider_id, DecisionRow.level_num >= 2)
            .order_by(DecisionRow.decision_id.desc()).limit(40)).all()
        step = db.scalars(select(StepupRow).where(StepupRow.rider_id == rider_id).order_by(StepupRow.id.desc())).first()
        last_review = db.scalars(select(DecisionRow).where(
            DecisionRow.rider_id == rider_id, DecisionRow.review_verdict == "confirmed_takeover")
            .order_by(DecisionRow.reviewed_at.desc())).first()
        expired = db.scalars(select(AuditRow).where(AuditRow.rider_id == rider_id, AuditRow.action == "stepup_expired")
                             .order_by(AuditRow.id.desc())).first()
    open_cases = [(d, s) for d, s in flagged if d.review_verdict is None] or flagged[:3]
    seen_flags = {f for d, _ in open_cases for f in (d.context_flags or [])}

    noticed: list[str] = []
    if "new_device" in seen_flags:
        noticed.append("Your account was used on a phone we had not seen before.")
    for flag, text in PLACE_FLAGS.items():
        if flag in seen_flags:
            noticed.append(f"It was used from {text}.")
            break
    if "shared_device" in seen_flags:
        noticed.append("The phone used is also used by other rider accounts.")
    count = len(open_cases)
    noticed.append(f"The way the account was being used (how orders are accepted and how the rider rides) stayed different from your usual "
                   f"pattern across {count} recent session{'s' if count != 1 else ''}." if count > 1 else
                   "The way the account was being used was different from your usual pattern.")

    evidence = [{"at": s.started_at.isoformat(), "city": s.context.get("city"), "phone": _device_label(s.context.get("device_id")),
                 "what": "New phone" if "new_device" in (d.context_flags or []) else "Different from your usual pattern"}
                for d, s in open_cases[:4]]

    if key == "verification_needed":
        steps = "We asked you to confirm it is you. This takes a few seconds."
        means = "You can keep working. Nothing is held while you answer."
        todo = ["Answer the confirmation above: Yes, it was me, or No, that was not me.",
                "If you do not recognise this activity, choose No and tell us in Help & Review."]
        outcome, by = "A confirmation was asked", "automatic safety check"
    elif key == "on_hold":
        if step is not None and step.result == "expired":
            steps = "We asked you to confirm it is you and did not receive an answer, so a person now has to look at the account."
        elif step is not None and step.result == "failed":
            steps = "The confirmation we asked for did not go through, so a person now has to look at the account."
        else:
            steps = "The change in activity continued, so a person now has to look at the account."
        means = "Payouts are on hold while the team reviews. Your account is not closed."
        todo = ["You do not have to do anything, but you can ask for a review and explain what changed (a new phone, a trip).",
                "If this was you, say so in Help & Review. It helps the reviewer."]
        outcome, by = "Payouts on hold", "automatic safety check"
        noticed.append(steps)
    else:
        steps = "After the account was reviewed, our team paused it to protect it."
        means = "You cannot work with this account until it is reviewed again. Your history is kept."
        todo = ["Ask for a human review in Help & Review. Say what happened and, if you had a new phone, which one.",
                "You can also speak to your fleet manager."]
        outcome, by = "Account paused after review", "our team"
        noticed.append(steps)

    decided_at = (last_review.reviewed_at if key == "suspended" and last_review and last_review.reviewed_at
                  else expired.at if expired and key == "on_hold" else (open_cases[0][0].decided_at if open_cases else None))
    return {
        "state": key,
        "since": decided_at.isoformat() if decided_at else None,
        "outcome": outcome, "decided_by": by,
        "noticed": [n for n in noticed if n],
        "evidence": evidence,
        "what_it_means": means,
        "what_you_can_do": todo,
        "note": "A new phone or a new place is not proof that anything is wrong. We look at how the account is being used.",
        "help": {"kind": "human_review" if key != "verification_needed" else "verification_help"},
    }
