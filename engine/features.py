"""Feature definitions: which signals exist and how they are grouped.

Signals are split by who/what can legitimately change them:

* persona     - properties of the person (hard to hand over, never excused)
* environment - properties of where they work (excused while a new city is learned)
* device      - properties of the handset (excused while a new device is learned)
"""
from __future__ import annotations

import math

PERSONA_FEATURES = ("accept_latency_ms", "idle_gap_min", "cancel_rate", "accept_rate")
ENVIRONMENT_FEATURES = ("avg_speed_kmh", "route_deviation", "orders_per_hour")
DEVICE_FEATURES = ("tap_interval_ms", "swipe_speed")
HABIT_FEATURES = PERSONA_FEATURES + ENVIRONMENT_FEATURES + DEVICE_FEATURES

# Positive, right-skewed signals are modelled in log space.
LOG_FEATURES = frozenset({"accept_latency_ms", "tap_interval_ms", "idle_gap_min", "orders_per_hour"})

HOUR_FEATURE = "login_hour"
SCORED_FEATURES = PERSONA_FEATURES + (HOUR_FEATURE,) + ENVIRONMENT_FEATURES + DEVICE_FEATURES

CONTEXT_FIELDS = ("device_id", "os", "app_version", "ip_asn", "city", "zone", "network_type")

FEATURE_GROUP = {
    **{f: "persona" for f in PERSONA_FEATURES},
    HOUR_FEATURE: "persona",
    **{f: "environment" for f in ENVIRONMENT_FEATURES},
    **{f: "device" for f in DEVICE_FEATURES},
}


def to_model_space(feature: str, value: float) -> float:
    """Raw habit value -> the space the engine models it in."""
    if feature in LOG_FEATURES:
        return math.log(max(value, 1e-6))
    return value


def from_model_space(feature: str, value: float) -> float:
    if feature in LOG_FEATURES:
        return math.exp(value)
    return value


def transform_habit(habit: dict[str, float]) -> dict[str, float]:
    return {f: to_model_space(f, habit[f]) for f in HABIT_FEATURES}
