import json
import time
from dataclasses import replace

import pytest

from engine import Session, TrustEngine
from engine.profile import STATUS_ACTIVE, STATUS_HELD, STATUS_SUSPENDED


def clean_rider(model):
    """A held-out rider with no scenario at all."""
    return next((m, s) for m, s in model.test if not m.scenario_kind and len(s) > 50)


def warmed_engine(model, meta, sessions, n):
    engine = TrustEngine(model.priors, model.cfg)
    engine.register_rider(meta.rider_id, meta.archetype)
    for rec in sessions[:n]:
        decision = engine.score(rec.to_engine_session())
        if decision.level_index == 2:
            engine.report_stepup(meta.rider_id, True)
    return engine


def test_learning_period_never_escalates(model):
    meta, sessions = clean_rider(model)
    engine = TrustEngine(model.priors, model.cfg)
    for rec in sessions[: model.cfg.min_sessions]:
        decision = engine.score(rec.to_engine_session())
        assert decision.level == "L0"
        assert "learning" in decision.reasons[0]["note"]


def test_honest_riders_rarely_see_friction(model):
    engine = TrustEngine(model.priors, model.cfg)
    scored = flagged = 0
    for meta, sessions in model.test:
        if meta.scenario_kind:
            continue
        engine.register_rider(meta.rider_id, meta.archetype)
        for i, rec in enumerate(sessions):
            decision = engine.score(rec.to_engine_session())
            if i >= 10:
                scored += 1
                flagged += decision.level_index >= 2
            if decision.level_index == 2:
                engine.report_stepup(meta.rider_id, True)
    assert scored > 5000
    assert flagged / scored < 0.01


def test_same_phone_new_person_is_caught(model):
    caught = total = 0
    for meta, sessions in model.test:
        if meta.scenario != "hard_handoff":
            continue
        engine = TrustEngine(model.priors, model.cfg)
        engine.register_rider(meta.rider_id, meta.archetype)
        total += 1
        for rec in sessions:
            decision = engine.score(rec.to_engine_session())
            if rec.gt_actor == "other" and decision.level_index >= 2:
                caught += 1
                break
            if decision.level_index == 2:
                engine.report_stepup(meta.rider_id, True)
    assert total >= 5
    assert caught / total >= 0.8


def test_new_phone_with_same_habits_is_a_life_event(model):
    meta, sessions = clean_rider(model)
    engine = warmed_engine(model, meta, sessions, 40)
    rec = sessions[41]
    new_phone = Session(rec.session_id, meta.rider_id, rec.started_at,
                        {**rec.context, "device_id": "d_brandnew"}, rec.habit)
    decision = engine.score(new_phone)
    assert decision.level == "L0"
    assert decision.action == "allow_learn_context"
    assert decision.context_score >= 0.4
    assert any("new device" in r.get("note", "") for r in decision.reasons)
    # the device is learned: the next session on it is fully familiar
    later = engine.score(Session("x2", meta.rider_id, sessions[42].started_at,
                                 {**sessions[42].context, "device_id": "d_brandnew"}, sessions[42].habit))
    assert later.context_score == 0.0


def test_step_up_ladder(model):
    meta, sessions = clean_rider(model)
    engine = warmed_engine(model, meta, sessions, 20)
    assert engine.report_stepup(meta.rider_id, False) == STATUS_HELD
    assert engine.report_stepup(meta.rider_id, False) == STATUS_SUSPENDED
    assert engine.report_review(meta.rider_id, False) == STATUS_ACTIVE
    assert engine.get_state(meta.rider_id).failed_stepups == 0
    assert engine.report_review(meta.rider_id, True) == STATUS_SUSPENDED


def test_held_account_stays_held_until_reviewed(model):
    meta, sessions = clean_rider(model)
    engine = warmed_engine(model, meta, sessions, 20)
    engine.report_stepup(meta.rider_id, False)
    assert engine.score(sessions[21].to_engine_session()).level == "L3"
    engine.report_review(meta.rider_id, False)
    assert engine.score(sessions[22].to_engine_session()).level_index <= 1


def test_unknown_rider_outcomes_raise(model):
    engine = TrustEngine(model.priors, model.cfg)
    with pytest.raises(KeyError):
        engine.report_stepup("nobody", True)
    with pytest.raises(KeyError):
        engine.report_review("nobody", False)


