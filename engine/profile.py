"""Per-rider state: behavioural baselines, known contexts and escalation status."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .config import Config
from .features import (DEVICE_FEATURES, ENVIRONMENT_FEATURES, PERSONA_FEATURES, HOUR_FEATURE,
                       SCORED_FEATURES, from_model_space)
from .priors import FeaturePrior
from .stats import FeatureStats, HourStats

KNOWN_FIELDS = {"devices": "device_id", "cities": "city", "zones": "zone",
                "asns": "ip_asn", "networks": "network_type", "oses": "os"}

STATUS_ACTIVE = "active"
STATUS_WATCH = "watch"
STATUS_PENDING = "pending_stepup"
STATUS_HELD = "held"
STATUS_SUSPENDED = "suspended"
ESCALATED_STATUSES = (STATUS_PENDING, STATUS_HELD, STATUS_SUSPENDED)


@dataclass
class Obs:
    """One session in model space, kept so it can be replayed after a verified step-up."""

    t: dict[str, float]
    hour: float
    ctx: dict[str, str]

    def to_dict(self) -> dict[str, Any]:
        return {"t": self.t, "hour": self.hour, "ctx": self.ctx}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Obs":
        return cls(d["t"], d["hour"], d["ctx"])


def _stats_from_prior(prior: FeaturePrior, cfg: Config) -> FeatureStats:
    return FeatureStats(prior.mean, prior.within_var, prior.between_var, cfg.n0,
                        floor=0.25 * prior.within_var, min_rate=cfg.min_rate)


class RiderState:
    def __init__(self, rider_id: str, archetype: str, cohort: dict[str, FeaturePrior], cfg: Config) -> None:
        self.rider_id = rider_id
        self.archetype = archetype
        self.persona = {f: _stats_from_prior(cohort[f], cfg) for f in PERSONA_FEATURES}
        hp = cohort[HOUR_FEATURE]
        self.hour = HourStats(hp.mean, hp.within_var, hp.between_var, cfg.n0,
                              floor=0.25 * hp.within_var, min_rate=cfg.min_rate)
        self.env_template = {f: _stats_from_prior(cohort[f], cfg) for f in ENVIRONMENT_FEATURES}
        self.dev_template = {f: _stats_from_prior(cohort[f], cfg) for f in DEVICE_FEATURES}
        self.env_keys: dict[str, dict[str, FeatureStats]] = {}   # keyed by city
        self.dev_keys: dict[str, dict[str, FeatureStats]] = {}   # keyed by device id
        self.known: dict[str, set[str]] = {name: set() for name in KNOWN_FIELDS}
        self.n_sessions = 0
        self.evidence = 0.0
        self.mew = [0.0] * len(SCORED_FEATURES)
        self.streak = 0
        self.status = STATUS_ACTIVE
        self.failed_stepups = 0
        self.recent: list[Obs] = []
        self.last_seen: str | None = None

    # ---- keyed baselines ------------------------------------------------
    @staticmethod
    def _lookup(store: dict[str, dict[str, FeatureStats]], template: dict[str, FeatureStats],
                key: str, inflate: float, cfg: Config, create: bool) -> dict[str, FeatureStats]:
        found = store.get(key)
        if found is not None:
            if create:
                store[key] = store.pop(key)  # most recently used goes last
            return found
        if next(iter(template.values())).n < 3:
            fresh = {f: s.clone() for f, s in template.items()}
        else:
            fresh = {f: s.clone_inflated(inflate, cfg.key_n0) for f, s in template.items()}
        if create:
            store[key] = fresh
            while len(store) > cfg.max_keys:
                store.pop(next(iter(store)))
        return fresh

    def env_stats(self, city: str, cfg: Config, create: bool = False) -> dict[str, FeatureStats]:
        return self._lookup(self.env_keys, self.env_template, city, cfg.env_inflate, cfg, create)

    def device_stats(self, device_id: str, cfg: Config, create: bool = False) -> dict[str, FeatureStats]:
        return self._lookup(self.dev_keys, self.dev_template, device_id, cfg.device_inflate, cfg, create)

    # ---- learning -------------------------------------------------------
    def learn(self, obs: Obs, cfg: Config, scale: float = 1.0, rate: float | None = None) -> None:
        env = self.env_stats(obs.ctx.get("city", "unknown"), cfg, create=True)
        dev = self.device_stats(obs.ctx.get("device_id", "unknown"), cfg, create=True)
        for f in PERSONA_FEATURES:
            self.persona[f].update(obs.t[f], scale, rate)
        self.hour.update(obs.hour, scale, rate)
        for f in ENVIRONMENT_FEATURES:
            self.env_template[f].update(obs.t[f], scale, rate)
            env[f].update(obs.t[f], scale, rate)
        for f in DEVICE_FEATURES:
            self.dev_template[f].update(obs.t[f], scale, rate)
            dev[f].update(obs.t[f], scale, rate)

    def learn_context(self, ctx: dict[str, str]) -> None:
        for name, field_name in KNOWN_FIELDS.items():
            value = ctx.get(field_name, "unknown")
            if value != "unknown":
                self.known[name].add(value)

    def remember(self, obs: Obs, cfg: Config) -> None:
        self.recent.append(obs)
        if len(self.recent) > cfg.recent_len:
            del self.recent[0]

    def absorb_verified(self, cfg: Config) -> None:
        """A step-up passed: the recent sessions were the real owner, so learn them fast."""
        for obs in self.recent:
            self.learn(obs, cfg, scale=1.0, rate=cfg.absorb_rate)
            self.learn_context(obs.ctx)
        self.recent.clear()
        self.reset_evidence()
        self.streak = 0
        self.failed_stepups = 0
        self.status = STATUS_ACTIVE

    def reset_evidence(self) -> None:
        self.evidence = 0.0
        self.mew = [0.0] * len(SCORED_FEATURES)

    # ---- views / persistence -------------------------------------------
    def baseline_summary(self) -> dict[str, float]:
        """Typical value of each habit feature in raw units (for dashboards)."""
        out = {f: from_model_space(f, s.mean) for f, s in self.persona.items()}
        out[HOUR_FEATURE] = self.hour.mu
        for f, s in self.env_template.items():
            out[f] = from_model_space(f, s.mean)
        for f, s in self.dev_template.items():
            out[f] = from_model_space(f, s.mean)
        return {k: round(v, 3) for k, v in out.items()}

    def to_dict(self) -> dict[str, Any]:
        def pack(group: dict[str, FeatureStats]) -> dict[str, Any]:
            return {f: s.to_dict() for f, s in group.items()}

        return {
            "rider_id": self.rider_id, "archetype": self.archetype,
            "persona": pack(self.persona), "hour": self.hour.to_dict(),
            "env_template": pack(self.env_template), "dev_template": pack(self.dev_template),
            "env_keys": {k: pack(v) for k, v in self.env_keys.items()},
            "dev_keys": {k: pack(v) for k, v in self.dev_keys.items()},
            "known": {k: sorted(v) for k, v in self.known.items()},
            "n_sessions": self.n_sessions, "evidence": self.evidence, "mew": self.mew, "streak": self.streak,
            "status": self.status, "failed_stepups": self.failed_stepups,
            "recent": [o.to_dict() for o in self.recent], "last_seen": self.last_seen,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "RiderState":
        def unpack(group: dict[str, Any]) -> dict[str, FeatureStats]:
            return {f: FeatureStats.from_dict(s) for f, s in group.items()}

        state = cls.__new__(cls)
        state.rider_id = d["rider_id"]
        state.archetype = d["archetype"]
        state.persona = unpack(d["persona"])
        state.hour = HourStats.from_dict(d["hour"])
        state.env_template = unpack(d["env_template"])
        state.dev_template = unpack(d["dev_template"])
        state.env_keys = {k: unpack(v) for k, v in d["env_keys"].items()}
        state.dev_keys = {k: unpack(v) for k, v in d["dev_keys"].items()}
        state.known = {k: set(v) for k, v in d["known"].items()}
        state.n_sessions = d["n_sessions"]
        state.evidence = d["evidence"]
        state.mew = list(d["mew"])
        state.streak = d["streak"]
        state.status = d["status"]
        state.failed_stepups = d["failed_stepups"]
        state.recent = [Obs.from_dict(o) for o in d["recent"]]
        state.last_seen = d["last_seen"]
        return state
