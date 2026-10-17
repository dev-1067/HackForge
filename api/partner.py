"""Everything a delivery partner can see and do about their own account, plus the company side of their requests.

Nothing here touches the scoring engine's decisions or evidence: reporting a new phone or asking for a review
only records information for people to read. Simulated (demo) activity is labelled as such.
"""
from __future__ import annotations

from typing import Any

from datetime import timedelta

from sqlalchemy import func, select

from engine.profile import STATUS_PENDING

from .auth import AuthContext
from .errors import InvalidState, UnknownRider, ValidationFailed
from .models import (REQUEST_KINDS, AuditRow, DecisionRow, NotificationReadRow, ReviewRequestRow, SessionRow, SignInEventRow, StepupRow,
                     UserRow)
from .portal import STATE_FROM_STATUS, STATE_TEXT, ensure_rider_row, status_explanation
from .service import TrustService, rider_names, utcnow

DEMO_SOURCES = ("seed", "lab")
MAX_OPEN_REQUESTS = 5
MESSAGE_MIN, MESSAGE_MAX = 10, 1000

KIND_LABEL = {
    "unfamiliar_signin": "Unfamiliar sign-in or device",
    "verification_help": "Help with a verification request",
    "legitimate_change": "A phone or location change that is legitimate",
    "human_review": "Ask a person to review my account",
    "device_change": "Device change reported",
    "other": "Something else",
}
RIDER_STATUS_LABEL = {"open": "Received", "in_review": "Being reviewed", "resolved": "Resolved", "declined": "Closed"}
RESPOND_ACTIONS = {"start_review": "in_review", "resolve": "resolved", "decline": "declined"}


def device_label(device_id: str | None) -> str:
    return f"Phone ending {device_id[-4:]}" if device_id and device_id != "unknown" else "Unknown phone"


def _iso(value) -> str | None:
    return value.isoformat() if value else None


def _is_demo(source: str | None) -> bool:
    return source in DEMO_SOURCES


# ---------------------------------------------------------------------------------- devices
def observed_devices(db, rider_id: str, reported: set[str]) -> list[dict[str, Any]]:
    rows = db.execute(select(SessionRow.started_at, SessionRow.context, SessionRow.source)
                      .where(SessionRow.rider_id == rider_id).order_by(SessionRow.started_at)).all()
    devices: dict[str, dict[str, Any]] = {}
    for started, context, source in rows:
        device_id = context.get("device_id")
        if not device_id or device_id == "unknown":
            continue
        entry = devices.setdefault(device_id, {
            "device_id": device_id, "label": device_label(device_id), "first_seen": started, "sessions": 0,
            "demo_only": True})
        entry.update(last_seen=started, os=context.get("os"), city=context.get("city"), app_version=context.get("app_version"))
        entry["sessions"] += 1
        entry["demo_only"] = entry["demo_only"] and _is_demo(source)
    current = rows[-1][1].get("device_id") if rows else None
    out = []
    for d in sorted(devices.values(), key=lambda e: e["last_seen"], reverse=True):
        out.append({"device_id": d["device_id"], "label": d["label"], "os": d["os"], "city": d["city"],
                    "app_version": d["app_version"], "first_seen": _iso(d["first_seen"]), "last_seen": _iso(d["last_seen"]),
                    "sessions": d["sessions"], "current": d["device_id"] == current,
                    "origin": "demo" if d["demo_only"] else "recorded", "reported": d["device_id"] in reported})
    return out


def _reported_devices(db, rider_id: str) -> set[str]:
    return set(db.scalars(select(ReviewRequestRow.device_id).where(
        ReviewRequestRow.rider_id == rider_id, ReviewRequestRow.kind == "device_change",
        ReviewRequestRow.status.in_(("open", "in_review", "resolved")), ReviewRequestRow.device_id.is_not(None))))


