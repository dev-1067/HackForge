"""Application service: wraps the Dev A engine with persistence, events and metrics."""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import case, func, or_, select, update
from sqlalchemy.orm import Session as DbSession

from engine import MODEL_VERSION, Session, TrustEngine, load_default_engine, load_engine
from engine.profile import ESCALATED_STATUSES, STATUS_PENDING

from .bus import EventBus
from .db import Database
from .errors import DuplicateSession, InvalidState, UnknownDecision, UnknownRider
from .models import AuditRow, DecisionRow, ProfileRow, ReviewRequestRow, RiderRow, SessionRow, StepupRow, UserRow
from .settings import Settings

LEVELS = ("L0", "L1", "L2", "L3", "L4")


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def decision_payload(row: DecisionRow, started_at: datetime | None = None) -> dict[str, Any]:
    return {
        "decision_id": row.decision_id, "session_id": row.session_id, "rider_id": row.rider_id,
        "decided_at": row.decided_at.isoformat(), "started_at": started_at.isoformat() if started_at else None,
        "level": row.level, "action": row.action, "status": row.status,
        "context_score": row.context_score, "habit_score": row.habit_score,
        "evidence_score": row.evidence_score, "threshold": row.threshold,
        "habit_deviation": row.habit_deviation, "context_flags": row.context_flags or [],
        "reasons": row.reasons or [], "model_version": row.model_version,
        "review_verdict": row.review_verdict, "reviewed_by": row.reviewed_by,
        "reviewed_at": row.reviewed_at.isoformat() if row.reviewed_at else None,
    }


def parse_ts(value: str | datetime | None, field: str = "date") -> datetime | None:
    """Accept an ISO date or datetime; anything without a time zone is read as UTC. Returns naive UTC."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        text = str(value).strip().replace("Z", "+00:00").replace("z", "+00:00")
        try:
            parsed = datetime.fromisoformat(text)
        except ValueError:
            raise ValueError(f"'{value}' is not a valid {field}; use a date like 2026-03-31") from None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def time_window(since: str | datetime | None, until: str | datetime | None) -> tuple[datetime | None, datetime | None]:
    start, end = parse_ts(since, "start date"), parse_ts(until, "end date")
    if start and end and start > end:
        raise ValueError("The start date is after the end date.")
    return start, end


def _like(term: str) -> str:
    return "%" + term.lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


def rider_match(term: str, id_column=None):
    """SQL condition: the rider id, the rider's name or (digits only) their phone contains ``term``."""
    term = term.strip()
    like = _like(term)
    id_column = RiderRow.rider_id if id_column is None else id_column
    conds = [func.lower(id_column).like(like, escape="\\"), func.lower(UserRow.name).like(like, escape="\\")]
    digits = "".join(ch for ch in term if ch.isdigit())
    if len(digits) >= 3 and len(digits) >= len(term.replace(" ", "").replace("-", "").replace("+", "")):
        conds.append(UserRow.phone.like("%" + digits + "%"))
    return or_(*conds)


def rider_names(db: DbSession, rider_ids: set[str] | list[str]) -> dict[str, str]:
    """Display names for riders who have an account; everyone else is shown by their id."""
    ids = list(set(rider_ids))
    if not ids:
        return {}
    rows = db.execute(select(UserRow.rider_id, UserRow.name).where(UserRow.rider_id.in_(ids))).all()
    return {rid: name for rid, name in rows}


