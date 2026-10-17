"""Scenarios: honest life events and takeover attacks, applied to a rider's sessions.

Shifts are expressed in units of the rider's own session-to-session spread, so they
mean the same thing for every rider.
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from typing import TYPE_CHECKING

from .archetypes import BROADBAND_ASNS, CARRIER_ASNS, CITIES, OS_VERSIONS

if TYPE_CHECKING:
    from .rider import RiderSim


@dataclass
class Draft:
    """Everything about one upcoming session that scenarios are allowed to change."""

    sim: "RiderSim"
    day: int
    device_id: str
    os: str
    app_version: str
    city: str
    zones: list[str]
    carrier: str
    broadband: str
    mean: dict[str, float]
    hour_center: float
    hour_sd: float
    actor: str = "owner"
    event: str = ""
    event_day: int = -1
    attack: str = ""
    attack_day: int = -1

    def shift(self, feature: str, sigmas: float) -> None:
        self.mean[feature] += sigmas * self.sim.within_sd[feature]


def _signed(rng: random.Random, lo: float, hi: float) -> float:
    return rng.choice((-1.0, 1.0)) * rng.uniform(lo, hi)


def _new_device(rng: random.Random) -> str:
    return f"d_{rng.getrandbits(32):08x}"


def _wrap_day_hours(x: float) -> float:
    return (x + 12.0) % 24.0 - 12.0


class Effect:
    kind = "life_event"
    name = ""
    title = ""
    description = ""

    def __init__(self, sim: "RiderSim", start_day: int, rng: random.Random) -> None:
        self.sim = sim
        self.start_day = start_day
        self.label_day = start_day
        self.rng = rng
        self.applied = 0  # sessions this effect has touched

    def active(self, day: int) -> bool:
        return day >= self.start_day

    def blackout(self, day: int) -> bool:
        return False

    def apply(self, draft: Draft) -> None:
        if not self.active(draft.day):
            return
        self._apply(draft)
        self.applied += 1
        if self.kind == "life_event":
            draft.event, draft.event_day = self.name, self.label_day
        else:
            draft.attack, draft.attack_day = self.name, self.start_day

    def _apply(self, draft: Draft) -> None:
        raise NotImplementedError


# ---------------------------------------------------------------- honest life events
class NewPhone(Effect):
    name, title = "new_phone", "Rider gets a new phone"
    description = "New device (and often a new OS). Touch behaviour shifts a little because the hardware differs."

    def __init__(self, sim, start_day, rng):
        super().__init__(sim, start_day, rng)
        self.device = _new_device(rng)
        self.os = rng.choice([o for o in OS_VERSIONS if o != sim.os]) if rng.random() < 0.5 else None
        self.tap = _signed(rng, 0.6, 1.8)
        self.swipe = _signed(rng, 0.6, 1.8)

    def _apply(self, d):
        d.device_id = self.device
        if self.os:
            d.os = self.os
        d.shift("tap_interval_ms", self.tap)
        d.shift("swipe_speed", self.swipe)


class OsUpdate(Effect):
    name, title = "os_update", "OS / app update"
    description = "Same phone and person, new OS and app version."

    def __init__(self, sim, start_day, rng):
        super().__init__(sim, start_day, rng)
        self.os = rng.choice([o for o in OS_VERSIONS if o != sim.os])

    def _apply(self, d):
        d.os = self.os
        d.app_version = "5.4.0"


class MovedCity(Effect):
    name, title = "moved_city", "Rider moves to another city"
    description = "New city, zones and traffic. Speed, routing and order pace shift because the roads differ."

    def __init__(self, sim, start_day, rng):
        super().__init__(sim, start_day, rng)
        self.city = rng.choice([c for c in CITIES if c != sim.city])
        self.zones = [f"Z{rng.randint(1, 30)}" for _ in range(2)]
        self.shifts = {f: _signed(rng, 0.5, 1.4) for f in ("avg_speed_kmh", "route_deviation", "orders_per_hour")}

    def _apply(self, d):
        d.city, d.zones = self.city, self.zones
        for f, s in self.shifts.items():
            d.shift(f, s)


class NewZone(Effect):
    name, title = "new_zone", "Rider switches delivery zone"
    description = "Same city, different zones. Mild change in pace and routing."

    def __init__(self, sim, start_day, rng):
        super().__init__(sim, start_day, rng)
        self.zones = [f"Z{rng.randint(31, 60)}" for _ in range(2)]
        self.shifts = {f: _signed(rng, 0.3, 1.0) for f in ("avg_speed_kmh", "route_deviation", "orders_per_hour")}

    def _apply(self, d):
        d.zones = self.zones
        for f, s in self.shifts.items():
            d.shift(f, s)


class VacationGap(Effect):
    name, title = "vacation_gap", "Rider returns from a break"
    description = "Two to three weeks away, then back on the same phone, a little rusty for a few sessions."

    def __init__(self, sim, start_day, rng):
        super().__init__(sim, start_day, rng)
        self.gap = rng.randint(10, 20)
        self.back_day = start_day + self.gap
        self.label_day = self.back_day

    def active(self, day):
        return day >= self.back_day

    def blackout(self, day):
        return self.start_day <= day < self.back_day

    def _apply(self, d):
        fade = max(0.0, 1.0 - self.applied / 3.0)
        d.shift("accept_latency_ms", 0.9 * fade)
        d.shift("idle_gap_min", 0.7 * fade)


class IllnessSlowdown(Effect):
    name, title = "illness_slowdown", "Rider is unwell for a while"
    description = "Slower riding, fewer orders, slower to respond, for roughly two weeks."

    def __init__(self, sim, start_day, rng):
        super().__init__(sim, start_day, rng)
        self.length = rng.randint(8, 14)

    def _apply(self, d):
        if self.applied < self.length:
            d.shift("avg_speed_kmh", -1.2)
            d.shift("orders_per_hour", -1.2)
            d.shift("accept_latency_ms", 0.9)
            d.shift("idle_gap_min", 0.8)


class ScheduleChange(Effect):
    name, title = "schedule_change", "Rider changes working hours"
    description = "A new job or shift moves login times by a few hours."

    def __init__(self, sim, start_day, rng):
        super().__init__(sim, start_day, rng)
        self.offset = _signed(rng, 2.5, 4.0)

    def _apply(self, d):
        d.hour_center = (d.hour_center + self.offset) % 24


class NetworkChange(Effect):
    name, title = "network_change", "Rider switches network provider"
    description = "New SIM / ISP. Different IP range, identical behaviour."

    def __init__(self, sim, start_day, rng):
        super().__init__(sim, start_day, rng)
        self.carrier = rng.choice([a for a in CARRIER_ASNS if a != sim.carrier])
        self.broadband = rng.choice([a for a in BROADBAND_ASNS if a != sim.broadband])

    def _apply(self, d):
        d.carrier, d.broadband = self.carrier, self.broadband


# ---------------------------------------------------------------- takeover attacks
class _Takeover(Effect):
    """Base for attacks: a different person (new persona) drives the account."""

    kind = "attack"

    def __init__(self, sim, start_day, rng, shared: dict | None = None):
        super().__init__(sim, start_day, rng)
        self.persona = dict(shared["persona"]) if shared else sim.sample_persona(rng)
        self.hour_center = (sim.hour_center + rng.gauss(0.0, 3.0)) % 24

    def _become_other(self, d: Draft, weight: float = 1.0) -> None:
        for f, target in self.persona.items():
            d.mean[f] += weight * (target - d.mean[f])
        d.hour_center = (d.hour_center + weight * _wrap_day_hours(self.hour_center - d.hour_center)) % 24
        d.actor = "other"


class HardHandoff(_Takeover):
    name, title = "hard_handoff", "Account handed to someone else"
    description = "Same phone, same city, a different person behind the wheel from now on."

    def _apply(self, d):
        self._become_other(d)


class GradualSharing(_Takeover):
    name, title = "gradual_sharing", "Two people share the account"
    description = "A second person drives about half the sessions on the same phone."

    def _apply(self, d):
        if self.rng.random() < 0.5:
            self._become_other(d)


class TimeshareRental(_Takeover):
    name, title = "timeshare_rental", "Account rented out in off-hours"
    description = "A renter uses the account during the owner's off-hours, on the same phone."

    def __init__(self, sim, start_day, rng, shared=None):
        super().__init__(sim, start_day, rng, shared)
        self.hour_center = (sim.hour_center + rng.choice((-1, 1)) * rng.uniform(9.0, 13.0)) % 24

    def _apply(self, d):
        if self.rng.random() < 0.55:
            self._become_other(d)
            d.hour_sd = 1.5


class CredentialTheft(_Takeover):
    name, title = "credential_theft", "Credentials stolen, new device elsewhere"
    description = "A stranger logs in from a new device in another city."

    def __init__(self, sim, start_day, rng, shared=None):
        super().__init__(sim, start_day, rng, shared)
        self.device = _new_device(rng)
        self.os = rng.choice(OS_VERSIONS)
        self.city = rng.choice([c for c in CITIES if c != sim.city])
        self.zones = [f"Z{rng.randint(61, 90)}" for _ in range(2)]
        self.carrier = rng.choice(CARRIER_ASNS)
        self.broadband = rng.choice(BROADBAND_ASNS)

    def _apply(self, d):
        d.device_id, d.os, d.city, d.zones = self.device, self.os, self.city, self.zones
        d.carrier, d.broadband = self.carrier, self.broadband
        self._become_other(d)


class SlowDrift(_Takeover):
    name, title = "slow_drift", "Habits drift to a new person slowly"
    description = "A substitute gradually takes over; habits shift a little each session so no single login stands out."
    RAMP_SESSIONS = 15

    def _apply(self, d):
        weight = min(1.0, (self.applied + 1) / self.RAMP_SESSIONS)
        self._become_other(d, weight)
        if weight < 0.3:
            d.actor = "owner"


class FleetFarming(_Takeover):
    name, title = "fleet_farming", "One operator runs many accounts"
    description = "Several accounts share one handset and one operator's habits."

    def __init__(self, sim, start_day, rng, shared=None):
        super().__init__(sim, start_day, rng, shared)
        self.device = shared["device"] if shared else _new_device(rng)

    def _apply(self, d):
        d.device_id = self.device
        self._become_other(d)


LIFE_EVENTS: dict[str, type[Effect]] = {c.name: c for c in (
    NewPhone, OsUpdate, MovedCity, NewZone, VacationGap, IllnessSlowdown, ScheduleChange, NetworkChange)}
ATTACKS: dict[str, type[Effect]] = {c.name: c for c in (
    HardHandoff, GradualSharing, TimeshareRental, CredentialTheft, SlowDrift, FleetFarming)}
SCENARIOS: dict[str, type[Effect]] = {**LIFE_EVENTS, **ATTACKS}


def make_effect(name: str, sim: "RiderSim", start_day: int, rng: random.Random,
                shared: dict | None = None) -> Effect:
    cls = SCENARIOS.get(name)
    if cls is None:
        raise ValueError(f"unknown scenario {name!r}; choose from {sorted(SCENARIOS)}")
    if issubclass(cls, _Takeover):
        return cls(sim, start_day, rng, shared)
    return cls(sim, start_day, rng)


def scenario_catalog() -> list[dict[str, str]]:
    return [{"name": c.name, "kind": c.kind, "title": c.title, "description": c.description}
            for c in SCENARIOS.values()]