def new_device_sessions(db, rider_id: str, limit: int) -> list[tuple[DecisionRow, SessionRow]]:
    """Sessions where the engine noticed a phone it had not seen before (filtered here so it works on any database)."""
    rows = db.execute(select(DecisionRow, SessionRow).join(SessionRow, SessionRow.session_id == DecisionRow.session_id)
                      .where(DecisionRow.rider_id == rider_id).order_by(SessionRow.started_at.desc()).limit(600)).all()
    return [(d, s) for d, s in rows if "new_device" in (d.context_flags or [])][:limit]


# ---------------------------------------------------------------------------------- requests
def request_view(row: ReviewRequestRow) -> dict[str, Any]:
    return {"id": row.id, "kind": row.kind, "kind_label": KIND_LABEL[row.kind], "message": row.message,
            "device_id": row.device_id, "device_label": device_label(row.device_id) if row.device_id else None,
            "status": row.status, "status_label": RIDER_STATUS_LABEL[row.status],
            "created_at": _iso(row.created_at), "updated_at": _iso(row.updated_at),
            "response_note": row.response_note, "responded_at": _iso(row.responded_at)}


def list_requests(svc: TrustService, ctx: AuthContext) -> list[dict[str, Any]]:
    with svc.db.session() as db:
        rows = db.scalars(select(ReviewRequestRow).where(ReviewRequestRow.rider_id == ctx.rider_id)
                          .order_by(ReviewRequestRow.id.desc()).limit(50)).all()
        return [request_view(r) for r in rows]


def create_request(svc: TrustService, ctx: AuthContext, kind: str, message: str, device_id: str | None) -> dict[str, Any]:
    errors: dict[str, str] = {}
    message = " ".join((message or "").split())
    if kind not in REQUEST_KINDS or kind == "device_change":
        errors["kind"] = "Choose what you need help with."
    if len(message) < MESSAGE_MIN:
        errors["message"] = f"Please tell us a little more (at least {MESSAGE_MIN} characters)."
    elif len(message) > MESSAGE_MAX:
        errors["message"] = f"Please keep it under {MESSAGE_MAX} characters."
    if errors:
        raise ValidationFailed(errors)
    return _store_request(svc, ctx, kind, message, device_id)


def report_device_change(svc: TrustService, ctx: AuthContext, device_id: str, note: str | None) -> dict[str, Any]:
    note = " ".join((note or "").split())
    if len(note) > MESSAGE_MAX - 80:
        raise ValidationFailed({"note": "Please keep the note shorter."})
    text = "I recognise this device and it is mine." + (f" {note}" if note else "")
    return _store_request(svc, ctx, "device_change", text, device_id)


def _store_request(svc: TrustService, ctx: AuthContext, kind: str, message: str, device_id: str | None) -> dict[str, Any]:
    assert ctx.rider_id is not None
    ensure_rider_row(svc, ctx.rider_id, ctx.name)
    with svc.db.session() as db:
        if device_id:
            known = {d["device_id"] for d in observed_devices(db, ctx.rider_id, set())}
            if device_id not in known:
                raise ValidationFailed({"device_id": "We have not seen that device on your account."})
            if kind == "device_change" and device_id in _reported_devices(db, ctx.rider_id):
                raise InvalidState("You have already told us about this device.")
        open_count = db.scalar(select(func.count()).select_from(ReviewRequestRow).where(
            ReviewRequestRow.rider_id == ctx.rider_id, ReviewRequestRow.status.in_(("open", "in_review")))) or 0
        if open_count >= MAX_OPEN_REQUESTS:
            raise InvalidState("You already have several open requests. Please wait for a reply before sending more.")
        now = utcnow()
        row = ReviewRequestRow(rider_id=ctx.rider_id, user_id=ctx.user_id, kind=kind, message=message,
                               device_id=device_id, status="open", created_at=now, updated_at=now)
        db.add(row)
        db.add(AuditRow(rider_id=ctx.rider_id, actor=f"rider:{ctx.user_id}", action=f"request_{kind}",
                        details={"device_id": device_id}, at=now))
        db.commit()
        db.refresh(row)
        view = request_view(row)
    svc.bus.publish("request", {"rider_id": ctx.rider_id, "kind": kind, "status": "open"})
    return view


