"""Evidence accumulation across sessions (multivariate EWMA).

A rented or handed-off account differs from its owner in the *same direction* every
session. Averaging each feature's z-score over recent sessions lets that persistent
shift add up while ordinary session-to-session noise cancels out, so a quiet handoff
that never trips a single-session threshold is still caught within a few logins.

Under the honest null the statistic has mean ~1; a persistent shift of d sigma in
every feature drives it towards d^2 * (2 - lam) / lam.
"""
from __future__ import annotations

from typing import Sequence

from .config import Config
from .features import DEVICE_FEATURES, ENVIRONMENT_FEATURES, PERSONA_FEATURES


def feature_weights(cfg: Config) -> list[float]:
    """Weights aligned with SCORED_FEATURES (persona, login_hour, environment, device)."""
    return ([cfg.w_persona] * len(PERSONA_FEATURES) + [cfg.w_hour]
            + [cfg.w_environment] * len(ENVIRONMENT_FEATURES) + [cfg.w_device] * len(DEVICE_FEATURES))


def clip_z(z: float, cap: float) -> float:
    return max(-cap, min(cap, z))


def update_mewma(mew: list[float], z: Sequence[float], lam: float) -> None:
    for i, value in enumerate(z):
        mew[i] = (1.0 - lam) * mew[i] + lam * value


def mewma_statistic(mew: Sequence[float], weights: Sequence[float], lam: float) -> float:
    total = sum(w * m * m for w, m in zip(weights, mew))
    return total * (2.0 - lam) / lam / sum(weights)
