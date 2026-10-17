"""Comparison systems. All expose the same interface as the Trust Juggler adapter."""
from __future__ import annotations

from dataclasses import replace
from typing import Protocol, Sequence

from engine import Config, Priors, TrustEngine
from engine.features import HABIT_FEATURES, HOUR_FEATURE, to_model_space
from engine.stats import FeatureStats, HourStats

from .records import SessionRecord


class System(Protocol):
    name: str

    def start_rider(self, rider_id: str, archetype: str) -> None: ...
    def score(self, record: SessionRecord) -> int: ...
    def stepup(self, rider_id: str, passed: bool) -> None: ...
    def review(self, rider_id: str, takeover: bool) -> None: ...


class TrustJuggler:
    name = "trust_juggler"

    def __init__(self, priors: Priors, cfg: Config) -> None:
        self.engine = TrustEngine(priors, cfg)

    def start_rider(self, rider_id: str, archetype: str) -> None:
        self.engine.register_rider(rider_id, archetype)

    def score(self, record: SessionRecord) -> int:
        return self.engine.score(record.to_engine_session()).level_index

    def stepup(self, rider_id: str, passed: bool) -> None:
        self.engine.report_stepup(rider_id, passed)

    def review(self, rider_id: str, takeover: bool) -> None:
        self.engine.report_review(rider_id, takeover)


class OpenGate:
    """Trust the one-time onboarding check forever."""

    name = "open_gate"

    def start_rider(self, rider_id: str, archetype: str) -> None:
        pass

    def score(self, record: SessionRecord) -> int:
        return 0

    def stepup(self, rider_id: str, passed: bool) -> None:
        pass

    def review(self, rider_id: str, takeover: bool) -> None:
        pass


class StrictGate:
    """Re-verify whenever the device, city, zone or network provider is one it has not verified."""

    name = "strict_gate"
    ENROLL_SESSIONS = 10
    WATCHED = ("device_id", "city", "zone", "ip_asn")

    def __init__(self) -> None:
        self.known: dict[str, set[tuple[str, str]]] = {}
        self.count: dict[str, int] = {}
        self.last: dict[str, SessionRecord] = {}

    def start_rider(self, rider_id: str, archetype: str) -> None:
        self.known[rider_id] = set()
        self.count[rider_id] = 0

    def _items(self, record: SessionRecord) -> set[tuple[str, str]]:
        return {(f, record.context[f]) for f in self.WATCHED}

    def score(self, record: SessionRecord) -> int:
        rid = record.rider_id
        self.count[rid] += 1
        self.last[rid] = record
        items = self._items(record)
        if self.count[rid] <= self.ENROLL_SESSIONS:
            self.known[rid] |= items
            return 0
        return 2 if items - self.known[rid] else 0

    def stepup(self, rider_id: str, passed: bool) -> None:
        if passed:
            self.known[rider_id] |= self._items(self.last[rider_id])

    def review(self, rider_id: str, takeover: bool) -> None:
        if not takeover:
            self.known[rider_id] |= self._items(self.last[rider_id])


class NaiveAnomaly:
    """One anomaly score over every signal, no context/habit split, no evidence accumulation."""

    name = "naive_anomaly"

    def __init__(self, priors: Priors, threshold: float, min_sessions: int = 6) -> None:
        self.priors = priors
        self.threshold = threshold
        self.min_sessions = min_sessions
        self.stats: dict[str, tuple[dict[str, FeatureStats], HourStats]] = {}
        self.n: dict[str, int] = {}
        self.last: dict[str, tuple[dict[str, float], float]] = {}

    def start_rider(self, rider_id: str, archetype: str) -> None:
        cohort = self.priors.for_archetype(archetype)
        feats = {f: FeatureStats(cohort[f].mean, cohort[f].within_var, cohort[f].between_var, 2.0,
                                 floor=0.25 * cohort[f].within_var) for f in HABIT_FEATURES}
        hp = cohort[HOUR_FEATURE]
        self.stats[rider_id] = (feats, HourStats(hp.mean, hp.within_var, hp.between_var, 2.0,
                                                 floor=0.25 * hp.within_var))
        self.n[rider_id] = 0

    def anomaly(self, record: SessionRecord) -> float:
        feats, hour = self.stats[record.rider_id]
        zs = [feats[f].z(to_model_space(f, record.habit[f])) for f in HABIT_FEATURES]
        zs.append(hour.z(record.started_at.hour + record.started_at.minute / 60.0))
        return sum(min(z * z, 16.0) for z in zs) / len(zs)

    def _learn(self, rider_id: str, rate: float | None) -> None:
        values, hour_value = self.last[rider_id]
        feats, hour = self.stats[rider_id]
        for f, v in values.items():
            feats[f].update(v, 1.0, rate)
        hour.update(hour_value, 1.0, rate)

    def score(self, record: SessionRecord) -> int:
        rid = record.rider_id
        score = self.anomaly(record)
        self.last[rid] = ({f: to_model_space(f, record.habit[f]) for f in HABIT_FEATURES},
                          record.started_at.hour + record.started_at.minute / 60.0)
        learning = self.n[rid] < self.min_sessions
        self.n[rid] += 1
        flagged = (not learning) and score >= self.threshold
        if not flagged:
            self._learn(rid, None)
        return 2 if flagged else 0

    def stepup(self, rider_id: str, passed: bool) -> None:
        if passed:
            self._learn(rider_id, 0.25)

    def review(self, rider_id: str, takeover: bool) -> None:
        if not takeover:
            self._learn(rider_id, 0.25)


def calibrate_naive(priors: Priors, riders: Sequence[tuple[str, Sequence[SessionRecord]]],
                    alpha: float, min_sessions: int = 6) -> float:
    """Single-session threshold at the honest (1 - alpha) quantile (same false-alert budget as ours)."""
    scores: list[float] = []
    for n, (archetype, records) in enumerate(riders):
        system = NaiveAnomaly(priors, float("inf"), min_sessions)
        rid = f"naive-{n}"
        system.start_rider(rid, archetype)
        for i, rec in enumerate(records):
            rec = replace(rec, rider_id=rid)
            s = system.anomaly(rec)
            system.score(rec)
            if i >= min_sessions:
                scores.append(s)
    scores.sort()
    index = min(len(scores) - 1, int((1.0 - alpha) * (len(scores) + 1)))
    return scores[index]
