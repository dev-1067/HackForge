"""Shared fixtures: one small synthetic population and a model trained on it."""
from dataclasses import dataclass

import pytest

from engine import Config, Priors
from sim.evaluate import build_model
from sim.generate import GenConfig, iter_riders


@dataclass
class Model:
    riders: list
    priors: Priors
    cfg: Config
    report: dict
    calib: list
    test: list


@pytest.fixture(scope="session")
def model() -> Model:
    riders = list(iter_riders(GenConfig(riders=500, days=60, seed=21)))
    priors, cfg, report, _prior, calib, test = build_model(riders, alpha=0.005, seed=21)
    return Model(riders, priors, cfg, report, calib, test)
