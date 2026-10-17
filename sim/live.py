"""Live simulation world for the demo lab (used by the backend's ``/lab`` endpoints).

    world = LiveWorld(n_riders=60, seed=11, history_days=30)
    world.history            # {rider_id: [SessionRecord, ...]}  -> enroll these into the engine
    rec = world.next_session("R00007")        # that rider's next session
    world.trigger("R00007", "hard_handoff")   # from the next session on, someone else is driving
"""
from __future__ import annotations

import random
from datetime import datetime

from .archetypes import ARCHETYPES
from .effects import SCENARIOS, scenario_catalog
from .generate import BASE_DATE
from .records import RiderMeta, SessionRecord
from .rider import RiderSim


class LiveWorld:
    def __init__(self, n_riders: int = 60, seed: int = 11, history_days: int = 30,
                 base_date: datetime = BASE_DATE) -> None:
        if n_riders < 1 or history_days < 0:
            raise ValueError("n_riders must be positive and history_days non-negative")
        self.rng = random.Random(seed)
        self.sims: dict[str, RiderSim] = {}
        self.meta: dict[str, RiderMeta] = {}
        self.history: dict[str, list[SessionRecord]] = {}
        archetypes = sorted(ARCHETYPES)
        for i in range(n_riders):
            rider_id = f"R{i:05d}"
            sim = RiderSim(rider_id, archetypes[i % len(archetypes)], random.Random(seed * 1_000_003 + i), base_date)
            self.sims[rider_id] = sim
            self.meta[rider_id] = RiderMeta(rider_id, sim.archetype, sim.city)
            self.history[rider_id] = [rec for day in range(history_days) for rec in sim.sessions_for_day(day)]
            sim.live_day = history_days

    @property
    def rider_ids(self) -> list[str]:
        return list(self.sims)

    @staticmethod
    def catalog() -> list[dict[str, str]]:
        """Scenarios that can be triggered (name, kind, title, description)."""
        return scenario_catalog()

    def next_session(self, rider_id: str | None = None) -> SessionRecord:
        """The next session for ``rider_id`` (a random rider when omitted)."""
        if rider_id is None:
            rider_id = self.rng.choice(self.rider_ids)
        return self._sim(rider_id).next_live_session()

    def trigger(self, rider_id: str, scenario: str) -> dict[str, str]:
        """Apply a life event or attack starting with the rider's next session."""
        if scenario not in SCENARIOS:
            raise ValueError(f"unknown scenario {scenario!r}; choose from {sorted(SCENARIOS)}")
        sim = self._sim(rider_id)
        shared = None
        if scenario == "fleet_farming":
            shared = {"persona": sim.sample_persona(self.rng), "device": f"d_{self.rng.getrandbits(32):08x}"}
        effect = sim.add_scenario(scenario, sim.live_day, shared)
        meta = self.meta[rider_id]
        meta.scenario_kind, meta.scenario, meta.scenario_day = effect.kind, scenario, sim.live_day
        return {"rider_id": rider_id, "scenario": scenario, "kind": effect.kind,
                "start_day": str(sim.live_day), "title": effect.title}

    def _sim(self, rider_id: str) -> RiderSim:
        try:
            return self.sims[rider_id]
        except KeyError:
            raise ValueError(f"unknown rider {rider_id!r}") from None
