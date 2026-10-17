"""Threshold calibration on honest riders.

The step-up threshold ``h2`` is the smallest value for which, replaying riders who are
known to be honest through the real engine (each owner passes every step-up), at most
``alpha`` of their scored sessions trigger a step-up. Honest riders with life events are
part of the calibration set, so the budget covers them too.
"""
from __future__ import annotations

from dataclasses import replace
from typing import Sequence

from .config import Config
from .engine import TrustEngine
from .priors import Priors
from .schemas import Session

Riders = Sequence[tuple[str, Sequence[Session]]]  # (archetype, sessions oldest-first)


def stepup_rate(priors: Priors, cfg: Config, riders: Riders, h2: float) -> tuple[int, int]:
    """(step-ups, scored sessions) for honest riders at threshold ``h2``."""
    engine = TrustEngine(priors, replace(cfg, h2=h2))
    alerts = total = 0
    for n, (archetype, sessions) in enumerate(riders):
        rider_id = f"calib-{n}"
        state = engine.register_rider(rider_id, archetype)
        for i, s in enumerate(sessions):
            decision = engine.score_session(
                state, Session(s.session_id, rider_id, s.started_at, s.context, s.habit))
            if i >= cfg.min_sessions:
                total += 1
                alerts += decision.level_index >= 2
            if decision.level_index >= 3:
                engine.report_review(rider_id, False)
            elif decision.level_index == 2:
                engine.report_stepup(rider_id, True)
    return alerts, total


def choose_h2(priors: Priors, cfg: Config, riders: Riders, alpha: float,
              iterations: int = 12) -> float:
    """Smallest h2 whose (finite-sample corrected) honest step-up rate is <= alpha."""
    def ok(h: float) -> bool:
        alerts, total = stepup_rate(priors, cfg, riders, h)
        return (alerts + 1) / (total + 1) <= alpha

    lo, hi = 1.5 * cfg.null_level, 40.0
    if ok(lo):
        return lo
    if not ok(hi):
        return hi
    for _ in range(iterations):
        mid = (lo + hi) / 2.0
        if ok(mid):
            hi = mid
        else:
            lo = mid
    return hi
