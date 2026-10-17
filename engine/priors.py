"""Cohort priors: what a typical rider of each archetype looks like.

Fitted once from historical (assumed honest) sessions with robust statistics, so a few
bad actors in the history do not distort them. New riders start from these priors and
move to their own baseline as sessions arrive (cold start).
"""
from __future__ import annotations

import math
import statistics
from dataclasses import dataclass, field
from typing import Any, Iterable

from .features import HABIT_FEATURES, HOUR_FEATURE, SCORED_FEATURES, to_model_space
from .schemas import Session
from .stats import wrap_hours

DEFAULT_COHORT = "default"
MIN_RIDERS_PER_COHORT = 8
MIN_SESSIONS_PER_RIDER = 6


@dataclass
class FeaturePrior:
    mean: float          # cohort centre (hours for login_hour)
    within_var: float    # typical session-to-session variance inside one rider
    between_var: float   # spread of rider means across the cohort

    def to_dict(self) -> dict[str, float]:
        return {"mean": self.mean, "within_var": self.within_var, "between_var": self.between_var}

    @classmethod
    def from_dict(cls, d: dict[str, float]) -> "FeaturePrior":
        return cls(d["mean"], d["within_var"], d["between_var"])


@dataclass
class Priors:
    cohorts: dict[str, dict[str, FeaturePrior]] = field(default_factory=dict)

    def for_archetype(self, archetype: str) -> dict[str, FeaturePrior]:
        if archetype in self.cohorts:
            return self.cohorts[archetype]
        if DEFAULT_COHORT in self.cohorts:
            return self.cohorts[DEFAULT_COHORT]
        raise ValueError("priors are empty; call fit_priors first")

    def to_dict(self) -> dict[str, Any]:
        return {name: {f: p.to_dict() for f, p in feats.items()} for name, feats in self.cohorts.items()}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Priors":
        return cls({name: {f: FeaturePrior.from_dict(p) for f, p in feats.items()}
                    for name, feats in data.items()})


def _mad_sd(values: list[float]) -> float:
    med = statistics.median(values)
    return 1.4826 * statistics.median([abs(v - med) for v in values])


def _trimmed_mean(values: list[float], trim: float = 0.1) -> float:
    ordered = sorted(values)
    cut = int(len(ordered) * trim)
    kept = ordered[cut:len(ordered) - cut] or ordered
    return sum(kept) / len(kept)


def _circular_mean(hours: list[float]) -> float:
    cx = sum(math.cos(h * 2 * math.pi / 24) for h in hours)
    sy = sum(math.sin(h * 2 * math.pi / 24) for h in hours)
    return (math.atan2(sy, cx) * 24 / (2 * math.pi)) % 24


def _rider_series(sessions: list[Session]) -> dict[str, list[float]]:
    series = {f: [to_model_space(f, s.habit[f]) for s in sessions] for f in HABIT_FEATURES}
    series[HOUR_FEATURE] = [s.local_hour for s in sessions]
    return series


def _fit_cohort(rider_series: list[dict[str, list[float]]]) -> dict[str, FeaturePrior]:
    cohort: dict[str, FeaturePrior] = {}
    for feature in SCORED_FEATURES:
        means: list[float] = []
        variances: list[float] = []
        for series in rider_series:
            values = series[feature]
            if feature == HOUR_FEATURE:
                mu = _circular_mean(values)
                means.append(mu)
                devs = [wrap_hours(v - mu) for v in values]
                variances.append(sum(d * d for d in devs) / max(1, len(devs) - 1))
            else:
                means.append(statistics.fmean(values))
                variances.append(statistics.variance(values))
        within_var = _trimmed_mean(variances)
        if feature == HOUR_FEATURE:
            centre = _circular_mean(means)
            between_sd = _mad_sd([wrap_hours(m - centre) for m in means])
        else:
            centre = statistics.median(means)
            between_sd = _mad_sd(means)
        cohort[feature] = FeaturePrior(centre, max(within_var, 1e-9), between_sd ** 2)
    return cohort


def fit_priors(histories: Iterable[tuple[str, list[Session]]]) -> Priors:
    """Fit per-archetype priors from ``(archetype, sessions)`` pairs (oldest first)."""
    by_archetype: dict[str, list[dict[str, list[float]]]] = {}
    everyone: list[dict[str, list[float]]] = []
    for archetype, sessions in histories:
        if len(sessions) < MIN_SESSIONS_PER_RIDER:
            continue
        series = _rider_series(sessions)
        by_archetype.setdefault(archetype, []).append(series)
        everyone.append(series)
    if len(everyone) < 2:
        raise ValueError("need at least two riders with enough history to fit priors")

    priors = Priors({DEFAULT_COHORT: _fit_cohort(everyone)})
    for archetype, group in by_archetype.items():
        if len(group) >= MIN_RIDERS_PER_COHORT:
            priors.cohorts[archetype] = _fit_cohort(group)
    return priors
