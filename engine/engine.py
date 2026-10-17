"""TrustEngine: scores each session against the rider's own pattern and decides what to do.

Per session:
  1. context novelty  - how unfamiliar are device / city / zone / network?
  2. habit deviation  - how far are persona, environment and device habits from baseline?
  3. evidence         - CUSUM over recent sessions, so slow handoffs still add up
  4. decision         - L0 allow .. L4 suspend, thresholds calibrated on honest sessions
  5. learning         - baselines absorb only sessions that look like the owner
"""
from __future__ import annotations

import math
from typing import Any, Iterable

from .config import MODEL_VERSION, Config
from .evidence import clip_z, feature_weights, mewma_statistic, update_mewma
from .explain import build_reasons
from .features import (DEVICE_FEATURES, ENVIRONMENT_FEATURES, HOUR_FEATURE, PERSONA_FEATURES,
                       transform_habit)
from .priors import Priors
from .profile import (ESCALATED_STATUSES, STATUS_ACTIVE, STATUS_HELD, STATUS_PENDING,
                      STATUS_SUSPENDED, STATUS_WATCH, Obs, RiderState)
from .schemas import ACTIONS, LEVELS, Decision, Session


class TrustEngine:
    def __init__(self, priors: Priors, config: Config | None = None) -> None:
        self.priors = priors
        self.cfg = config or Config()
        self.weights = feature_weights(self.cfg)
        self.states: dict[str, RiderState] = {}
        self.device_riders: dict[str, set[str]] = {}

    # ---- rider lifecycle -------------------------------------------------
    def register_rider(self, rider_id: str, archetype: str = "unknown",
                       enrollment: Iterable[Session] = ()) -> RiderState:
        """Create a rider. ``enrollment`` = sessions from the verified onboarding period."""
        state = RiderState(rider_id, archetype, self.priors.for_archetype(archetype), self.cfg)
        self.states[rider_id] = state
        for session in enrollment:
            obs = self._observe(session)
            state.learn(obs, self.cfg)
            state.learn_context(obs.ctx)
            state.n_sessions += 1
            state.last_seen = session.started_at.isoformat()
            self._track_device(rider_id, session)
        return state

    def get_state(self, rider_id: str) -> RiderState | None:
        return self.states.get(rider_id)

    def load_state(self, data: dict[str, Any]) -> RiderState:
        """Restore a persisted rider (e.g. from Redis or the DB)."""
        state = RiderState.from_dict(data)
        self.states[state.rider_id] = state
        return state

    def export_state(self, rider_id: str) -> dict[str, Any]:
        return self.states[rider_id].to_dict()

    def rider_summary(self, rider_id: str) -> dict[str, Any] | None:
        state = self.states.get(rider_id)
        if state is None:
            return None
        return {
            "rider_id": state.rider_id, "archetype": state.archetype, "status": state.status,
            "sessions_seen": state.n_sessions, "evidence": round(state.evidence, 3),
            "streak": state.streak, "failed_stepups": state.failed_stepups,
            "known_devices": len(state.known["devices"]), "known_cities": sorted(state.known["cities"]),
            "baseline": state.baseline_summary(), "last_seen": state.last_seen,
        }

    # ---- scoring ----------------------------------------------------------
    def score(self, session: Session) -> Decision:
        """Score a session for a rider, registering unknown riders automatically."""
        state = self.states.get(session.rider_id) or self.register_rider(session.rider_id)
        return self.score_session(state, session)

    def score_session(self, state: RiderState, session: Session) -> Decision:
        """Score one session, update ``state`` in place and return the decision."""
        cfg = self.cfg
        obs = self._observe(session)
        learning = state.n_sessions < cfg.min_sessions

        novelty, novel_parts = self._context_novelty(state, session, learning)
        habit, contribs = self._habit_deviation(state, obs, new_zone="new_zone" in novel_parts)

        if learning:
            state.reset_evidence()
            state.streak = 0
        else:
            update_mewma(state.mew, [clip_z(z, cfg.z_cap) for _, _, z, _ in contribs], cfg.ewma_lambda)
            state.evidence = mewma_statistic(state.mew, self.weights, cfg.ewma_lambda)
            state.streak = state.streak + 1 if habit > cfg.k else 0

        threshold = cfg.h2 * (1.0 - cfg.context_boost * novelty)
        level = 0 if learning else self._level(state, threshold)
        self._update_status(state, level)
        self._learn_from(state, obs, level, threshold, learning)

        state.n_sessions += 1
        state.last_seen = session.started_at.isoformat()
        self._track_device(state.rider_id, session)

        habit_score = 1.0 - math.exp(-max(0.0, habit - 1.0) / 2.5)
        action = ACTIONS[level]
        if level == 0 and novelty >= 0.3 and habit <= cfg.k and not learning:
            action = "allow_learn_context"
        reasons = build_reasons(
            level=level, learning=learning, n_sessions=state.n_sessions - 1,
            min_sessions=cfg.min_sessions, contribs=[(f, g, z) for f, g, z, _ in contribs],
            novel_parts=novel_parts, habit=habit, k=cfg.k, streak=state.streak,
            evidence=state.evidence, threshold=threshold, status=state.status)
        return Decision(
            session_id=session.session_id, rider_id=session.rider_id, level=LEVELS[level],
            action=action, status=state.status, context_score=novelty, habit_score=habit_score,
            evidence_score=state.evidence, threshold=threshold, habit_deviation=habit,
            context_flags=novel_parts, reasons=reasons,
            model_version=MODEL_VERSION)

    # ---- outcomes of the escalation ladder ---------------------------------
    def report_stepup(self, rider_id: str, passed: bool) -> str:
        """Outcome of the selfie / liveness check. Returns the new rider status."""
        state = self._require(rider_id)
        if passed:
            state.absorb_verified(self.cfg)
        else:
            state.failed_stepups += 1
            state.status = STATUS_HELD if state.failed_stepups == 1 else STATUS_SUSPENDED
        return state.status

    def report_review(self, rider_id: str, takeover_confirmed: bool) -> str:
        """Verdict from a human reviewer. Returns the new rider status."""
        state = self._require(rider_id)
        if takeover_confirmed:
            state.status = STATUS_SUSPENDED
        else:
            state.absorb_verified(self.cfg)
        return state.status

    # ---- internals ----------------------------------------------------------
    def _require(self, rider_id: str) -> RiderState:
        state = self.states.get(rider_id)
        if state is None:
            raise KeyError(f"unknown rider: {rider_id}")
        return state

    @staticmethod
    def _observe(session: Session) -> Obs:
        return Obs(transform_habit(session.habit), session.local_hour, dict(session.context))

    def _track_device(self, rider_id: str, session: Session) -> None:
        device = session.context.get("device_id", "unknown")
        if device != "unknown":
            self.device_riders.setdefault(device, set()).add(rider_id)

    def _context_novelty(self, state: RiderState, session: Session,
                         learning: bool) -> tuple[float, list[str]]:
        if learning:
            return 0.0, []
        cfg, ctx, known = self.cfg, session.context, state.known
        checks = (
            ("new_device", "devices", "device_id", cfg.c_device),
            ("new_city", "cities", "city", cfg.c_city),
            ("new_zone", "zones", "zone", cfg.c_zone),
            ("new_network_provider", "asns", "ip_asn", cfg.c_asn),
            ("new_network_type", "networks", "network_type", cfg.c_network),
            ("new_os", "oses", "os", cfg.c_os),
        )
        parts: list[str] = []
        score = 0.0
        for name, known_key, field_name, weight in checks:
            value = ctx.get(field_name, "unknown")
            if value != "unknown" and value not in known[known_key]:
                parts.append(name)
                score += weight
        others = self.device_riders.get(ctx.get("device_id", "unknown"), set()) - {state.rider_id}
        if len(others) >= cfg.shared_device_riders:
            parts.append("shared_device")
            score += cfg.c_shared_device
        return min(1.0, score), parts

    def _habit_deviation(self, state: RiderState, obs: Obs,
                         new_zone: bool) -> tuple[float, list[tuple[str, str, float, float]]]:
        """Weighted mean of squared z-scores. Returns (H, [(feature, group, z, weight)])."""
        cfg = self.cfg
        env_scale = cfg.zone_inflate ** -0.5 if new_zone else 1.0  # roads differ in a new zone
        env = state.env_stats(obs.ctx.get("city", "unknown"), cfg)
        dev = state.device_stats(obs.ctx.get("device_id", "unknown"), cfg)
        contribs: list[tuple[str, str, float, float]] = []
        for f in PERSONA_FEATURES:
            contribs.append((f, "persona", state.persona[f].z(obs.t[f]), cfg.w_persona))
        contribs.append((HOUR_FEATURE, "persona", state.hour.z(obs.hour), cfg.w_hour))
        for f in ENVIRONMENT_FEATURES:
            contribs.append((f, "environment", env_scale * env[f].z(obs.t[f]), cfg.w_environment))
        for f in DEVICE_FEATURES:
            contribs.append((f, "device", dev[f].z(obs.t[f]), cfg.w_device))

        cap = cfg.z_cap
        total = sum(w * min(z * z, cap * cap) for _, _, z, w in contribs)
        weight = sum(w for _, _, _, w in contribs)
        return total / weight, contribs

    def _level(self, state: RiderState, threshold: float) -> int:
        cfg = self.cfg
        if state.status == STATUS_SUSPENDED:
            return 4
        if state.status == STATUS_HELD:
            return 3
        e = state.evidence
        if e >= cfg.h4_mult * threshold:
            return 4
        if e >= cfg.h3_mult * threshold:
            return 3
        if e >= threshold or state.status == STATUS_PENDING:
            return 2
        if e >= cfg.null_level + cfg.watch_frac * (threshold - cfg.null_level):
            return 1
        return 0

    @staticmethod
    def _update_status(state: RiderState, level: int) -> None:
        if level >= 4:
            state.status = STATUS_SUSPENDED
        elif level == 3:
            state.status = STATUS_HELD
        elif level == 2:
            state.status = STATUS_PENDING
        elif level == 1:
            state.status = STATUS_WATCH
        elif state.status == STATUS_WATCH:
            state.status = STATUS_ACTIVE

    def _learn_from(self, state: RiderState, obs: Obs, level: int, threshold: float,
                    learning: bool) -> None:
        """Only sessions that look like the owner update the baseline (anti-poisoning)."""
        cfg = self.cfg
        state.remember(obs, cfg)
        if learning:
            scale = 1.0
        elif level >= 1 or state.status in ESCALATED_STATUSES:
            scale = 0.0
        else:
            span = max(threshold - cfg.null_level, 1e-6)
            scale = min(1.0, max(0.0, (threshold - state.evidence) / span))
        state.learn(obs, cfg, scale=scale)
        if learning or level == 0:
            state.learn_context(obs.ctx)