class TrustService:
    def __init__(self, settings: Settings, engine: TrustEngine | None = None) -> None:
        self.settings = settings
        self.engine = engine or (load_engine(settings.model_path) if settings.model_path else load_default_engine())
        self.db = Database(settings.database_url)
        self.bus = EventBus()
        self.lock = threading.RLock()
        self.started_at = utcnow()

    # ------------------------------------------------------------------ lifecycle
    def startup(self) -> None:
        self.db.create_all()
        if self.settings.reset_on_start:
            self.db.reset_demo()
        else:
            self._restore_engine()

    def _restore_engine(self) -> None:
        """Reload rider baselines and the shared-device map from the database."""
        with self.db.session() as db:
            for row in db.scalars(select(ProfileRow)):
                self.engine.load_state(row.profile)
            for rider_id, device in db.execute(
                    select(SessionRow.rider_id, SessionRow.context["device_id"].as_string()).distinct()):
                if device and device != "unknown":
                    self.engine.device_riders.setdefault(device, set()).add(rider_id)

    def reset(self) -> None:
        """Drop all data and start from a fresh model (used by the lab's reset button)."""
        with self.lock:
            settings = self.settings
            self.engine = (load_engine(settings.model_path) if settings.model_path else load_default_engine())
            self.db.reset_demo()

    def close(self) -> None:
        self.db.dispose()

    # ------------------------------------------------------------------ scoring
    def score_payload(self, data: dict[str, Any], *, source: str = "api",
                      ground_truth: dict[str, Any] | None = None, publish: bool = True) -> dict[str, Any]:
        """Validate, score and persist one session. Raises ValueError / DuplicateSession."""
        session = Session.from_dict(data)
        return self.score_session(session, archetype=data.get("archetype"), source=source,
                                  ground_truth=ground_truth, publish=publish)

    def score_session(self, session: Session, *, archetype: str | None = None, source: str = "api",
                      ground_truth: dict[str, Any] | None = None, publish: bool = True) -> dict[str, Any]:
        with self.db.session() as db:
            with self.lock:
                if db.get(SessionRow, session.session_id) is not None:
                    raise DuplicateSession(session.session_id)
                state = self.engine.get_state(session.rider_id)
                if state is None:
                    state = self.engine.register_rider(session.rider_id, archetype or "unknown")
                rider = db.get(RiderRow, session.rider_id)
                if rider is None:
                    rider = RiderRow(rider_id=session.rider_id, archetype=state.archetype,
                                     home_city=session.context.get("city"), created_at=utcnow())
                    db.add(rider)
                    db.flush()

                decision = self.engine.score_session(state, session)
                now = utcnow()
                db.add(SessionRow(
                    session_id=session.session_id, rider_id=session.rider_id, started_at=session.started_at.replace(tzinfo=None),
                    context=session.context, habit=session.habit, source=source,
                    gt_actor=(ground_truth or {}).get("actor"), gt_label=(ground_truth or {}).get("label"),
                    created_at=now))
                db.flush()
                row = DecisionRow(
                    session_id=session.session_id, rider_id=session.rider_id, decided_at=now,
                    level=decision.level, level_num=decision.level_index, action=decision.action,
                    status=decision.status, context_score=decision.context_score,
                    habit_score=decision.habit_score, evidence_score=decision.evidence_score,
                    threshold=decision.threshold, habit_deviation=decision.habit_deviation,
                    context_flags=decision.context_flags, reasons=decision.reasons,
                    model_version=decision.model_version)
                db.add(row)
                db.flush()

                if decision.level_index == 2 and not self._pending_stepup(db, rider.rider_id):
                    db.add(StepupRow(rider_id=rider.rider_id, session_id=session.session_id,
                                     issued_at=now, result="pending"))
                rider.status = state.status
                rider.sessions_seen = state.n_sessions
                rider.last_level = decision.level
                rider.last_evidence = decision.evidence_score
                rider.last_seen_at = session.started_at.replace(tzinfo=None)
                if (decision.level_index >= 1 or state.n_sessions <= 1
                        or state.n_sessions % self.settings.snapshot_every == 0):
                    self._save_profile(db, rider.rider_id)

                payload = decision_payload(row, session.started_at)
                payload["context"] = {k: session.context.get(k) for k in ("device_id", "city", "zone", "network_type")}
                payload["source"] = source
                payload["rider_name"] = rider_names(db, [session.rider_id]).get(session.rider_id)
                if ground_truth:
                    payload["ground_truth"] = ground_truth
                db.commit()
        if publish:
            self.bus.publish("decision", payload)
        return payload

    # ------------------------------------------------------------------ outcomes of the ladder
    def stepup_result(self, rider_id: str, passed: bool, *, method: str = "selfie",
                      session_id: str | None = None, actor: str = "system") -> dict[str, Any]:
        with self.lock, self.db.session() as db:
            state = self.engine.get_state(rider_id)
            if state is None:
                raise UnknownRider(rider_id)
            if state.status != STATUS_PENDING:
                raise InvalidState(f"no step-up is pending for {rider_id} (status: {state.status})")
            status = self.engine.report_stepup(rider_id, passed)
            now = utcnow()
            pending = self._pending_stepup(db, rider_id)
            if pending is None:
                pending = StepupRow(rider_id=rider_id, session_id=session_id, issued_at=now)
                db.add(pending)
            pending.method, pending.resolved_at = method, now
            pending.result = "passed" if passed else "failed"
            if passed:  # the rider confirmed it is them, so the open cases for this rider are settled
                db.execute(update(DecisionRow).where(
                    DecisionRow.rider_id == rider_id, DecisionRow.level_num >= 2,
                    DecisionRow.review_verdict.is_(None)).values(
                    review_verdict="rider_verified", reviewed_by="rider", reviewed_at=now))
            self._sync_rider(db, rider_id)
            self._save_profile(db, rider_id)
            db.add(AuditRow(rider_id=rider_id, actor=actor, action="stepup_" + pending.result,
                            details={"method": method, "status": status}, at=now))
            db.commit()
        result = {"rider_id": rider_id, "result": "passed" if passed else "failed", "status": status}
        self.bus.publish("stepup", result)
        return result

    def review_decision(self, decision_id: int, takeover_confirmed: bool, *, reviewer: str = "reviewer",
                        note: str | None = None) -> dict[str, Any]:
        with self.lock, self.db.session() as db:
            row = db.get(DecisionRow, decision_id)
            if row is None:
                raise UnknownDecision(str(decision_id))
            state = self.engine.get_state(row.rider_id)
            if state is None:
                raise UnknownRider(row.rider_id)
            if state.status not in ESCALATED_STATUSES:
                raise InvalidState(f"{row.rider_id} has nothing to review (status: {state.status})")
            status = self.engine.report_review(row.rider_id, takeover_confirmed)
            now = utcnow()
            verdict = "confirmed_takeover" if takeover_confirmed else "dismissed"
            closed = db.execute(update(DecisionRow).where(
                DecisionRow.rider_id == row.rider_id, DecisionRow.level_num >= 2,
                DecisionRow.review_verdict.is_(None)).values(
                review_verdict=verdict, reviewed_by=reviewer, reviewed_at=now)).rowcount
            for pending in db.scalars(select(StepupRow).where(StepupRow.rider_id == row.rider_id,
                                                              StepupRow.result == "pending")):
                pending.result, pending.resolved_at = "passed" if not takeover_confirmed else "failed", now
            self._sync_rider(db, row.rider_id)
            self._save_profile(db, row.rider_id)
            db.add(AuditRow(rider_id=row.rider_id, actor=f"reviewer:{reviewer}", action="review_" + verdict,
                            details={"decision_id": decision_id, "note": note, "closed": closed, "status": status}, at=now))
            db.commit()
        result = {"decision_id": decision_id, "rider_id": row.rider_id, "verdict": verdict,
                  "status": status, "decisions_closed": closed}
        self.bus.publish("review", result)
        return result

    # ------------------------------------------------------------------ queries
    def rider_detail(self, rider_id: str) -> dict[str, Any]:
        with self.db.session() as db:
            row = db.get(RiderRow, rider_id)
            if row is None:
                raise UnknownRider(rider_id)
            summary = self.engine.rider_summary(rider_id) or {}
            counts = dict(db.execute(select(DecisionRow.level, func.count()).where(
                DecisionRow.rider_id == rider_id).group_by(DecisionRow.level)).all())
            return {
                "rider_id": row.rider_id, "name": rider_names(db, [rider_id]).get(rider_id),
                "archetype": row.archetype, "home_city": row.home_city,
                "status": summary.get("status", row.status), "sessions_seen": row.sessions_seen,
                "last_level": row.last_level, "last_evidence": row.last_evidence,
                "last_seen_at": row.last_seen_at.isoformat() if row.last_seen_at else None,
                "evidence": summary.get("evidence", 0.0), "streak": summary.get("streak", 0),
                "failed_stepups": summary.get("failed_stepups", 0),
                "known_devices": summary.get("known_devices", 0),
                "known_cities": summary.get("known_cities", []),
                "baseline": summary.get("baseline", {}),
                "level_counts": {lvl: counts.get(lvl, 0) for lvl in LEVELS},
            }

    def list_riders(self, *, status: str | None = None, q: str | None = None, city: str | None = None,
                    limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
        with self.db.session() as db:
            stmt = select(RiderRow).outerjoin(UserRow, UserRow.rider_id == RiderRow.rider_id)
            if status:
                stmt = stmt.where(RiderRow.status == status)
            if city:
                stmt = stmt.where(RiderRow.home_city == city)
            order = [RiderRow.last_seen_at.desc().nullslast(), RiderRow.rider_id]
            if q and q.strip():
                stmt = stmt.where(rider_match(q))
                order.insert(0, case((func.lower(RiderRow.rider_id) == q.strip().lower(), 0), else_=1))
            rows = db.scalars(stmt.order_by(*order).limit(limit).offset(offset)).all()
            names = rider_names(db, [r.rider_id for r in rows])
            return [{"rider_id": r.rider_id, "name": names.get(r.rider_id), "archetype": r.archetype, "home_city": r.home_city,
                     "status": r.status, "sessions_seen": r.sessions_seen, "last_level": r.last_level,
                     "last_evidence": r.last_evidence,
                     "last_seen_at": r.last_seen_at.isoformat() if r.last_seen_at else None} for r in rows]

    def timeline(self, rider_id: str, limit: int = 200, *, since: str | None = None, until: str | None = None,
                 city: str | None = None, device: str | None = None) -> list[dict[str, Any]]:
        start, end = time_window(since, until)
        with self.db.session() as db:
            if db.get(RiderRow, rider_id) is None:
                raise UnknownRider(rider_id)
            stmt = select(SessionRow, DecisionRow).join(
                DecisionRow, DecisionRow.session_id == SessionRow.session_id).where(SessionRow.rider_id == rider_id)
            stmt = self._session_filters(stmt, start, end, city, None, device)
            rows = db.execute(stmt.order_by(SessionRow.started_at.desc()).limit(limit)).all()
            items = []
            for s, d in reversed(rows):
                items.append({
                    "session_id": s.session_id, "decision_id": d.decision_id, "started_at": s.started_at.isoformat(),
                    "city": s.context.get("city"), "zone": s.context.get("zone"), "device_id": s.context.get("device_id"),
                    "level": d.level, "action": d.action, "context_score": d.context_score,
                    "habit_score": d.habit_score, "habit_deviation": d.habit_deviation,
                    "evidence_score": d.evidence_score, "threshold": d.threshold,
                    "context_flags": d.context_flags or [], "review_verdict": d.review_verdict,
                    "actor": s.gt_actor, "label": s.gt_label})
            return items

    @staticmethod
    def _session_filters(stmt, start, end, city, zone, device):
        """Shared time, place and phone filters over the sessions table."""
        if start:
            stmt = stmt.where(SessionRow.started_at >= start)
        if end:
            stmt = stmt.where(SessionRow.started_at <= end)
        if city:
            stmt = stmt.where(SessionRow.context["city"].as_string() == city)
        if zone:
            stmt = stmt.where(SessionRow.context["zone"].as_string() == zone)
        if device:
            stmt = stmt.where(func.lower(SessionRow.context["device_id"].as_string()).like(_like(device), escape="\\"))
        return stmt

    def list_decisions(self, *, level: str | None = None, min_level: int | None = None,
                       rider_id: str | None = None, unreviewed: bool = False, limit: int = 50,
                       offset: int = 0, q: str | None = None, city: str | None = None, zone: str | None = None,
                       device: str | None = None, since: str | None = None, until: str | None = None,
                       case_status: str | None = None, reviewer: str | None = None,
                       session_id: str | None = None) -> list[dict[str, Any]]:
        start, end = time_window(since, until)
        with self.db.session() as db:
            stmt = select(DecisionRow, SessionRow).join(
                SessionRow, SessionRow.session_id == DecisionRow.session_id).order_by(DecisionRow.decision_id.desc())
            if q and q.strip():
                stmt = stmt.outerjoin(UserRow, UserRow.rider_id == DecisionRow.rider_id).where(
                    rider_match(q, DecisionRow.rider_id))
            if level:
                stmt = stmt.where(DecisionRow.level == level)
            if min_level is not None:
                stmt = stmt.where(DecisionRow.level_num >= min_level)
            if rider_id:
                stmt = stmt.where(DecisionRow.rider_id == rider_id)
            if session_id:
                stmt = stmt.where(DecisionRow.session_id == session_id)
            if unreviewed:
                stmt = stmt.where(DecisionRow.level_num >= 2, DecisionRow.review_verdict.is_(None))
            if case_status == "pending":
                stmt = stmt.where(DecisionRow.level_num >= 2, DecisionRow.review_verdict.is_(None))
            elif case_status == "completed":
                stmt = stmt.where(DecisionRow.level_num >= 2, DecisionRow.review_verdict.is_not(None))
            if reviewer:
                stmt = stmt.where(DecisionRow.reviewed_by == reviewer)
            stmt = self._session_filters(stmt, start, end, city, zone, device)
            rows = db.execute(stmt.limit(limit).offset(offset)).all()
            names = rider_names(db, [d.rider_id for d, _ in rows])
            out = []
            for d, session in rows:
                payload = decision_payload(d, session.started_at)
                payload["rider_name"] = names.get(d.rider_id)
                payload["context"] = {k: session.context.get(k) for k in ("device_id", "city", "zone", "network_type")}
                out.append(payload)
            return out

    def get_decision(self, decision_id: int) -> dict[str, Any]:
        with self.db.session() as db:
            row = db.execute(select(DecisionRow, SessionRow.started_at).join(
                SessionRow, SessionRow.session_id == DecisionRow.session_id).where(
                DecisionRow.decision_id == decision_id)).first()
            if row is None:
                raise UnknownDecision(str(decision_id))
            return self._decision_detail(db, row[0], row[1])

    def get_decision_by_session(self, session_id: str) -> dict[str, Any]:
        with self.db.session() as db:
            row = db.execute(select(DecisionRow, SessionRow.started_at).join(
                SessionRow, SessionRow.session_id == DecisionRow.session_id).where(
                DecisionRow.session_id == session_id)).first()
            if row is None:
                raise UnknownDecision(session_id)
            return self._decision_detail(db, row[0], row[1])

    def _decision_detail(self, db: DbSession, decision: DecisionRow, started_at: datetime) -> dict[str, Any]:
        payload = decision_payload(decision, started_at)
        session = db.get(SessionRow, decision.session_id)
        payload["session"] = {"context": session.context, "habit": session.habit}
        payload["rider_name"] = rider_names(db, [decision.rider_id]).get(decision.rider_id)
        rider = db.get(RiderRow, decision.rider_id)
        summary = self.engine.rider_summary(decision.rider_id) or {}
        payload["rider"] = {"rider_id": decision.rider_id, "home_city": rider.home_city if rider else None,
                            "status": summary.get("status", rider.status if rider else None),
                            "baseline": summary.get("baseline", {}), "known_cities": summary.get("known_cities", [])}
        payload["source"] = session.source
        return payload

    def filter_options(self) -> dict[str, Any]:
        """Values for the filter drop-downs, taken from what is actually stored."""
        with self.db.session() as db:
            city = SessionRow.context["city"].as_string()
            zone = SessionRow.context["zone"].as_string()
            cities = [c for (c,) in db.execute(select(city).distinct().order_by(city).limit(200)) if c]
            zones = [z for (z,) in db.execute(select(zone).distinct().order_by(zone).limit(300)) if z]
            actions = [a for (a,) in db.execute(select(AuditRow.action).distinct().order_by(AuditRow.action))]
            reviewers = [r for (r,) in db.execute(select(DecisionRow.reviewed_by).where(
                DecisionRow.reviewed_by.is_not(None), DecisionRow.reviewed_by != "rider").distinct().order_by(
                DecisionRow.reviewed_by))]
            return {"cities": cities, "zones": zones, "audit_actions": actions, "reviewers": reviewers}

    def audit_log(self, rider_id: str | None = None, limit: int = 100, *, offset: int = 0, q: str | None = None,
                  action: str | None = None, reviewer: str | None = None, since: str | None = None,
                  until: str | None = None) -> list[dict[str, Any]]:
        start, end = time_window(since, until)
        with self.db.session() as db:
            stmt = select(AuditRow).order_by(AuditRow.id.desc())
            if rider_id:
                stmt = stmt.where(AuditRow.rider_id == rider_id)
            if q and q.strip():
                like = _like(q.strip())
                stmt = stmt.outerjoin(UserRow, UserRow.rider_id == AuditRow.rider_id).where(or_(
                    func.lower(AuditRow.rider_id).like(like, escape="\\"),
                    func.lower(UserRow.name).like(like, escape="\\"),
                    func.lower(AuditRow.action).like(like, escape="\\"),
                    func.lower(AuditRow.actor).like(like, escape="\\")))
            if action:
                stmt = stmt.where(AuditRow.action == action)
            if reviewer:
                stmt = stmt.where(AuditRow.actor.in_((reviewer, f"reviewer:{reviewer}")))
            if start:
                stmt = stmt.where(AuditRow.at >= start)
            if end:
                stmt = stmt.where(AuditRow.at <= end)
            rows = db.scalars(stmt.limit(limit).offset(offset)).all()
            names = rider_names(db, [a.rider_id for a in rows if a.rider_id])
            return [{"id": a.id, "rider_id": a.rider_id, "rider_name": names.get(a.rider_id) if a.rider_id else None,
                     "actor": a.actor, "action": a.action, "details": a.details, "at": a.at.isoformat()} for a in rows]

    # ------------------------------------------------------------------ metrics
    def metrics_summary(self) -> dict[str, Any]:
        with self.db.session() as db:
            total = db.scalar(select(func.count()).select_from(DecisionRow)) or 0
            by_level = dict(db.execute(select(DecisionRow.level, func.count()).group_by(DecisionRow.level)).all())
            by_status = dict(db.execute(select(RiderRow.status, func.count()).group_by(RiderRow.status)).all())
            stepups = sum(by_level.get(lvl, 0) for lvl in LEVELS[2:])
            kpis: dict[str, Any] = {
                "sessions_scored": total, "riders": sum(by_status.values()),
                "level_counts": {lvl: by_level.get(lvl, 0) for lvl in LEVELS},
                "rider_status_counts": by_status,
                "stepup_rate": round(stepups / total, 5) if total else 0.0,
                "accounts_under_watch": sum(n for s, n in by_status.items() if s != "active"),
                "pending_reviews": db.scalar(select(func.count()).select_from(DecisionRow).where(
                    DecisionRow.level_num >= 2, DecisionRow.review_verdict.is_(None))) or 0,
                "open_cases": db.scalar(select(func.count(func.distinct(DecisionRow.rider_id))).where(
                    DecisionRow.level_num >= 2, DecisionRow.review_verdict.is_(None))) or 0,
                "open_requests": db.scalar(select(func.count()).select_from(ReviewRequestRow).where(
                    ReviewRequestRow.status.in_(("open", "in_review")))) or 0,
                "open_stepups": db.scalar(select(func.count()).select_from(StepupRow).where(
                    StepupRow.result == "pending")) or 0,
                "model_version": MODEL_VERSION,
                "subscribers": self.bus.subscriber_count,
            }
            kpis["simulation"] = self._simulation_kpis(db)
            return kpis

    @staticmethod
    def _simulation_kpis(db: DbSession) -> dict[str, Any]:
        """Accuracy against the simulator's ground truth (only sessions that carry it)."""
        owner = select(func.count()).select_from(DecisionRow).join(
            SessionRow, SessionRow.session_id == DecisionRow.session_id).where(SessionRow.gt_actor == "owner")
        honest = db.scalar(owner) or 0
        false_stepups = db.scalar(owner.where(DecisionRow.level_num >= 2)) or 0
        false_lockouts = db.scalar(owner.where(DecisionRow.level_num >= 3)) or 0
        rows = db.execute(
            select(SessionRow.rider_id, SessionRow.started_at, DecisionRow.level_num).join(
                DecisionRow, SessionRow.session_id == DecisionRow.session_id).where(
                SessionRow.gt_actor == "other").order_by(SessionRow.rider_id, SessionRow.started_at)).all()
        accounts: dict[str, list[int]] = {}
        for rider_id, _started, level in rows:
            accounts.setdefault(rider_id, []).append(level)
        latencies = [next(i for i, lv in enumerate(levels, 1) if lv >= 2) for levels in accounts.values()
                     if any(lv >= 2 for lv in levels)]
        return {
            "honest_sessions": honest, "false_stepup_rate": round(false_stepups / honest, 5) if honest else 0.0,
            "false_lockout_rate": round(false_lockouts / honest, 5) if honest else 0.0,
            "impostor_accounts": len(accounts), "impostor_accounts_flagged": len(latencies),
            "impostor_sessions": len(rows),
            "median_sessions_to_detect": sorted(latencies)[len(latencies) // 2] if latencies else None,
        }

    def compare(self) -> dict[str, Any]:
        path: Path = self.settings.compare_path
        if not path.exists():
            raise FileNotFoundError(str(path))
        data = json.loads(path.read_text())
        data["source"] = path.name
        return data

    # ------------------------------------------------------------------ internals
    @staticmethod
    def _pending_stepup(db: DbSession, rider_id: str) -> StepupRow | None:
        return db.scalars(select(StepupRow).where(
            StepupRow.rider_id == rider_id, StepupRow.result == "pending").order_by(StepupRow.id.desc())).first()

    def _save_profile(self, db: DbSession, rider_id: str) -> None:
        snapshot = self.engine.export_state(rider_id)
        row = db.get(ProfileRow, rider_id)
        if row is None:
            db.add(ProfileRow(rider_id=rider_id, profile=snapshot, updated_at=utcnow()))
        else:
            row.profile, row.updated_at = snapshot, utcnow()

    def _sync_rider(self, db: DbSession, rider_id: str) -> None:
        state = self.engine.get_state(rider_id)
        row = db.get(RiderRow, rider_id)
        if state is not None and row is not None:
            row.status = state.status
            row.last_evidence = state.evidence
