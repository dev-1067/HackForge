from datetime import datetime, timedelta

from engine import Config
from engine.train import load_engine, save_model
from sim.evaluate import Outcome, compute_metrics, replay, run_evaluation
from sim.baselines import OpenGate, StrictGate, TrustJuggler
from sim.quickstart import load_or_train
from sim.records import SessionRecord


def test_end_to_end_beats_the_baselines(model):
    result = run_evaluation(model.riders, alpha=0.005, seed=21, sweep=False)
    tj = result["systems"]["trust_juggler"]
    strict = result["systems"]["strict_gate"]
    open_gate = result["systems"]["open_gate"]
    assert tj["takeover_recall_14d"] >= 0.9
    assert tj["false_lockout_rate"] <= 0.005
    assert tj["false_stepup_rate"] <= 0.02
    assert open_gate["takeover_recall_14d"] == 0.0
    assert strict["takeover_recall_14d"] < tj["takeover_recall_14d"]
    assert strict["context_event_rider_friction_21d"] > tj["context_event_rider_friction_21d"]
    assert tj["detection_latency_sessions"]["median"] <= 5
    assert result["calibration"]["calibration_stepup_rate"] <= 0.005


def test_tradeoff_curve_is_monotone_in_the_threshold(model):
    result = run_evaluation(model.riders, alpha=0.005, seed=21, sweep=True)
    curve = result["tradeoff_curve"]
    assert len(curve) >= 5
    recalls = [p["takeover_recall_14d"] for p in curve]
    stepups = [p["false_stepup_rate"] for p in curve]
    assert recalls[0] >= recalls[-1]
    assert stepups[0] >= stepups[-1]


def test_open_and_strict_gate_behaviour(model):
    meta, sessions = next((m, s) for m, s in model.test if m.scenario == "hard_handoff")
    open_levels = [o.level for o in replay(OpenGate(), [(meta, sessions)])[meta.rider_id]]
    assert set(open_levels) == {0}
    strict_levels = [o.level for o in replay(StrictGate(), [(meta, sessions)])[meta.rider_id]]
    assert set(strict_levels) == {0}  # same phone, same city: the strict gate is blind to it


def test_replay_stops_once_an_impostor_is_blocked(model):
    meta, sessions = next((m, s) for m, s in model.test if m.scenario == "credential_theft")
    outcomes = replay(TrustJuggler(model.priors, model.cfg), [(meta, sessions)], seed=1)[meta.rider_id]
    assert len(outcomes) < len(sessions)
    assert outcomes[-1].record.gt_actor == "other"


def make_record(day, actor, attack="hard_handoff", hours=0):
    started = datetime(2026, 2, 1) + timedelta(days=day, hours=hours)
    return SessionRecord(f"s{day}-{hours}", "R1", started, day, 0, {}, {}, gt_actor=actor,
                         gt_label="honest" if actor == "owner" else f"attack:{attack}",
                         gt_attack=attack, gt_attack_day=30)


def test_compute_metrics_on_a_hand_built_rider():
    outcomes = [Outcome(0, make_record(d, "owner")) for d in range(12)]
    outcomes += [Outcome(0, make_record(31, "other", hours=1)),
                 Outcome(0, make_record(31, "other", hours=5)),
                 Outcome(2, make_record(32, "other"))]
    m = compute_metrics({"R1": outcomes})
    assert m["attacked_accounts"] == 1 and m["takeover_recall_14d"] == 1.0
    assert m["detection_latency_sessions"]["median"] == 3.0
    assert m["detection_latency_hours"]["median"] == 23.0   # day 32 00:00 vs day 31 01:00
    assert m["false_stepup_rate"] == 0.0


def test_late_detection_does_not_count_as_recall():
    outcomes = [Outcome(0, make_record(d, "owner")) for d in range(12)]
    outcomes += [Outcome(0, make_record(31, "other")), Outcome(2, make_record(60, "other"))]
    assert compute_metrics({"R1": outcomes})["takeover_recall_14d"] == 0.0


def test_friction_on_owner_is_counted():
    outcomes = [Outcome(0, make_record(d, "owner")) for d in range(11)]
    outcomes += [Outcome(2, make_record(12, "owner")), Outcome(3, make_record(13, "owner"))]
    m = compute_metrics({"R1": outcomes})
    assert m["honest_sessions"] == 3
    assert m["false_stepup_rate"] == round(2 / 3, 5)
    assert m["false_lockout_rate"] == round(1 / 3, 5)


def test_model_save_and_load_gives_identical_decisions(model, tmp_path):
    path = tmp_path / "m.json"
    save_model(path, model.priors, model.cfg, model.report)
    loaded = load_engine(path)
    meta, sessions = model.test[0]
    from engine import TrustEngine
    fresh = TrustEngine(model.priors, model.cfg)
    for rec in sessions[:25]:
        assert loaded.score(rec.to_engine_session()).to_dict() == fresh.score(rec.to_engine_session()).to_dict()


def test_load_or_train_creates_then_reuses_the_model(tmp_path):
    path = tmp_path / "model" / "model.json"
    engine = load_or_train(path, riders=250, days=45, seed=2)
    assert path.exists() and isinstance(engine.cfg, Config)
    modified = path.stat().st_mtime_ns
    load_or_train(path, riders=250, days=45, seed=2)
    assert path.stat().st_mtime_ns == modified