# company side
def company_requests(svc: TrustService, status: str | None, rider_id: str | None, limit: int) -> list[dict[str, Any]]:
    with svc.db.session() as db:
        stmt = select(ReviewRequestRow).order_by(ReviewRequestRow.id.desc()).limit(limit)
        if status == "active":
            stmt = stmt.where(ReviewRequestRow.status.in_(("open", "in_review")))
        elif status:
            stmt = stmt.where(ReviewRequestRow.status == status)
        if rider_id:
            stmt = stmt.where(ReviewRequestRow.rider_id == rider_id)
        rows = db.scalars(stmt).all()
        names = rider_names(db, [r.rider_id for r in rows])
        out = []
        for row in rows:
            view = request_view(row)
            view.update(rider_id=row.rider_id, rider_name=names.get(row.rider_id), responded_by=row.responded_by,
                        rider_status=(svc.engine.get_state(row.rider_id).status if svc.engine.get_state(row.rider_id) else "active"))
            out.append(view)
        return out


def respond_to_request(svc: TrustService, request_id: int, action: str, note: str | None, reviewer: str) -> dict[str, Any]:
    if action not in RESPOND_ACTIONS:
        raise ValidationFailed({"action": "Unknown action."})
    note = " ".join((note or "").split())
    if action != "start_review" and len(note) < 3:
        raise ValidationFailed({"note": "Write a short reply the rider will see."})
    if len(note) > 1000:
        raise ValidationFailed({"note": "Please keep the reply under 1000 characters."})
    with svc.db.session() as db:
        row = db.get(ReviewRequestRow, request_id)
        if row is None:
            raise UnknownRider(f"request {request_id}")
        if row.status in ("resolved", "declined"):
            raise InvalidState("That request is already closed.")
        if action == "start_review" and row.status == "in_review":
            raise InvalidState("That request is already being reviewed.")
        now = utcnow()
        row.status, row.updated_at = RESPOND_ACTIONS[action], now
        if note:
            row.response_note = note
        row.responded_by, row.responded_at = reviewer, now
        db.add(AuditRow(rider_id=row.rider_id, actor=f"reviewer:{reviewer}", action=f"request_{action}",
                        details={"request_id": row.id, "kind": row.kind, "note": note or None}, at=now))
        db.commit()
        view = request_view(row)
        rider_id = row.rider_id
    svc.bus.publish("request", {"rider_id": rider_id, "kind": view["kind"], "status": view["status"]})
    return view


