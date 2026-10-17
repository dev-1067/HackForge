"""Synthetic dataset generation: ``python -m sim.generate --riders 5000 --days 60``."""
from __future__ import annotations

import argparse
import csv
import json
import random
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterator

from .archetypes import ARCHETYPES
from .effects import ATTACKS, LIFE_EVENTS
from .records import RiderMeta, SessionRecord
from .rider import RiderSim

BASE_DATE = datetime(2026, 1, 5)
FLEET_SIZE = 4
MIN_HISTORY_DAYS = 20      # every rider has at least this long a clean history
EVENT_WINDOW_DAYS = 21     # honest events must leave this many days to observe
ATTACK_WINDOW_DAYS = 14    # attacks must leave this many days to be detected


@dataclass
class GenConfig:
    riders: int = 1000
    days: int = 60
    seed: int = 7
    event_frac: float = 0.30
    attack_frac: float = 0.20

    def validate(self) -> None:
        if self.days < MIN_HISTORY_DAYS + EVENT_WINDOW_DAYS + 1:
            raise ValueError(f"days must be at least {MIN_HISTORY_DAYS + EVENT_WINDOW_DAYS + 1}")
        if self.riders < 1:
            raise ValueError("riders must be positive")
        if min(self.event_frac, self.attack_frac) < 0 or self.event_frac + self.attack_frac > 1:
            raise ValueError("event_frac + attack_frac must be within [0, 1]")


def _pick_scenario(rng: random.Random, cfg: GenConfig) -> tuple[str, str, int]:
    """Returns (kind, name, start_day); kind is '' for a rider with no scenario."""
    roll = rng.random()
    if roll < cfg.attack_frac:
        latest = cfg.days - ATTACK_WINDOW_DAYS - 2
        return "attack", rng.choice(sorted(ATTACKS)), rng.randint(MIN_HISTORY_DAYS, latest)
    if roll < cfg.attack_frac + cfg.event_frac:
        latest = cfg.days - EVENT_WINDOW_DAYS - 1
        return "life_event", rng.choice(sorted(LIFE_EVENTS)), rng.randint(MIN_HISTORY_DAYS, latest)
    return "", "", -1


def iter_riders(cfg: GenConfig) -> Iterator[tuple[RiderMeta, list[SessionRecord]]]:
    """Yield (meta, sessions) one rider at a time, sessions in time order."""
    cfg.validate()
    archetypes = sorted(ARCHETYPES)
    farms: dict[int, dict] = {}
    fleet_count = 0
    for i in range(cfg.riders):
        rng = random.Random(cfg.seed * 1_000_003 + i)
        archetype = archetypes[i % len(archetypes)]
        rider_id = f"R{i:05d}"
        sim = RiderSim(rider_id, archetype, rng, BASE_DATE)
        kind, name, start = _pick_scenario(rng, cfg)
        if kind:
            shared = None
            if name == "fleet_farming":
                group = fleet_count // FLEET_SIZE
                fleet_count += 1
                if group not in farms:
                    farm_rng = random.Random(cfg.seed * 7919 + group)
                    farms[group] = {"persona": sim.sample_persona(farm_rng),
                                    "device": f"d_{farm_rng.getrandbits(32):08x}"}
                shared = farms[group]
            sim.add_scenario(name, start, shared)
        meta = RiderMeta(rider_id, archetype, sim.city, kind, name, start)
        sessions: list[SessionRecord] = []
        for day in range(cfg.days):
            sessions.extend(sim.sessions_for_day(day))
        yield meta, sessions


def write_dataset(cfg: GenConfig, out_dir: Path) -> tuple[int, int]:
    """Stream riders.csv + sessions.csv + manifest.json to ``out_dir``."""
    out_dir.mkdir(parents=True, exist_ok=True)
    n_riders = n_sessions = 0
    with open(out_dir / "sessions.csv", "w", newline="") as sf, open(out_dir / "riders.csv", "w", newline="") as rf:
        sw = csv.DictWriter(sf, fieldnames=SessionRecord.CSV_COLUMNS)
        rw = csv.DictWriter(rf, fieldnames=["rider_id", "archetype", "home_city", "scenario_kind",
                                            "scenario", "scenario_day"])
        sw.writeheader()
        rw.writeheader()
        for meta, sessions in iter_riders(cfg):
            rw.writerow(meta.__dict__)
            sw.writerows(s.to_row() for s in sessions)
            n_riders += 1
            n_sessions += len(sessions)
    (out_dir / "manifest.json").write_text(json.dumps(
        {"riders": n_riders, "sessions": n_sessions, **cfg.__dict__, "base_date": BASE_DATE.isoformat()}, indent=2))
    return n_riders, n_sessions


def load_dataset(data_dir: Path) -> Iterator[tuple[RiderMeta, list[SessionRecord]]]:
    """Read a dataset written by :func:`write_dataset` (or any file in the same schema)."""
    metas: dict[str, RiderMeta] = {}
    with open(data_dir / "riders.csv", newline="") as f:
        for row in csv.DictReader(f):
            row["scenario_day"] = int(row["scenario_day"])
            metas[row["rider_id"]] = RiderMeta(**row)
    grouped: dict[str, list[SessionRecord]] = {rid: [] for rid in metas}
    with open(data_dir / "sessions.csv", newline="") as f:
        for row in csv.DictReader(f):
            grouped[row["rider_id"]].append(SessionRecord.from_row(row))
    for rid, meta in metas.items():
        yield meta, sorted(grouped[rid], key=lambda s: s.started_at)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a labelled synthetic rider dataset")
    parser.add_argument("--riders", type=int, default=GenConfig.riders)
    parser.add_argument("--days", type=int, default=GenConfig.days)
    parser.add_argument("--seed", type=int, default=GenConfig.seed)
    parser.add_argument("--event-frac", type=float, default=GenConfig.event_frac)
    parser.add_argument("--attack-frac", type=float, default=GenConfig.attack_frac)
    parser.add_argument("--out", type=Path, default=Path("data"))
    args = parser.parse_args()
    cfg = GenConfig(args.riders, args.days, args.seed, args.event_frac, args.attack_frac)
    riders, sessions = write_dataset(cfg, args.out)
    print(f"wrote {riders} riders / {sessions} sessions to {args.out}/")


if __name__ == "__main__":
    main()