def test_unknown_rider_is_registered_on_first_session(model):
    meta, sessions = clean_rider(model)
    engine = TrustEngine(model.priors, model.cfg)
    assert engine.rider_summary(meta.rider_id) is None
    engine.score(sessions[0].to_engine_session())
    assert engine.rider_summary(meta.rider_id)["sessions_seen"] == 1


def test_state_survives_json_round_trip(model):
    meta, sessions = clean_rider(model)
    original = warmed_engine(model, meta, sessions, 40)
    restored = TrustEngine(model.priors, model.cfg)
    restored.load_state(json.loads(json.dumps(original.export_state(meta.rider_id))))
    for rec in sessions[40:50]:
        a = original.score(rec.to_engine_session())
        b = restored.score(rec.to_engine_session())
        assert (a.level, a.evidence_score, a.context_score) == (b.level, b.evidence_score, b.context_score)


def test_scoring_is_deterministic(model):
    meta, sessions = clean_rider(model)
    runs = []
    for _ in range(2):
        engine = TrustEngine(model.priors, model.cfg)
        runs.append([engine.score(r.to_engine_session()).to_dict() for r in sessions[:30]])
    assert runs[0] == runs[1]


def test_decision_payload_shape(model):
    meta, sessions = clean_rider(model)
    engine = TrustEngine(model.priors, model.cfg)
    payload = engine.score(sessions[0].to_engine_session()).to_dict()
    assert set(payload) == {"session_id", "rider_id", "level", "action", "status", "context_score",
                            "habit_score", "evidence_score", "threshold", "habit_deviation",
                            "reasons", "model_version"}
    json.dumps(payload)


def test_enrollment_builds_a_baseline(model):
    meta, sessions = clean_rider(model)
    engine = TrustEngine(model.priors, model.cfg)
    engine.register_rider(meta.rider_id, meta.archetype, enrollment=[s.to_engine_session() for s in sessions[:30]])
    summary = engine.rider_summary(meta.rider_id)
    assert summary["sessions_seen"] == 30 and summary["last_seen"] is not None
    assert summary["known_devices"] == 1 and summary["baseline"]["avg_speed_kmh"] > 0
    assert engine.score(sessions[30].to_engine_session()).level_index == 0


def test_device_shared_across_accounts_raises_context_score(model):
    shared = "d_shared_phone"
    riders = [(m, s) for m, s in model.test if not m.scenario_kind][:5]
    engine = TrustEngine(model.priors, replace(model.cfg))
    for meta, sessions in riders[:4]:
        engine.register_rider(meta.rider_id, meta.archetype)
        for rec in sessions[:8]:
            engine.score(Session(rec.session_id, meta.rider_id, rec.started_at,
                                 {**rec.context, "device_id": shared}, rec.habit))
    meta, sessions = riders[4]
    engine.register_rider(meta.rider_id, meta.archetype)
    for rec in sessions[:8]:
        engine.score(rec.to_engine_session())
    rec = sessions[8]
    decision = engine.score(Session(rec.session_id, meta.rider_id, rec.started_at,
                                    {**rec.context, "device_id": shared}, rec.habit))
    assert any("shared" in r.get("note", "") for r in decision.reasons)
    assert decision.context_score >= model.cfg.c_device + model.cfg.c_shared_device - 1e-9


def test_single_wild_session_does_not_hard_block(model):
    meta, sessions = clean_rider(model)
    engine = warmed_engine(model, meta, sessions, 40)
    rec = sessions[41]
    wild = {k: v * 3.0 for k, v in rec.habit.items()}
    decision = engine.score(Session("wild", meta.rider_id, rec.started_at, rec.context, wild))
    assert decision.level_index <= 2


def test_scoring_speed(model):
    meta, sessions = clean_rider(model)
    engine = TrustEngine(model.priors, model.cfg)
    engine.register_rider(meta.rider_id, meta.archetype)
    batch = [r.to_engine_session() for r in sessions] * 10
    started = time.perf_counter()
    for session in batch:
        engine.score_session(engine.get_state(meta.rider_id), session)
    rate = len(batch) / (time.perf_counter() - started)
    assert rate > 1000


def test_shipped_default_model_loads_and_scores():
    from engine import load_default_engine
    engine = load_default_engine()
    assert engine.cfg.h2 > engine.cfg.null_level
    from engine.features import HABIT_FEATURES
    session = Session.from_dict({
        "rider_id": "R-new", "started_at": "2026-03-01T09:00:00",
        "habit": {f: 1.0 for f in HABIT_FEATURES}})
    decision = engine.score(session)
    assert decision.level == "L0" and decision.model_version