# ---------------------------------------------------------------------------------- account page
def account_overview(svc: TrustService, ctx: AuthContext) -> dict[str, Any]:
    assert ctx.rider_id is not None
    ensure_rider_row(svc, ctx.rider_id, ctx.name)
    state = svc.engine.get_state(ctx.rider_id)
    status = state.status if state is not None else "active"
    key = STATE_FROM_STATUS.get(status, "ok")
    headline, detail = STATE_TEXT[key]
    with svc.db.session() as db:
        user = db.get(UserRow, ctx.user_id)
        reported = _reported_devices(db, ctx.rider_id)
        devices = observed_devices(db, ctx.rider_id, reported)
        steps = db.execute(
            select(StepupRow, SessionRow.source).outerjoin(SessionRow, SessionRow.session_id == StepupRow.session_id)
            .where(StepupRow.rider_id == ctx.rider_id).order_by(StepupRow.id.desc()).limit(10)).all()
        last_two = db.scalars(select(SignInEventRow).where(SignInEventRow.user_id == ctx.user_id)
                              .order_by(SignInEventRow.at.desc()).limit(8)).all()
        recent_new_device = [(s.started_at, s.context, s.source) for _, s in new_device_sessions(db, ctx.rider_id, 3)]
        phone = user.phone or ""
        profile = {"name": ctx.name, "rider_id": ctx.rider_id, "phone_hint": f"•••• {phone[-4:]}" if phone else None,
                   "member_since": _iso(user.created_at), "last_sign_in": _iso(last_two[0].at) if last_two else None}

    history = [{"requested_at": _iso(s.issued_at), "resolved_at": _iso(s.resolved_at), "result": s.result,
                "origin": "demo" if _is_demo(src) else "recorded"} for s, src in steps]
    pending = next((h for h in history if h["result"] == "pending"), None)
    outstanding = None
    if state is not None and state.status == STATUS_PENDING:
        outstanding = {"requested_at": pending["requested_at"] if pending else None,
                       "message": "We noticed your recent activity looked different from usual. Please confirm it was you.",
                       "origin": pending["origin"] if pending else "recorded"}
    latest_event = max((h["resolved_at"] or h["requested_at"] for h in history if h["requested_at"]), default=None)

    recent_changes = [{"at": _iso(at), "label": device_label(ctx_["device_id"]), "city": ctx_.get("city"),
                       "origin": "demo" if _is_demo(src) else "recorded",
                       "reported": ctx_["device_id"] in reported} for at, ctx_, src in recent_new_device]
    new_browser_recent = any(e.is_new_browser for e in last_two[:3])
    unreported_new = [c for c in recent_changes if not c["reported"]]
    checkup = [
        {"key": "phone", "ok": not unreported_new,
         "text": "You have no unconfirmed phone changes." if not unreported_new
                 else f"A new phone was seen on {unreported_new[0]['at'][:10]}. If it is yours, tell us below."},
        {"key": "verification", "ok": outstanding is None and key in ("ok",),
         "text": "No verification is waiting for you." if outstanding is None and key == "ok"
                 else "A verification is waiting for you." if outstanding else "Your account is being looked at by our team."},
        {"key": "sign_ins", "ok": not new_browser_recent,
         "text": "Your recent sign-ins look familiar." if not new_browser_recent else "You signed in from a new browser recently."},
    ]
    return {
        "profile": profile,
        "status": {"state": key, "headline": headline, "detail": detail, "action_required": outstanding is not None},
        "explanation": status_explanation(svc, ctx.rider_id, key),
        "verification": {"outstanding": outstanding, "history": history, "latest_event_at": latest_event},
        "devices": devices, "recent_device_changes": recent_changes, "checkup": checkup,
    }


# ---------------------------------------------------------------------------------- activity timeline
def activity_timeline(svc: TrustService, ctx: AuthContext, limit: int = 40) -> list[dict[str, Any]]:
    assert ctx.rider_id is not None
    events: list[dict[str, Any]] = []
    with svc.db.session() as db:
        for e in db.scalars(select(SignInEventRow).where(SignInEventRow.user_id == ctx.user_id)
                            .order_by(SignInEventRow.at.desc()).limit(limit)):
            events.append({"id": f"signin-{e.id}", "kind": "sign_in", "at": _iso(e.at), "origin": "recorded",
                           "title": "New browser: " + e.browser_label if e.is_new_browser else "Signed in",
                           "detail": e.browser_label if not e.is_new_browser else "This is the first time you signed in from it.",
                           "tone": "noted" if e.is_new_browser else "normal"})
        for d, s in new_device_sessions(db, ctx.rider_id, limit):
            events.append({"id": f"device-{d.decision_id}", "kind": "new_device", "at": _iso(s.started_at),
                           "origin": "demo" if _is_demo(s.source) else "recorded",
                           "title": "New phone noticed", "detail": f"{device_label(s.context.get('device_id'))}"
                           + (f" in {s.context.get('city')}" if s.context.get("city") else ""), "tone": "noted"})
        for step, src in db.execute(
                select(StepupRow, SessionRow.source).outerjoin(SessionRow, SessionRow.session_id == StepupRow.session_id)
                .where(StepupRow.rider_id == ctx.rider_id).order_by(StepupRow.id.desc()).limit(limit)).all():
            origin = "demo" if _is_demo(src) else "recorded"
            events.append({"id": f"verify-{step.id}-ask", "kind": "verification_requested", "at": _iso(step.issued_at),
                           "origin": origin, "title": "We asked you to confirm it was you", "detail": "", "tone": "check",
                           "action": "verify" if step.result == "pending" else None})
            if step.resolved_at:
                events.append({"id": f"verify-{step.id}-done", "kind": "verification_done", "at": _iso(step.resolved_at),
                               "origin": origin, "tone": "normal" if step.result == "passed" else "check",
                               "title": "Verification completed" if step.result == "passed" else "Verification not completed",
                               "detail": "Thank you." if step.result == "passed" else "A person will take a look."})
        for r in db.scalars(select(ReviewRequestRow).where(ReviewRequestRow.rider_id == ctx.rider_id)
                            .order_by(ReviewRequestRow.id.desc()).limit(limit)):
            events.append({"id": f"request-{r.id}", "kind": "request", "at": _iso(r.created_at), "origin": "recorded",
                           "title": "You sent a request" if r.kind != "device_change" else "You reported a device",
                           "detail": KIND_LABEL[r.kind], "tone": "normal"})
            if r.responded_at and r.status in ("resolved", "declined"):
                events.append({"id": f"request-{r.id}-reply", "kind": "request_reply", "at": _iso(r.responded_at),
                               "origin": "recorded", "title": "We replied to your request",
                               "detail": r.response_note or "", "tone": "normal"})
    events.sort(key=lambda e: e["at"] or "", reverse=True)
    return events[:limit]


