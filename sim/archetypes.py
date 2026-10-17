"""Rider archetypes and the population statistics behind the synthetic data.

All habit values are generated in the engine's model space (log for skewed
features), then converted back to raw units.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from engine.features import HABIT_FEATURES, to_model_space


@dataclass(frozen=True)
class Archetype:
    name: str
    vehicle: str
    sessions_per_day: float
    hour_center: float
    hour_sd: float
    means: dict[str, float]  # raw units


ARCHETYPES: dict[str, Archetype] = {a.name: a for a in (
    Archetype("bike_day", "bike", 1.7, 13.0, 2.2, dict(
        accept_latency_ms=1700, tap_interval_ms=230, swipe_speed=0.55, avg_speed_kmh=17,
        route_deviation=0.12, idle_gap_min=9, cancel_rate=0.04, accept_rate=0.85, orders_per_hour=1.8)),
    Archetype("scooter_day", "scooter", 1.6, 15.0, 2.0, dict(
        accept_latency_ms=1500, tap_interval_ms=215, swipe_speed=0.60, avg_speed_kmh=24,
        route_deviation=0.15, idle_gap_min=7, cancel_rate=0.05, accept_rate=0.82, orders_per_hour=2.2)),
    Archetype("car_day", "car", 1.5, 12.0, 2.4, dict(
        accept_latency_ms=1900, tap_interval_ms=250, swipe_speed=0.50, avg_speed_kmh=31,
        route_deviation=0.10, idle_gap_min=11, cancel_rate=0.03, accept_rate=0.88, orders_per_hour=1.9)),
    Archetype("bike_evening", "bike", 1.1, 19.5, 1.8, dict(
        accept_latency_ms=1600, tap_interval_ms=225, swipe_speed=0.58, avg_speed_kmh=16,
        route_deviation=0.14, idle_gap_min=12, cancel_rate=0.06, accept_rate=0.78, orders_per_hour=1.6)),
    Archetype("scooter_night", "scooter", 1.5, 23.5, 1.9, dict(
        accept_latency_ms=1400, tap_interval_ms=205, swipe_speed=0.62, avg_speed_kmh=27,
        route_deviation=0.18, idle_gap_min=6, cancel_rate=0.07, accept_rate=0.80, orders_per_hour=2.4)),
    Archetype("car_night", "car", 1.4, 0.5, 2.0, dict(
        accept_latency_ms=1800, tap_interval_ms=240, swipe_speed=0.52, avg_speed_kmh=36,
        route_deviation=0.09, idle_gap_min=10, cancel_rate=0.04, accept_rate=0.90, orders_per_hour=2.1)),
)}

# Session-to-session noise inside one rider, in model space.
WITHIN_SD: dict[str, float] = dict(
    accept_latency_ms=0.22, tap_interval_ms=0.10, swipe_speed=0.05, avg_speed_kmh=2.2,
    route_deviation=0.035, idle_gap_min=0.30, cancel_rate=0.018, accept_rate=0.045,
    orders_per_hour=0.18)

# How far apart two different people of the same archetype are, in units of WITHIN_SD.
# Kept modest on purpose: real behavioural signals overlap heavily between people.
BETWEEN_RATIO: dict[str, float] = dict(
    accept_latency_ms=1.15, tap_interval_ms=1.3, swipe_speed=1.2, avg_speed_kmh=1.25,
    route_deviation=1.1, idle_gap_min=1.1, cancel_rate=1.0, accept_rate=1.0, orders_per_hour=1.0)

HOUR_CENTER_SPREAD = 1.5  # hours, spread of riders' usual login hour inside an archetype

# Raw-unit limits applied when converting back from model space.
RAW_LIMITS: dict[str, tuple[float, float]] = dict(
    accept_latency_ms=(150, 20000), tap_interval_ms=(60, 1500), swipe_speed=(0.05, 3.0),
    avg_speed_kmh=(3, 90), route_deviation=(0.005, 1.0), idle_gap_min=(0.5, 240),
    cancel_rate=(0.0, 0.6), accept_rate=(0.05, 1.0), orders_per_hour=(0.2, 12))

CITIES = ("Pune", "Mumbai", "Bengaluru", "Delhi", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad")
CARRIER_ASNS = ("AS55836", "AS45609", "AS38266", "AS9829")
BROADBAND_ASNS = ("AS24560", "AS17488", "AS55577", "AS18101")
OS_VERSIONS = ("Android 12", "Android 13", "Android 14", "Android 15", "iOS 16", "iOS 17", "iOS 18")


def model_center(arch: Archetype) -> dict[str, float]:
    """Archetype centre per habit feature in model space."""
    return {f: to_model_space(f, arch.means[f]) for f in HABIT_FEATURES}


def poisson(rng, lam: float) -> int:
    limit, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= limit:
            return k
        k += 1
