"""Online statistics: exponentially weighted mean/variance with a cohort prior."""
from __future__ import annotations

import math
from typing import Any


def wrap_hours(delta: float) -> float:
    """Signed shortest distance on a 24h clock, in [-12, 12)."""
    return (delta + 12.0) % 24.0 - 12.0


class FeatureStats:
    """Mean/variance of one feature for one rider.

    Starts from the cohort prior and moves to the rider's own behaviour as sessions
    arrive. ``between_var`` is extra uncertainty about the rider's mean that decays
    as evidence accumulates.
    """

    __slots__ = ("mean", "var", "between_var", "n", "n0", "floor", "min_rate")

    def __init__(self, mean: float, var: float, between_var: float = 0.0, n0: float = 2.0,
                 floor: float = 1e-6, min_rate: float = 0.04, n: float = 0.0) -> None:
        self.mean = mean
        self.var = max(var, floor)
        self.between_var = between_var
        self.n = n
        self.n0 = n0
        self.floor = floor
        self.min_rate = min_rate

    def effective_var(self) -> float:
        decay = self.n0 / (self.n0 + self.n)
        return max(self.var + self.between_var * decay, self.floor)

    def z(self, x: float) -> float:
        return (x - self.mean) / math.sqrt(self.effective_var())

    def update(self, x: float, scale: float = 1.0, rate: float | None = None) -> None:
        """Fold in one observation. ``scale`` in [0, 1] damps learning (0 = ignore)."""
        if scale <= 0.0:
            return
        self.n += scale
        if rate is None:
            lr = min(1.0, max(1.0 / (self.n + self.n0), self.min_rate) * scale)
        else:
            lr = min(1.0, rate)
        delta = x - self.mean
        self.mean += lr * delta
        self.var = max((1.0 - lr) * (self.var + lr * delta * delta), self.floor)

    def clone_inflated(self, factor: float, n0: float) -> "FeatureStats":
        """Baseline for a newly seen key (city/device), seeded from this one."""
        return FeatureStats(self.mean, self.effective_var() * factor, 0.0, n0,
                            self.floor, self.min_rate)

    def clone(self) -> "FeatureStats":
        return FeatureStats(self.mean, self.var, self.between_var, self.n0,
                            self.floor, self.min_rate, self.n)

    def to_dict(self) -> dict[str, Any]:
        return {"mean": self.mean, "var": self.var, "between_var": self.between_var,
                "n": self.n, "n0": self.n0, "floor": self.floor, "min_rate": self.min_rate}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "FeatureStats":
        return cls(d["mean"], d["var"], d["between_var"], d["n0"], d["floor"], d["min_rate"], d["n"])


class HourStats:
    """Circular statistics for time of day (23:30 and 00:30 are one hour apart)."""

    __slots__ = ("cx", "sy", "var", "between_var", "n", "n0", "floor", "min_rate")

    def __init__(self, mu_hours: float, var: float, between_var: float = 0.0, n0: float = 2.0,
                 floor: float = 0.25, min_rate: float = 0.04, n: float = 0.0,
                 cx: float | None = None, sy: float | None = None) -> None:
        angle = mu_hours * 2.0 * math.pi / 24.0
        self.cx = math.cos(angle) if cx is None else cx
        self.sy = math.sin(angle) if sy is None else sy
        self.var = max(var, floor)
        self.between_var = between_var
        self.n = n
        self.n0 = n0
        self.floor = floor
        self.min_rate = min_rate

    @property
    def mu(self) -> float:
        return (math.atan2(self.sy, self.cx) * 24.0 / (2.0 * math.pi)) % 24.0

    def effective_var(self) -> float:
        decay = self.n0 / (self.n0 + self.n)
        return max(self.var + self.between_var * decay, self.floor)

    def deviation(self, hour: float) -> float:
        return wrap_hours(hour - self.mu)

    def z(self, hour: float) -> float:
        return self.deviation(hour) / math.sqrt(self.effective_var())

    def update(self, hour: float, scale: float = 1.0, rate: float | None = None) -> None:
        if scale <= 0.0:
            return
        self.n += scale
        if rate is None:
            lr = min(1.0, max(1.0 / (self.n + self.n0), self.min_rate) * scale)
        else:
            lr = min(1.0, rate)
        delta = self.deviation(hour)
        angle = hour * 2.0 * math.pi / 24.0
        self.cx += lr * (math.cos(angle) - self.cx)
        self.sy += lr * (math.sin(angle) - self.sy)
        self.var = max((1.0 - lr) * (self.var + lr * delta * delta), self.floor)

    def to_dict(self) -> dict[str, Any]:
        return {"cx": self.cx, "sy": self.sy, "var": self.var, "between_var": self.between_var,
                "n": self.n, "n0": self.n0, "floor": self.floor, "min_rate": self.min_rate}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "HourStats":
        return cls(0.0, d["var"], d["between_var"], d["n0"], d["floor"], d["min_rate"], d["n"],
                   cx=d["cx"], sy=d["sy"])
