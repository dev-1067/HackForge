import pytest

from engine.priors import DEFAULT_COHORT, Priors, fit_priors
from engine.features import HOUR_FEATURE, SCORED_FEATURES


def histories(model, count=60):
    return [(m.archetype, [s.to_engine_session() for s in sessions[:12]]) for m, sessions in model.riders[:count]]


def test_fit_priors_covers_every_scored_feature(model):
    priors = fit_priors(histories(model))
    cohort = priors.for_archetype(DEFAULT_COHORT)
    assert set(cohort) == set(SCORED_FEATURES)
    assert all(p.within_var > 0 and p.between_var >= 0 for p in cohort.values())
    assert 0 <= cohort[HOUR_FEATURE].mean < 24


def test_unknown_archetype_falls_back_to_default(model):
    priors = fit_priors(histories(model))
    assert priors.for_archetype("hovercraft") is priors.cohorts[DEFAULT_COHORT]


def test_priors_round_trip(model):
    priors = fit_priors(histories(model))
    again = Priors.from_dict(priors.to_dict())
    assert again.to_dict() == priors.to_dict()


def test_needs_enough_riders():
    with pytest.raises(ValueError):
        fit_priors([])


def test_short_histories_are_ignored(model):
    short = [(m.archetype, [s.to_engine_session() for s in sessions[:3]]) for m, sessions in model.riders[:20]]
    with pytest.raises(ValueError):
        fit_priors(short)
