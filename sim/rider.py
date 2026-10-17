"""A simulated rider: stable personality plus any scenarios currently in effect."""
from __future__ import annotations

import random
from datetime import datetime, timedelta

from engine.features import HABIT_FEATURES, from_model_space

from .archetypes import (ARCHETYPES, BETWEEN_RATIO, BROADBAND_ASNS, CARRIER_ASNS, CITIES,
                         HOUR_CENTER_SPREAD, OS_VERSIONS, RAW_LIMITS, WITHIN_SD, model_center, poisson)
from .effects import Draft, Effect, make_effect
from .records import SessionRecord

NETWORK_CHOICES = (("4g", 0.55), ("5g", 0.30), ("wifi", 0.15))
OFF_DAY_PROB = 0.03     # honest "bad day": every habit wobbles a bit more than usual
MAX_SESSIONS_PER_DAY = 4


class RiderSim:
    def __init__(self, rider_id: str, archetype: str, rng: random.Random, base_date: datetime) -> None:
        self.rider_id = rider_id
        self.archetype = archetype
        self.arch = ARCHETYPES[archetype]
        self.rng = rng
        self.base_date = base_date
        scale = rng.uniform(0.8, 1.25)
        self.within_sd = {f: WITHIN_SD[f] * scale for f in HABIT_FEATURES}
        self.persona = self.sample_persona(rng)
        self.hour_center = (self.arch.hour_center + rng.gauss(0.0, HOUR_CENTER_SPREAD)) % 24
        self.hour_sd = self.arch.hour_sd * rng.uniform(0.8, 1.2)
        self.device_id = f"d_{rng.getrandbits(32):08x}"
        self.os = rng.choice(OS_VERSIONS)
        self.app_version = "5.2.1"
        self.city = rng.choice(CITIES)
        self.zones = [f"Z{rng.randint(1, 30)}" for _ in range(rng.randint(2, 3))]
        self.carrier = rng.choice(CARRIER_ASNS)
        self.broadband = rng.choice(BROADBAND_ASNS)
        self.effects: list[Effect] = []
        self.n_sessions = 0
        self.live_day = 0

    # ---- population ---------------------------------------------------------
    def sample_persona(self, rng: random.Random) -> dict[str, float]:
        """A random person of this archetype (used for the rider and for attackers)."""
        centre = model_center(self.arch)
        return {f: centre[f] + rng.gauss(0.0, BETWEEN_RATIO[f] * WITHIN_SD[f]) for f in HABIT_FEATURES}

    # ---- scenarios ------------------------------------------------------------
    def add_scenario(self, name: str, start_day: int, shared: dict | None = None) -> Effect:
        effect = make_effect(name, self, start_day, random.Random(self.rng.getrandbits(48)), shared)
        self.effects.append(effect)
        return effect

    # ---- session generation -------------------------------------------------
    def _draft(self, day: int) -> Draft:
        draft = Draft(self, day, self.device_id, self.os, self.app_version, self.city, list(self.zones),
                      self.carrier, self.broadband, dict(self.persona), self.hour_center, self.hour_sd)
        # honest life events first, attackers last so a takeover overrides them
        for effect in sorted(self.effects, key=lambda e: e.kind == "attack"):
            effect.apply(draft)
        return draft

    def _sample_context(self, d: Draft) -> dict[str, str]:
        network = self.rng.choices([n for n, _ in NETWORK_CHOICES], [w for _, w in NETWORK_CHOICES])[0]
        asn = d.broadband if network == "wifi" else d.carrier
        return {"device_id": d.device_id, "os": d.os, "app_version": d.app_version, "ip_asn": asn,
                "city": d.city, "zone": self.rng.choice(d.zones), "network_type": network}

    def _sample_habit(self, d: Draft) -> dict[str, float]:
        off_day = self.rng.random() < OFF_DAY_PROB
        habit: dict[str, float] = {}
        for f in HABIT_FEATURES:
            sd = self.within_sd[f]
            value = d.mean[f] + self.rng.gauss(0.0, sd)
            if off_day:
                value += self.rng.gauss(0.0, 1.0) * sd
            lo, hi = RAW_LIMITS[f]
            habit[f] = min(hi, max(lo, from_model_space(f, value)))
        return habit

    def _stamp(self, record: SessionRecord) -> SessionRecord:
        record.idx = self.n_sessions
        record.session_id = f"{self.rider_id}-{self.n_sessions:05d}"
        self.n_sessions += 1
        return record

    def _record(self, day: int, hour: float | None = None) -> SessionRecord:
        draft = self._draft(day)
        if hour is None:
            hour = (draft.hour_center + self.rng.gauss(0.0, draft.hour_sd)) % 24
        when = self.base_date + timedelta(days=day, hours=hour)
        label = "honest"
        if draft.actor == "other":
            label = f"attack:{draft.attack}"
        elif draft.event:
            label = f"life_event:{draft.event}"
        return SessionRecord(
            session_id="", rider_id=self.rider_id, started_at=when, day=day, idx=-1,
            context=self._sample_context(draft), habit=self._sample_habit(draft),
            gt_actor=draft.actor, gt_label=label, gt_event=draft.event, gt_event_day=draft.event_day,
            gt_attack=draft.attack, gt_attack_day=draft.attack_day)

    def sessions_for_day(self, day: int) -> list[SessionRecord]:
        if any(e.blackout(day) for e in self.effects):
            return []
        count = min(MAX_SESSIONS_PER_DAY, poisson(self.rng, self.arch.sessions_per_day))
        records = sorted((self._record(day) for _ in range(count)), key=lambda r: r.started_at)
        for record in records:
            self._stamp(record)
        return records

    def next_live_session(self) -> SessionRecord:
        """One session on this rider's next working day (for the live demo)."""
        while any(e.blackout(self.live_day) for e in self.effects):
            self.live_day += 1
        record = self._stamp(self._record(self.live_day))
        self.live_day += 1
        return record