# ---------------------------------------------------------------------------------- privacy
def export_data(svc: TrustService, ctx: AuthContext) -> dict[str, Any]:
    """Everything the platform keeps about this rider that is theirs to see. No secrets, no internal scores."""
    account = account_overview(svc, ctx)
    with svc.db.session() as db:
        sign_ins = [{"at": _iso(e.at), "browser": e.browser_label, "new_browser": e.is_new_browser} for e in
                    db.scalars(select(SignInEventRow).where(SignInEventRow.user_id == ctx.user_id).order_by(SignInEventRow.at.desc()))]
    return {"exported_at": utcnow().isoformat(), "profile": account["profile"], "devices": account["devices"],
            "verification_history": account["verification"]["history"], "sign_ins": sign_ins,
            "requests": list_requests(svc, ctx),
            "note": "Simulated demo activity is marked origin=demo. Internal checks and scores are not part of this export."}


# ---------------------------------------------------------------------------------- notifications
NOTIFY_LINK = {"verification_requested": "/rider/account", "verification_done": "/rider/account", "request_reply": "/rider/help",
               "new_device": "/rider/account", "sign_in": "/rider/security", "status": "/rider"}


def _read_marker(db, ctx: AuthContext):
    row = db.get(NotificationReadRow, ctx.user_id)
    if row is not None:
        return row.last_read_at
    user = db.get(UserRow, ctx.user_id)
    return user.created_at if user else utcnow()


def notifications(svc: TrustService, ctx: AuthContext, limit: int = 40) -> dict[str, Any]:
    """The things a rider should notice: team replies, checks asked or finished, new phones and browsers, and the account's status.

    Built from what really happened (no separate fake feed). Unread means newer than the last time they opened the page."""
    assert ctx.rider_id is not None
    events = activity_timeline(svc, ctx, 120)
    with svc.db.session() as db:
        read_at = _read_marker(db, ctx)
    state = svc.engine.get_state(ctx.rider_id)
    key = STATE_FROM_STATUS.get(state.status if state else "active", "ok")
    items: list[dict[str, Any]] = []
    story = status_explanation(svc, ctx.rider_id, key)
    if story is not None:
        items.append({"id": "status-now", "kind": "status", "at": story["since"], "origin": "recorded", "tone": "check",
                      "title": {"verification_needed": "Please confirm it is you", "on_hold": "Your payouts are on hold",
                                "suspended": "Your account is paused"}[key],
                      "detail": story["what_it_means"], "link": NOTIFY_LINK["status"], "sticky": True})
    for e in events:
        if e["kind"] in ("verification_requested", "verification_done", "request_reply", "new_device") or (
                e["kind"] == "sign_in" and e["tone"] == "noted"):
            items.append({**{k: e.get(k) for k in ("id", "kind", "at", "origin", "tone", "title", "detail")},
                          "link": NOTIFY_LINK[e["kind"]], "sticky": False})
    for item in items:
        item["unread"] = bool(item["at"] and item["at"] > read_at.isoformat())
    sticky = [i for i in items if i["sticky"]]
    rest = sorted((i for i in items if not i["sticky"]), key=lambda i: i["at"] or "", reverse=True)
    items = (sticky + rest)[:limit]
    return {"items": items, "unread": sum(1 for i in items if i["unread"]), "last_read_at": read_at.isoformat()}


