"""Evaluation: ``python -m sim.evaluate``.

Replays held-out riders through our engine and the baselines, resolving the
escalation ladder the way a real platform would (owners usually pass a step-up,
impostors usually fail), then reports the metrics from the project plan.
"""
from __future__ import annotations

import argparse
import json
import random
import time
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Sequence

from engine import Config, Priors
from engine.train import save_model, train

from .baselines import NaiveAnomaly, OpenGate, StrictGate, System, TrustJuggler, calibrate_naive
from .effects import ATTACKS, LIFE_EVENTS
from .generate import ATTACK_WINDOW_DAYS, EVENT_WINDOW_DAYS, GenConfig, iter_riders, load_dataset
from .records import RiderMeta, SessionRecord

OWNER_STEPUP_FAIL = 0.02      # a genuine owner fails a selfie check (bad light, camera)
IMPOSTOR_STEPUP_PASS = 0.10   # an impostor gets through a selfie check
SKIP_FIRST_SESSIONS = 10      # warm-up sessions are excluded from friction statistics

CONTEXT_EVENTS = ("new_phone", "os_update", "moved_city", "new_zone", "vacation_gap", "network_change")
BACKGROUND_WINDOW = (30, 30 + EVENT_WINDOW_DAYS)  # days used to measure friction for riders with no event

Rider = tuple[RiderMeta, list[SessionRecord]]


@dataclass
class Outcome:
    level: int
    record: SessionRecord


def replay(system: System, riders: Sequence[Rider], seed: int = 0) -> dict[str, list[Outcome]]:
    """Run each rider through ``system``; returns per-rider outcomes (stops once an impostor is blocked)."""
    rng = random.Random(seed)
    results: dict[str, list[Outcome]] = {}
    for meta, sessions in riders:
        rid = meta.rider_id
        system.start_rider(rid, meta.archetype)
        outcomes: list[Outcome] = []
        for rec in sessions:
            level = system.score(rec)
            outcomes.append(Outcome(level, rec))
            owner = rec.gt_actor == "owner"
            if level >= 3:                              # payouts held: a human reviews
                system.review(rid, not owner)
                if not owner:
                    break
            elif level == 2:                            # selfie / liveness check
                passed = rng.random() > OWNER_STEPUP_FAIL if owner else rng.random() < IMPOSTOR_STEPUP_PASS
                system.stepup(rid, passed)
                if not passed:
                    if owner:
                        system.review(rid, False)       # reviewer clears the genuine owner
                    else:
                        break                           # impostor locked out
        results[rid] = outcomes
    return results


# ------------------------------------------------------------------ metrics
def _rate(num: int, den: int) -> float:
    return round(num / den, 5) if den else 0.0


def _percentile(values: list[float], q: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(q * len(ordered)))]


