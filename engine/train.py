"""Fit priors and calibrate thresholds; save/load the resulting model."""
from __future__ import annotations

import json
from dataclasses import replace
from pathlib import Path
from typing import Sequence

from .calibrate import choose_h2, stepup_rate
from .config import MODEL_VERSION, Config
from .engine import TrustEngine
from .priors import Priors, fit_priors
from .schemas import Session

PRIOR_HISTORY_SESSIONS = 12
DEFAULT_MODEL = Path(__file__).parent / "models" / "default.json"

Rider = tuple[str, Sequence[Session]]  # (archetype, sessions oldest-first)


def train(prior_riders: Sequence[Rider], calib_riders: Sequence[Rider],
          base: Config | None = None, alpha: float | None = None) -> tuple[Priors, Config, dict]:
    """Returns (priors, calibrated config, report)."""
    cfg = replace(base or Config())
    if alpha is not None:
        cfg.alpha = alpha
    priors = fit_priors((a, list(s[:PRIOR_HISTORY_SESSIONS])) for a, s in prior_riders)
    cfg.h2 = choose_h2(priors, cfg, calib_riders, cfg.alpha)
    alerts, total = stepup_rate(priors, cfg, calib_riders, cfg.h2)
    report = {"h2": round(cfg.h2, 3), "alpha": cfg.alpha, "calibration_riders": len(calib_riders),
              "calibration_sessions": total, "calibration_stepups": alerts,
              "calibration_stepup_rate": round(alerts / total, 5) if total else 0.0}
    return priors, cfg, report


def save_model(path: Path, priors: Priors, cfg: Config, report: dict | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"model_version": MODEL_VERSION, "config": cfg.to_dict(),
                                "priors": priors.to_dict(), "report": report or {}}, indent=2))


def load_model(path: Path) -> tuple[Priors, Config]:
    data = json.loads(path.read_text())
    return Priors.from_dict(data["priors"]), Config.from_dict(data["config"])


def load_engine(path: Path) -> TrustEngine:
    priors, cfg = load_model(path)
    return TrustEngine(priors, cfg)


def load_default_engine() -> TrustEngine:
    """Engine with the model shipped in the repo (trained on the synthetic population)."""
    return load_engine(DEFAULT_MODEL)
