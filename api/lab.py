"""Simulation lab: a live world of simulated riders feeding the real scoring pipeline.

Drives the demo. Scenarios triggered here change what the simulator generates for a
rider; everything after that (scoring, step-up, review, events) goes through exactly
the same service calls as production traffic.
"""
from __future__ import annotations

import asyncio
import random
import threading
import time
from typing import Any

from engine.profile import ESCALATED_STATUSES, STATUS_ACTIVE, STATUS_SUSPENDED
from sim.live import LiveWorld
from sim.records import SessionRecord

from .errors import InvalidState, LabUnavailable, UnknownRider
from .service import TrustService
from .settings import Settings


class Lab:
    MAX_RATE = 100.0
    MAX_OPEN_CASES = 4      # background incidents pause while this many cases wait for a person
    INCIDENT_CHANCE = 0.15  # per background tick, once an incident is allowed
    MIN_GAP_SECONDS = 25.0  # at least this long between two staged incidents
    COOLDOWN_SECONDS = 30.0 # after a person settles a case, nothing new is staged for this long
    INCIDENT_SESSIONS = 40  # how long the lab keeps feeding one incident before giving up

    def __init__(self, service: TrustService, settings: Settings) -> None:
        self.service = service
        self.settings = settings
        self.world: LiveWorld | None = None
        self.rng = random.Random(settings.lab_seed)
        self.blocked: set[str] = set()
        self.running = False
        self.rate = 2.0
        self.auto_resolve = True
        self.incidents = False
        self.last_incident = 0.0
        self._open_value, self._open_at = 0, 0.0
        self.cooldown_until = 0.0
        self.focus: dict[str, int] = {}   # riders with an incident in progress -> sessions left to feed it
        self.generated = 0
        self._lock = threading.RLock()
        self._task: asyncio.Task | None = None

    # ------------------------------------------------------------------ setup
    def build(self, ingest_history: bool = True) -> None:
        """Create the world and score each rider's history so every baseline is warm."""
        s = self.settings
        with self._lock:
            self.rng = random.Random(s.lab_seed)
            self.blocked.clear()
            self.focus.clear()
            self.generated = 0
            self.world = LiveWorld(s.lab_riders, s.lab_seed, s.lab_history_days)
            if ingest_history:
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
        if int(payload["level"][1]) >= 2:
            self._open_at = 0.0      # the number of open cases just changed
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

    def _sync_blocked(self) -> None:
        """"Blocked" means the platform has really suspended the account. It follows the rider's actual status, so a
        rider who was cleared, or who passed a check, is no longer shown as blocked."""
        engine = self.service.engine
        self.blocked = {rid for rid in (self.world.rider_ids if self.world else [])
                        if (st := engine.get_state(rid)) is not None and st.status == STATUS_SUSPENDED}

    def _pick_rider(self, world: LiveWorld) -> str | None:
        self._sync_blocked()
        candidates = [r for r in world.rider_ids if r not in self.blocked]
        if not self.auto_resolve:
            # riders already waiting for a person stay as they are, so cases pile up for review instead of changing underneath it
            candidates = [r for r in candidates if not self._waiting(r)]
        return self.rng.choice(candidates) if candidates else None

    def _waiting(self, rider_id: str) -> bool:
        state = self.service.engine.get_state(rider_id)
        return state is not None and state.status in ESCALATED_STATUSES

    def restore(self, rider_id: str) -> dict[str, Any]:
        """Back to a normal account: close open cases and checks, end any staged attack. Recorded in the history."""
        with self._lock:
            world = self._need_world()
            if rider_id not in world.sims:
                raise UnknownRider(rider_id)
            result = self.service.restore_rider(rider_id)
            self.focus.pop(rider_id, None)
            sim = world.sims[rider_id]
            sim.effects = [e for e in sim.effects if e.kind != "attack"]
            meta = world.meta[rider_id]
            if meta.scenario_kind == "attack":
                meta.scenario_kind, meta.scenario = "", ""
            self._open_at = 0.0
            self._sync_blocked()
            return result

    def trigger(self, rider_id: str, scenario: str, steps: int = 0, auto_resolve: bool = True,
                restore: bool = False) -> dict[str, Any]:
        with self._lock:
            world = self._need_world()
            if rider_id not in world.sims:
                raise UnknownRider(rider_id)
            restored = self.restore(rider_id) if restore else None
            info = world.trigger(rider_id, scenario)
            self.service.bus.publish("lab", {"type": "scenario", **info})
            decisions = self.step(rider_id, steps, auto_resolve) if steps else []
            return {"triggered": info, "decisions": decisions, "restored": restored}

    def _background_step(self) -> None:
        """One background tick: usually a random rider, sometimes the next session of an incident in progress."""
        with self._lock:
            world = self._need_world()
            if not self.auto_resolve and self._open_cases() >= self.MAX_OPEN_CASES:
                return          # the queue is full: wait for a person instead of piling more cases on
            if self.incidents and not self.auto_resolve:
                now = time.monotonic()
                if (now >= self.cooldown_until and now - self.last_incident >= self.MIN_GAP_SECONDS
                        and self.rng.random() < self.INCIDENT_CHANCE and len(self.focus) < 2
                        and self._open_cases() < self.MAX_OPEN_CASES):
                    self._start_incident(world)
                if self.focus and self.rng.random() < 0.7:
                    rider_id = self.rng.choice(sorted(self.focus))
                    payload = self._ingest(world.next_session(rider_id), source="lab", auto_resolve=False)
                    self.generated += 1
                    self.focus[rider_id] -= 1
                    if payload["status"] not in ("active", "watch") or self.focus[rider_id] <= 0:
                        self.focus.pop(rider_id, None)
                    return
            self.step(None, 1, self.auto_resolve)

    def _open_cases(self) -> int:
        """Open cases, looked up at most once a second (the background run can tick up to 100 times a second)."""
        now = time.monotonic()
        if now - self._open_at >= 1.0:
            self._open_value, self._open_at = self.service.open_case_count(), now
        return self._open_value

    def _start_incident(self, world: LiveWorld) -> None:
        self._sync_blocked()
        riders = [r for r in world.rider_ids if r not in self.blocked and r not in self.focus
                  and not world.meta[r].scenario and not self._waiting(r)]
        attacks = [c["name"] for c in world.catalog() if c["kind"] == "attack"]
        if not riders or not attacks:
            return
        rider_id, scenario = self.rng.choice(riders), self.rng.choice(attacks)
        info = world.trigger(rider_id, scenario)
        self.focus[rider_id] = self.INCIDENT_SESSIONS
        self.last_incident = time.monotonic()
        self.service.bus.publish("lab", {"type": "scenario", **info})

    def after_review(self, rider_id: str, takeover_confirmed: bool) -> None:
        """A person settled a case. Suspend: the simulated rider stays blocked. Clear: the staged attack ends."""
        with self._lock:
            if self.world is None or rider_id not in self.world.sims:
                return
            self.focus.pop(rider_id, None)
            self.cooldown_until = time.monotonic() + self.COOLDOWN_SECONDS
            self._open_at = 0.0
            if not takeover_confirmed:
                sim = self.world.sims[rider_id]
                sim.effects = [e for e in sim.effects if e.kind != "attack"]
                meta = self.world.meta[rider_id]
                if meta.scenario_kind == "attack":
                    meta.scenario_kind, meta.scenario = "", ""

    def state(self) -> dict[str, Any]:
        with self._lock:
            world = self._need_world()
            self._sync_blocked()
            engine = self.service.engine
            statuses = {rid: st.status for rid in world.rider_ids
                        if (st := engine.get_state(rid)) is not None and st.status != STATUS_ACTIVE}
            return {"statuses": statuses, "running": self.running, "rate": self.rate, "auto_resolve": self.auto_resolve,
                    "incidents": self.incidents,
                    "waiting_for_review": bool(self.running and not self.auto_resolve and self._open_cases() >= self.MAX_OPEN_CASES),
                    "riders": len(world.sims), "blocked": sorted(self.blocked), "generated": self.generated,
                    "active_scenarios": {rid: {"kind": m.scenario_kind, "scenario": m.scenario}
                                         for rid, m in world.meta.items() if m.scenario}}

    def scenarios(self) -> list[dict[str, str]]:
        return LiveWorld.catalog()

    # ------------------------------------------------------------------ background runner
    def start(self, rate: float = 2.0, auto_resolve: bool = True, incidents: bool = False) -> None:
        self._need_world()
        if not 0 < rate <= self.MAX_RATE:
            raise ValueError(f"rate must be in (0, {self.MAX_RATE:g}] sessions per second")
        self.rate, self.auto_resolve, self.incidents = rate, auto_resolve, incidents
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
                    await asyncio.to_thread(self._background_step)
                except (InvalidState, LabUnavailable):
                    pass
                delay = max(0.0, 1.0 / self.rate - (asyncio.get_running_loop().time() - started))
                await asyncio.sleep(delay)
        except asyncio.CancelledError:
            pass