def compute_metrics(results: dict[str, list[Outcome]]) -> dict:
    honest = friction = hard = total = total_friction = 0
    event_sessions: dict[str, list[int]] = {n: [] for n in LIFE_EVENTS}
    event_riders: dict[str, list[bool]] = {n: [] for n in LIFE_EVENTS}
    attack_stats: dict[str, dict] = {n: {"riders": 0, "detected": 0, "sessions": [], "hours": []}
                                     for n in ATTACKS}
    background: list[bool] = []

    for outcomes in results.values():
        event_hit: dict[str, bool] = {}
        attack_name = ""
        first_attacker = None
        flagged_at = None
        attacker_count = 0
        for i, out in enumerate(outcomes):
            rec = out.record
            total += 1
            total_friction += out.level >= 2
            if rec.gt_attack:
                attack_name = rec.gt_attack
            if rec.gt_actor == "owner":
                if i >= SKIP_FIRST_SESSIONS:
                    honest += 1
                    friction += out.level >= 2
                    hard += out.level >= 3
                    if rec.gt_event in LIFE_EVENTS and 0 <= rec.day - rec.gt_event_day <= EVENT_WINDOW_DAYS:
                        event_sessions[rec.gt_event].append(int(out.level >= 2))
                        event_hit[rec.gt_event] = event_hit.get(rec.gt_event, False) or out.level >= 2
            elif rec.gt_attack and rec.day - rec.gt_attack_day <= ATTACK_WINDOW_DAYS:
                if first_attacker is None:
                    first_attacker = rec
                if flagged_at is None:
                    attacker_count += 1
                    if out.level >= 2:
                        flagged_at = (attacker_count, (rec.started_at - first_attacker.started_at).total_seconds() / 3600)
        for name, hit in event_hit.items():
            event_riders[name].append(hit)
        if not any(o.record.gt_event or o.record.gt_attack for o in outcomes):
            lo, hi = BACKGROUND_WINDOW
            window = [o for o in outcomes if lo <= o.record.day < hi]
            if window:
                background.append(any(o.level >= 2 for o in window))
        if attack_name and first_attacker is not None:
            stat = attack_stats[attack_name]
            stat["riders"] += 1
            if flagged_at is not None:
                stat["detected"] += 1
                stat["sessions"].append(flagged_at[0])
                stat["hours"].append(flagged_at[1])

    all_sessions = [s for st in attack_stats.values() for s in st["sessions"]]
    all_hours = [h for st in attack_stats.values() for h in st["hours"]]
    attacked = sum(st["riders"] for st in attack_stats.values())
    detected = sum(st["detected"] for st in attack_stats.values())

    return {
        "honest_sessions": honest,
        "false_stepup_rate": _rate(friction, honest),        # honest session asked for a selfie check or worse
        "false_lockout_rate": _rate(hard, honest),           # honest session held / suspended (a real lockout)
        "stepup_rate_all_sessions": _rate(total_friction, total),
        "takeover_recall_14d": _rate(detected, attacked),
        "attacked_accounts": attacked,
        "detection_latency_sessions": {"median": _percentile([float(x) for x in all_sessions], 0.5),
                                       "p90": _percentile([float(x) for x in all_sessions], 0.9)},
        "detection_latency_hours": {"median": _round(_percentile(all_hours, 0.5)),
                                    "p90": _round(_percentile(all_hours, 0.9))},
        "life_events": {n: {"riders": len(event_riders[n]),
                            "rider_friction_rate": _rate(sum(event_riders[n]), len(event_riders[n])),
                            "session_friction_rate": _rate(sum(event_sessions[n]), len(event_sessions[n]))}
                        for n in LIFE_EVENTS},
        "background_rider_friction_21d": _rate(sum(background), len(background)),
        "context_event_rider_friction_21d": _rate(
            sum(sum(event_riders[n]) for n in CONTEXT_EVENTS), sum(len(event_riders[n]) for n in CONTEXT_EVENTS)),
        "attacks": {n: {"accounts": st["riders"], "recall_14d": _rate(st["detected"], st["riders"]),
                        "median_sessions_to_detect": _percentile([float(x) for x in st["sessions"]], 0.5),
                        "median_hours_to_detect": _round(_percentile(st["hours"], 0.5))}
                    for n, st in attack_stats.items()},
    }


def _round(value: float | None) -> float | None:
    return None if value is None else round(value, 1)


# ------------------------------------------------------------------ pipeline
def split_riders(riders: list[Rider], seed: int = 0) -> tuple[list[Rider], list[Rider], list[Rider]]:
    """Random split by rider: 20% priors, 30% calibration (honest accounts only), 50% held-out test."""
    order = list(range(len(riders)))
    random.Random(seed).shuffle(order)
    n_prior, n_calib = int(0.2 * len(order)), int(0.3 * len(order))
    prior = [riders[i] for i in order[:n_prior]]
    calib = [riders[i] for i in order[n_prior:n_prior + n_calib] if riders[i][0].scenario_kind != "attack"]
    test = [riders[i] for i in order[n_prior + n_calib:]]
    return prior, calib, test


def _engine_view(riders: Sequence[Rider]) -> list[tuple[str, list]]:
    return [(m.archetype, [s.to_engine_session() for s in sessions]) for m, sessions in riders]


def build_model(riders: list[Rider], alpha: float, base: Config | None = None, seed: int = 0):
    prior, calib, test = split_riders(riders, seed)
    priors, cfg, report = train(_engine_view(prior), _engine_view(calib), base, alpha)
    return priors, cfg, report, prior, calib, test


