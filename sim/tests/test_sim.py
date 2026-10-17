import json
from datetime import timedelta

import pytest

from engine.features import HABIT_FEATURES
from sim.effects import ATTACKS, LIFE_EVENTS, SCENARIOS
from sim.generate import GenConfig, iter_riders, load_dataset, write_dataset
from sim.live import LiveWorld


def small(seed=5, riders=60):
    return list(iter_riders(GenConfig(riders=riders, days=60, seed=seed)))


def test_same_seed_same_dataset():
    a, b = small(), small()
    assert [s.to_payload() for _, ss in a for s in ss] == [s.to_payload() for _, ss in b for s in ss]


def test_different_seed_different_dataset():
    assert small(1)[0][1][0].habit != small(2)[0][1][0].habit


def test_payload_contains_no_ground_truth():
    record = small()[0][1][0]
    payload = record.to_payload()
    assert not any(k.startswith("gt") for k in payload)
    assert set(payload["habit"]) == set(HABIT_FEATURES)
    json.dumps(payload)


def test_sessions_are_time_ordered_and_ids_unique():
    for _, sessions in small():
        times = [s.started_at for s in sessions]
        assert times == sorted(times)
    ids = [s.session_id for _, ss in small() for s in ss]
    assert len(ids) == len(set(ids))


def test_history_before_scenario_is_clean():
    for meta, sessions in small(riders=200):
        if not meta.scenario_kind:
            assert all(s.gt_label == "honest" and not s.gt_event and not s.gt_attack for s in sessions)
            continue
        before = [s for s in sessions if s.day < meta.scenario_day]
        assert len(before) >= 15
        assert all(s.gt_label == "honest" and s.gt_actor == "owner" for s in before)


def test_attacker_sessions_only_after_attack_starts():
    for meta, sessions in small(riders=200):
        others = [s for s in sessions if s.gt_actor == "other"]
        if meta.scenario_kind != "attack":
            assert not others
            continue
        assert others, meta.scenario
        assert all(s.day >= meta.scenario_day for s in others)
        assert all(s.gt_label == f"attack:{meta.scenario}" for s in others)


def test_hard_handoff_and_credential_theft_replace_everyone_after_start():
    for meta, sessions in small(riders=300):
        if meta.scenario in ("hard_handoff", "credential_theft", "fleet_farming"):
            after = [s for s in sessions if s.day >= meta.scenario_day]
            assert all(s.gt_actor == "other" for s in after)


def test_credential_theft_changes_device_and_city():
    for meta, sessions in small(riders=300):
        if meta.scenario == "credential_theft":
            before = next(s for s in sessions if s.day < meta.scenario_day)
            after = next(s for s in sessions if s.day >= meta.scenario_day)
            assert before.context["device_id"] != after.context["device_id"]
            assert before.context["city"] != after.context["city"]
            return
    pytest.fail("no credential_theft rider in the sample")


def test_hard_handoff_keeps_device_and_city():
    for meta, sessions in small(riders=300):
        if meta.scenario == "hard_handoff":
            assert len({s.context["device_id"] for s in sessions}) == 1
            assert len({s.context["city"] for s in sessions}) == 1
            return
    pytest.fail("no hard_handoff rider in the sample")


def test_life_events_change_the_expected_context():
    wanted = {"new_phone": "device_id", "moved_city": "city", "network_change": "ip_asn"}
    seen = set()
    for meta, sessions in small(riders=400):
        field = wanted.get(meta.scenario)
        if not field:
            continue
        before = {s.context[field] for s in sessions if s.day < meta.scenario_day}
        after = {s.context[field] for s in sessions if s.day >= meta.scenario_day}
        assert not before & after or meta.scenario == "network_change"
        seen.add(meta.scenario)
    assert seen == set(wanted)


def test_vacation_gap_leaves_a_hole_in_the_timeline():
    for meta, sessions in small(riders=400):
        if meta.scenario == "vacation_gap":
            days = sorted({s.day for s in sessions})
            gaps = [b - a for a, b in zip(days, days[1:])]
            assert max(gaps) >= 10
            return
    pytest.fail("no vacation_gap rider in the sample")


def test_every_scenario_is_generated_for_a_big_enough_population():
    seen = {meta.scenario for meta, _ in small(riders=600) if meta.scenario}
    assert seen == set(SCENARIOS)


