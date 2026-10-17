"""One-shot model builder for the backend: ``python -m sim.quickstart --out model/model.json``.

Generates a synthetic population, fits priors, calibrates thresholds and saves the model.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from engine import TrustEngine
from engine.train import load_engine, save_model

from .evaluate import build_model
from .generate import GenConfig, iter_riders
from .live import LiveWorld


def train_default_model(path: Path, riders: int = 1200, days: int = 60, seed: int = 7, alpha: float = 0.005) -> dict:
    population = list(iter_riders(GenConfig(riders, days, seed)))
    priors, cfg, report, *_ = build_model(population, alpha, seed=seed)
    save_model(path, priors, cfg, report)
    return report


def warm_engine(engine: TrustEngine, world: LiveWorld) -> None:
    """Enroll every simulated rider's history so the live demo starts with known baselines."""
    for rider_id, sessions in world.history.items():
        engine.register_rider(rider_id, world.meta[rider_id].archetype,
                              enrollment=[s.to_engine_session() for s in sessions])


def load_or_train(path: Path, **kwargs) -> TrustEngine:
    if not path.exists():
        train_default_model(path, **kwargs)
    return load_engine(path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train and save the default Trust Juggler model")
    parser.add_argument("--out", type=Path, default=Path("model/model.json"))
    parser.add_argument("--riders", type=int, default=1200)
    parser.add_argument("--days", type=int, default=60)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--alpha", type=float, default=0.005)
    args = parser.parse_args()
    report = train_default_model(args.out, args.riders, args.days, args.seed, args.alpha)
    print(f"saved {args.out}: {report}")


if __name__ == "__main__":
    main()