def unread_notifications(svc: TrustService, ctx: AuthContext) -> int:
    return notifications(svc, ctx, 40)["unread"]


def mark_notifications_read(svc: TrustService, ctx: AuthContext) -> dict[str, Any]:
    now = utcnow()
    with svc.db.session() as db:
        row = db.get(NotificationReadRow, ctx.user_id)
        if row is None:
            db.add(NotificationReadRow(user_id=ctx.user_id, last_read_at=now))
        else:
            row.last_read_at = now
        db.commit()
    return notifications(svc, ctx)


# ---------------------------------------------------------------------------------- work summary
def work_summary(svc: TrustService, ctx: AuthContext, days: int = 30) -> dict[str, Any]:
    """The rider's own sessions for the last ``days`` days up to their latest one: when, where, which phone. Nothing about scoring."""
    assert ctx.rider_id is not None
    ensure_rider_row(svc, ctx.rider_id, ctx.name)
    with svc.db.session() as db:
        total, first, last = db.execute(select(func.count(), func.min(SessionRow.started_at), func.max(SessionRow.started_at))
                                        .where(SessionRow.rider_id == ctx.rider_id)).one()
        rows: list[Any] = []
        if last is not None:
            start = last - timedelta(days=days)
            rows = db.execute(select(SessionRow.started_at, SessionRow.context, SessionRow.source)
                              .where(SessionRow.rider_id == ctx.rider_id, SessionRow.started_at >= start)
                              .order_by(SessionRow.started_at).limit(2000)).all()
    sessions = [{"at": at.isoformat(), "city": ctx_.get("city"), "phone": ctx_.get("device_id"),
                 "origin": "demo" if _is_demo(src) else "recorded"} for at, ctx_, src in rows]
    phones = {s["phone"] for s in sessions if s["phone"]}
    cities: dict[str, int] = {}
    for s in sessions:
        if s["city"]:
            cities[s["city"]] = cities.get(s["city"], 0) + 1
    return {
        "days": days,
        "period": {"from": sessions[0]["at"] if sessions else None, "to": _iso(last)},
        "sessions": [{"at": s["at"], "city": s["city"], "origin": s["origin"]} for s in sessions],
        "totals": {"sessions": len(sessions), "active_days": len({s["at"][:10] for s in sessions}),
                   "phones": len(phones), "cities": [{"city": c, "sessions": n} for c, n in sorted(cities.items(), key=lambda kv: -kv[1])]},
        "all_time": {"sessions": total or 0, "first_seen": _iso(first), "last_seen": _iso(last)},
        "includes_demo": any(s["origin"] == "demo" for s in sessions),
    }


def sign_in_history(svc: TrustService, ctx: AuthContext, current_digest: str | None, limit: int = 30) -> list[dict[str, Any]]:
    with svc.db.session() as db:
        rows = db.scalars(select(SignInEventRow).where(SignInEventRow.user_id == ctx.user_id)
                          .order_by(SignInEventRow.at.desc()).limit(limit)).all()
    return [{"at": _iso(e.at), "browser": e.browser_label, "new_browser": e.is_new_browser,
             "current": bool(current_digest and e.token_hash == current_digest)} for e in rows]
