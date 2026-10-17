"""Tunable engine parameters. ``h2`` is overwritten by calibration."""
from __future__ import annotations

from dataclasses import asdict, dataclass, fields
from typing import Any

MODEL_VERSION = "tj-1.0"


@dataclass
class Config:
    # evidence accumulation: multivariate EWMA of per-feature z-scores (see evidence.py)
    ewma_lambda: float = 0.25     # weight of the newest session; window ~ 1/lambda sessions
    z_cap: float = 4.0            # |z| is clipped here so one spike cannot dominate
    k: float = 1.8                # a session counts as "above normal" when H exceeds this
    null_level: float = 1.2       # typical evidence of an honest rider; learning fades above it
    h2: float = 8.0               # step-up threshold (calibrated)
    h3_mult: float = 2.5          # hold-payouts threshold = h3_mult * h2
    h4_mult: float = 4.0          # suspend threshold = h4_mult * h2
    watch_frac: float = 0.5       # silent-monitor point, as a share of the way from null_level to h2
    context_boost: float = 0.25   # unfamiliar context lowers the thresholds by up to this

    # baselines
    min_sessions: int = 6         # learning period: scored but never escalated
    n0: float = 2.0               # prior pseudo-count for rider baselines
    min_rate: float = 0.04        # slowest learning rate (window ~ 1/min_rate sessions)
    key_n0: float = 1.5
    env_inflate: float = 3.0      # variance multiplier for a newly seen city
    zone_inflate: float = 2.0     # variance multiplier on environment habits in a newly seen zone
    device_inflate: float = 4.0   # variance multiplier for a newly seen device
    max_keys: int = 8             # remembered cities / devices per rider
    recent_len: int = 6           # sessions replayed into the baseline after a verified step-up
    absorb_rate: float = 0.25

    # how much each feature group contributes to the habit score
    w_persona: float = 1.5
    w_hour: float = 1.2
    w_environment: float = 1.0
    w_device: float = 1.0

    # how much each unfamiliar context element contributes to the novelty score
    c_device: float = 0.40
    c_city: float = 0.25
    c_zone: float = 0.10
    c_asn: float = 0.10
    c_network: float = 0.05
    c_os: float = 0.10
    c_shared_device: float = 0.30
    shared_device_riders: int = 3  # a device used by this many other riders is suspicious

    alpha: float = 0.005          # target share of honest sessions that see a step-up

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Config":
        known = {f.name for f in fields(cls)}
        return cls(**{k: v for k, v in data.items() if k in known})
