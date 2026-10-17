import math

import pytest

from engine.features import HABIT_FEATURES
from engine.schemas import Session


def payload(**overrides):
    base = {
        "session_id": "S1", "rider_id": "R1", "started_at": "2026-03-01T18:04:11Z",
        "context": {"device_id": "d_1", "city": "Pune"},
        "habit": {name: 1.0 for name in HABIT_FEATURES},
    }
    base.update(overrides)
    return base


def test_valid_payload_parses_and_fills_missing_context():
    session = Session.from_dict(payload())
    assert session.rider_id == "R1"
    assert session.context["device_id"] == "d_1"
    assert session.context["zone"] == "unknown"
    assert math.isclose(session.local_hour, 18 + 4 / 60)


def test_session_id_defaults_when_omitted():
    data = payload()
    del data["session_id"]
    assert Session.from_dict(data).session_id.startswith("R1@")


@pytest.mark.parametrize("missing", ["rider_id", "started_at", "habit"])
def test_missing_required_field(missing):
    data = payload()
    del data[missing]
    with pytest.raises(ValueError, match=missing):
        Session.from_dict(data)


def test_missing_habit_feature():
    data = payload()
    del data["habit"]["swipe_speed"]
    with pytest.raises(ValueError, match="swipe_speed"):
        Session.from_dict(data)


@pytest.mark.parametrize("bad", [float("nan"), float("inf"), "abc", None])
def test_non_finite_or_non_numeric_habit(bad):
    data = payload()
    data["habit"]["accept_rate"] = bad
    with pytest.raises(ValueError):
        Session.from_dict(data)


def test_bad_timestamp():
    with pytest.raises(ValueError, match="ISO-8601"):
        Session.from_dict(payload(started_at="yesterday-ish"))