def test_fleet_accounts_share_a_device_and_persona():
    fleet = [(m, s) for m, s in small(riders=800) if m.scenario == "fleet_farming"]
    assert len(fleet) >= 4
    devices = {}
    for meta, sessions in fleet:
        after = next(s for s in sessions if s.day >= meta.scenario_day)
        devices.setdefault(after.context["device_id"], []).append(meta.rider_id)
    assert max(len(v) for v in devices.values()) >= 2


def test_values_stay_in_physical_limits():
    for _, sessions in small():
        for s in sessions:
            assert 0.0 <= s.habit["cancel_rate"] <= 0.6 and 0.05 <= s.habit["accept_rate"] <= 1.0
            assert s.habit["accept_latency_ms"] > 0 and s.habit["avg_speed_kmh"] >= 3


@pytest.mark.parametrize("kwargs", [dict(riders=0), dict(days=10), dict(event_frac=0.8, attack_frac=0.5),
                                    dict(event_frac=-0.1)])
def test_bad_generator_config_is_rejected(kwargs):
    with pytest.raises(ValueError):
        list(iter_riders(GenConfig(**kwargs)))


def test_csv_round_trip(tmp_path):
    cfg = GenConfig(riders=12, days=45, seed=3)
    riders, sessions = write_dataset(cfg, tmp_path)
    loaded = list(load_dataset(tmp_path))
    assert riders == 12 and sum(len(s) for _, s in loaded) == sessions
    original = {m.rider_id: ss for m, ss in iter_riders(cfg)}
    for meta, got in loaded:
        want = original[meta.rider_id]
        assert [g.session_id for g in got] == [w.session_id for w in want]
        assert got[0].context == want[0].context
        assert abs(got[0].habit["avg_speed_kmh"] - want[0].habit["avg_speed_kmh"]) < 1e-3
        assert got[-1].gt_label == want[-1].gt_label


# ---------------------------------------------------------------- live world
def test_live_world_catalog_lists_every_scenario():
    names = {entry["name"] for entry in LiveWorld.catalog()}
    assert names == set(LIFE_EVENTS) | set(ATTACKS)
    assert all(entry["title"] and entry["description"] for entry in LiveWorld.catalog())


def test_live_world_history_and_next_session():
    world = LiveWorld(n_riders=6, seed=2, history_days=30)
    rid = world.rider_ids[0]
    assert len(world.history[rid]) > 20
    last_hist = max(s.started_at for s in world.history[rid])
    nxt = world.next_session(rid)
    assert nxt.started_at > last_hist
    assert nxt.session_id not in {s.session_id for s in world.history[rid]}
    assert world.next_session().rider_id in world.rider_ids


def test_live_world_trigger_changes_the_next_sessions():
    world = LiveWorld(n_riders=4, seed=2, history_days=30)
    rid = world.rider_ids[1]
    assert all(world.next_session(rid).gt_actor == "owner" for _ in range(3))
    info = world.trigger(rid, "hard_handoff")
    assert info["kind"] == "attack"
    after = [world.next_session(rid) for _ in range(4)]
    assert all(r.gt_actor == "other" and r.gt_label == "attack:hard_handoff" for r in after)
    assert world.meta[rid].scenario == "hard_handoff"


def test_live_world_life_event_keeps_owner():
    world = LiveWorld(n_riders=3, seed=4, history_days=30)
    rid = world.rider_ids[0]
    before = world.next_session(rid).context["device_id"]
    world.trigger(rid, "new_phone")
    after = world.next_session(rid)
    assert after.gt_actor == "owner" and after.gt_label == "life_event:new_phone"
    assert after.context["device_id"] != before


def test_live_world_rejects_bad_input():
    world = LiveWorld(n_riders=2, seed=1, history_days=5)
    with pytest.raises(ValueError):
        world.trigger(world.rider_ids[0], "teleport")
    with pytest.raises(ValueError):
        world.trigger("R99999", "new_phone")
    with pytest.raises(ValueError):
        world.next_session("R99999")
    with pytest.raises(ValueError):
        LiveWorld(n_riders=0)


def test_live_world_vacation_skips_days():
    world = LiveWorld(n_riders=2, seed=6, history_days=30)
    rid = world.rider_ids[0]
    last = world.next_session(rid)
    world.trigger(rid, "vacation_gap")
    back = world.next_session(rid)
    assert back.started_at - last.started_at >= timedelta(days=10)