def measure_speed(priors: Priors, cfg: Config, riders: Sequence[Rider], limit: int = 20000) -> dict:
    system = TrustJuggler(priors, cfg)
    latencies: list[float] = []
    started = time.perf_counter()
    count = 0
    for meta, sessions in riders:
        system.start_rider(meta.rider_id, meta.archetype)
        for rec in sessions:
            session = rec.to_engine_session()
            t0 = time.perf_counter()
            system.engine.score(session)
            latencies.append(time.perf_counter() - t0)
            count += 1
            if count >= limit:
                break
        if count >= limit:
            break
    elapsed = time.perf_counter() - started
    latencies.sort()
    return {"sessions_scored": count, "sessions_per_second": round(count / elapsed),
            "latency_ms_p50": round(latencies[len(latencies) // 2] * 1000, 3),
            "latency_ms_p95": round(latencies[int(len(latencies) * 0.95)] * 1000, 3)}


def tradeoff_curve(priors: Priors, cfg: Config, test: Sequence[Rider], seed: int) -> list[dict]:
    """Operating points of our engine as the step-up threshold is scaled."""
    points = []
    for mult in (0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0):
        swept = replace(cfg, h2=cfg.h2 * mult)
        m = compute_metrics(replay(TrustJuggler(priors, swept), test, seed))
        points.append({"threshold_multiplier": mult, "false_stepup_rate": m["false_stepup_rate"],
                       "false_lockout_rate": m["false_lockout_rate"],
                       "takeover_recall_14d": m["takeover_recall_14d"],
                       "median_sessions_to_detect": m["detection_latency_sessions"]["median"]})
    return points


def run_evaluation(riders: list[Rider], alpha: float = 0.005, seed: int = 0, sweep: bool = True,
                   base: Config | None = None) -> dict:
    priors, cfg, report, prior, calib, test = build_model(riders, alpha, base, seed)
    naive_threshold = calibrate_naive(priors, [(m.archetype, s) for m, s in calib], alpha)

    systems: list[System] = [TrustJuggler(priors, cfg), NaiveAnomaly(priors, naive_threshold),
                             StrictGate(), OpenGate()]
    compare = {s.name: compute_metrics(replay(s, test, seed)) for s in systems}
    result = {
        "dataset": {"riders": len(riders), "sessions": sum(len(s) for _, s in riders),
                    "test_riders": len(test), "test_sessions": sum(len(s) for _, s in test)},
        "calibration": report,
        "naive_threshold": round(naive_threshold, 3),
        "speed": measure_speed(priors, cfg, test),
        "systems": compare,
        "every_login_reference": {"note": "re-verifying on every login means a check on 100% of sessions",
                                  "false_stepup_rate": 1.0, "takeover_recall_14d": 1.0},
    }
    if sweep:
        result["tradeoff_curve"] = tradeoff_curve(priors, cfg, test, seed)
    result["_model"] = (priors, cfg)
    return result


def print_summary(result: dict) -> None:
    print(f"\nDataset: {result['dataset']}")
    print(f"Calibration: {result['calibration']}")
    print(f"Speed: {result['speed']}\n")
    header = f"{'system':<16}{'false step-up':>15}{'false lockout':>15}{'recall 14d':>12}{'median sessions':>17}{'median hours':>14}"
    print(header)
    print("-" * len(header))
    for name, m in result["systems"].items():
        print(f"{name:<16}{m['false_stepup_rate']:>15.4f}{m['false_lockout_rate']:>15.4f}"
              f"{m['takeover_recall_14d']:>12.3f}{str(m['detection_latency_sessions']['median']):>17}"
              f"{str(m['detection_latency_hours']['median']):>14}")
    print("\nShare of riders asked for a selfie check within 21 days (background = riders with no event):")
    for name, m in result["systems"].items():
        print(f"  {name:<16} ordinary life events {m['context_event_rider_friction_21d']:.3f}"
              f"   background {m['background_rider_friction_21d']:.3f}")
    tj = result["systems"]["trust_juggler"]
    print("\nTrust Juggler by life event (rider friction rate / session friction rate):")
    for name, v in tj["life_events"].items():
        print(f"  {name:<18}{v['rider_friction_rate']:>8.3f}{v['session_friction_rate']:>8.4f}   (n={v['riders']})")
    print("\nTrust Juggler by attack (recall / median sessions / median hours):")
    for name, v in tj["attacks"].items():
        print(f"  {name:<18}{v['recall_14d']:>8.3f}{str(v['median_sessions_to_detect']):>8}{str(v['median_hours_to_detect']):>9}   (n={v['accounts']})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate the Trust Juggler engine against baselines")
    parser.add_argument("--riders", type=int, default=1500)
    parser.add_argument("--days", type=int, default=60)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--alpha", type=float, default=0.005)
    parser.add_argument("--data", type=Path, help="evaluate a dataset written by sim.generate instead")
    parser.add_argument("--out", type=Path, default=Path("data/eval"))
    parser.add_argument("--no-sweep", action="store_true")
    args = parser.parse_args()

    riders = list(load_dataset(args.data)) if args.data else list(iter_riders(GenConfig(args.riders, args.days, args.seed)))
    result = run_evaluation(riders, args.alpha, args.seed, sweep=not args.no_sweep)
    priors, cfg = result.pop("_model")
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "metrics.json").write_text(json.dumps(result, indent=2))
    (args.out / "compare.json").write_text(json.dumps(
        {"systems": {k: {m: v[m] for m in ("false_stepup_rate", "false_lockout_rate", "takeover_recall_14d",
                                           "detection_latency_sessions", "detection_latency_hours")}
                     for k, v in result["systems"].items()},
         "tradeoff_curve": result.get("tradeoff_curve", [])}, indent=2))
    save_model(args.out / "model.json", priors, cfg, result["calibration"])
    print_summary(result)
    print(f"\nWrote metrics.json, compare.json, model.json to {args.out}/")


if __name__ == "__main__":
    main()
