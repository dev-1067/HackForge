"""Simulation lab: a live world of simulated riders feeding the real scoring pipeline.

Drives the demo. Scenarios triggered here change what the simulator generates for a
rider; everything after that (scoring, step-up, review, events) goes through exactly
the same service calls as production traffic.
"""
from __future__ import annotations

import asyncio
import random
import threading
from typing import Any

from sim.live import LiveWorld
from sim.records import SessionRecord

from .errors import InvalidState, LabUnavailable, UnknownRider
from .service import TrustService
from .settings import Settings


class Lab:
    MAX_RATE = 100.0

    def __init__(self, service: TrustService, settings: Settings) -> None:
        self.service = service
        self.settings = settings
        self.world: LiveWorld | None = None
        self.rng = random.Random(settings.lab_seed)
        self.blocked: set[str] = set()
        self.running = False
        self.rate = 2.0
        self.auto_resolve = True
        self.generated = 0
        self._lock = threading.RLock()
        self._task: asyncio.Task | None = None

    # ------------------------------------------------------------------ setup
    def build(self) -> None:
        """Create the world and score each rider's history so every baseline is warm."""
        s = self.settings
        with self._lock:
            self.rng = random.Random(s.lab_seed)
            self.blocked.clear()
            self.generated = 0
            self.world = LiveWorld(s.lab_riders, s.lab_seed, s.lab_history_days)
            for rider_id in self.world.rider_ids:
                for rec in self.world.history[rider_id]:
                    self._ingest(rec, source="seed", auto_resolve=True, publish=False)

    def reset(self) -> None:
        self.stop()
        with self._lock:
            self.service.reset()
            self.build()
        self.service.bus.publish("lab", {"type": "reset"})

    def _need_world(self) -> LiveWorld:
        if self.world is None:
            raise LabUnavailable("the simulation lab is not available")
        return self.world

    # ------------------------------------------------------------------ pipeline
    def _ingest(self, rec: SessionRecord, *, source: str, auto_resolve: bool, publish: bool = True) -> dict[str, Any]:
        payload = self.service.score_payload(
            rec.to_payload(), source=source, publish=publish,
            ground_truth={"actor": rec.gt_actor, "label": rec.gt_label})
        payload["resolution"] = self._resolve(rec, payload, publish) if auto_resolve else None
        return payload

    def _resolve(self, rec: SessionRecord, payload: dict[str, Any], publish: bool) -> dict[str, Any] | None:
        """Play the part of the rider / reviewer for an escalated session."""
        level = int(payload["level"][1])
        if level < 2:
            return None
        owner = rec.gt_actor == "owner"
        rider_id = rec.rider_id
        out: dict[str, Any] = {}
        if level >= 3:
            review = self.service.review_decision(payload["decision_id"], takeover_confirmed=not owner,
                                                  reviewer="lab", note="auto-resolved by the lab")
            out["review"] = review["verdict"]
        else:
            passed = (self.rng.random() > self.settings.lab_owner_stepup_fail if owner
                      else self.rng.random() < self.settings.lab_impostor_stepup_pass)
            self.service.stepup_result(rider_id, passed, session_id=rec.session_id, actor="lab")
            out["stepup"] = "passed" if passed else "failed"
            if not passed:
                review = self.service.review_decision(payload["decision_id"], takeover_confirmed=not owner,
                                                      reviewer="lab", note="auto-resolved by the lab")
                out["review"] = review["verdict"]
        if not owner and out.get("review") == "confirmed_takeover":
            self.blocked.add(rider_id)
            out["blocked"] = True
            if publish:
                self.service.bus.publish("lab", {"type": "blocked", "rider_id": rider_id})
        return out

    # ------------------------------------------------------------------ operations
    def step(self, rider_id: str | None = None, count: int = 1, auto_resolve: bool = True) -> list[dict[str, Any]]:
        """Generate and score ``count`` sessions (for one rider, or random unblocked riders)."""
        with self._lock:
            world = self._need_world()
            if rider_id is not None and rider_id not in world.sims:
                raise UnknownRider(rider_id)
            results = []
            for _ in range(count):
                target = rider_id or self._pick_rider(world)
                if target is None:
                    break
                results.append(self._ingest(world.next_session(target), source="lab", auto_resolve=auto_resolve))
                self.generated += 1
            return results

    def _pick_rider(self, world: LiveWorld) -> str | None:
        candidates = [r for r in world.rider_ids if r not in self.blocked]
        return self.rng.choice(candidates) if candidates else None

    def trigger(self, rider_id: str, scenario: str, steps: int = 0, auto_resolve: bool = True) -> dict[str, Any]:
        with self._lock:
            world = self._need_world()
            if rider_id not in world.sims:
                raise UnknownRider(rider_id)
            info = world.trigger(rider_id, scenario)
            self.blocked.discard(rider_id)
            self.service.bus.publish("lab", {"type": "scenario", **info})
            decisions = self.step(rider_id, steps, auto_resolve) if steps else []
            return {"triggered": info, "decisions": decisions}

    def state(self) -> dict[str, Any]:
        with self._lock:
            world = self._need_world()
            return {"running": self.running, "rate": self.rate, "auto_resolve": self.auto_resolve,
                    "riders": len(world.sims), "blocked": sorted(self.blocked), "generated": self.generated,
                    "active_scenarios": {rid: {"kind": m.scenario_kind, "scenario": m.scenario}
                                         for rid, m in world.meta.items() if m.scenario}}

    def scenarios(self) -> list[dict[str, str]]:
        return LiveWorld.catalog()

    # ------------------------------------------------------------------ background runner
    def start(self, rate: float = 2.0, auto_resolve: bool = True) -> None:
        self._need_world()
        if not 0 < rate <= self.MAX_RATE:
            raise ValueError(f"rate must be in (0, {self.MAX_RATE:g}] sessions per second")
        self.rate, self.auto_resolve = rate, auto_resolve
        if self.running:
            return
        self.running = True
        self._task = asyncio.get_running_loop().create_task(self._run())
        self.service.bus.publish("lab", {"type": "running", "rate": rate})

    def stop(self) -> None:
        was_running = self.running
        self.running = False
        if self._task is not None and not self._task.done():
            self._task.cancel()
        self._task = None
        if was_running:
            self.service.bus.publish("lab", {"type": "stopped"})

    async def _run(self) -> None:
        try:
            while self.running:
                started = asyncio.get_running_loop().time()
                try:
                    await asyncio.to_thread(self.step, None, 1, self.auto_resolve)
                except (InvalidState, LabUnavailable):
                    pass
                delay = max(0.0, 1.0 / self.rate - (asyncio.get_running_loop().time() - started))
                await asyncio.sleep(delay)
        except asyncio.CancelledError:
            pass
