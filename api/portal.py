"""What a delivery rider may see about their own account. No scores, no internal reasons."""
from __future__ import annotations

from typing import Any

from sqlalchemy import select

from engine.profile import STATUS_ACTIVE, STATUS_HELD, STATUS_PENDING, STATUS_SUSPENDED, STATUS_WATCH

from .auth import AuthContext
from .errors import InvalidState
from .models import DecisionRow, RiderRow, SessionRow
from .service import TrustService, utcnow

STATE_TEXT = {
    "ok": ("Your account is in good standing.", "Nothing needs your attention."),
    "verification_needed": ("Please confirm it is you.",
                            "We noticed something different about your recent activity. A quick confirmation keeps your account safe."),
    "on_hold": ("Your payouts are on hold.",
                "Our team is taking a closer look at your account. You do not need to do anything right now."),
    "suspended": ("Your account is paused.", "Please contact your fleet manager to get it reviewed."),
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
        "recent_activity": activity,
    }


def submit_verification(svc: TrustService, ctx: AuthContext, confirmed: bool) -> dict[str, Any]:
    assert ctx.rider_id is not None
    state = svc.engine.get_state(ctx.rider_id)
    if state is None or state.status != STATUS_PENDING:
        raise InvalidState("There is nothing to confirm right now.")
    svc.stepup_result(ctx.rider_id, confirmed, method="in_app_confirmation", actor=f"rider:{ctx.user_id}")
    return rider_overview(svc, ctx)
