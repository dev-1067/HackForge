import copy
import json
import threading

import pytest
from fastapi.testclient import TestClient

from api.tests.conftest import lab_payloads

RIDER = "R00003"


def score(client, payload):
    return client.post("/sessions/score", json=payload)


def test_health_and_openapi(client):
    assert client.get("/health").json() == {"status": "ok"}
    paths = set(client.get("/openapi.json").json()["paths"])
    assert {"/sessions/score", "/riders/{rider_id}", "/riders/{rider_id}/timeline", "/decisions",
            "/decisions/{decision_id}/review", "/stepup/{rider_id}/result", "/stream",
            "/metrics/summary", "/metrics/compare", "/lab/scenario", "/lab/run"} <= paths


def test_score_a_normal_session(client):
    payload = lab_payloads(client, RIDER, 1)[0]
    response = score(client, payload)
    assert response.status_code == 200
    body = response.json()
    assert body["level"] == "L0" and body["rider_id"] == RIDER and body["decision_id"] > 0
    assert body["reasons"] and body["model_version"]
    assert client.get(f"/decisions/{body['decision_id']}").json()["session_id"] == payload["session_id"]


def test_score_registers_an_unknown_rider(client):
    payload = copy.deepcopy(lab_payloads(client, RIDER, 1)[0])
    payload.update(rider_id="R-brand-new", session_id="x1", archetype="car_day")
    assert score(client, payload).status_code == 200
    rider = client.get("/riders/R-brand-new").json()
    assert rider["archetype"] == "car_day" and rider["sessions_seen"] == 1


def test_duplicate_session_is_rejected_without_side_effects(client):
    payload = lab_payloads(client, RIDER, 1)[0]
    assert score(client, payload).status_code == 200
    before = client.get(f"/riders/{RIDER}").json()["sessions_seen"]
    assert score(client, payload).status_code == 409
    assert client.get(f"/riders/{RIDER}").json()["sessions_seen"] == before


@pytest.mark.parametrize("mutate", [
    lambda p: p["habit"].pop("swipe_speed"),
    lambda p: p["habit"].update(accept_rate="fast"),
    lambda p: p.update(started_at="whenever"),
    lambda p: p.pop("rider_id"),
    lambda p: p.pop("habit"),
])
def test_bad_payloads_are_422(client, mutate):
    payload = copy.deepcopy(lab_payloads(client, RIDER, 1)[0])
    mutate(payload)
    assert score(client, payload).status_code == 422


def test_non_finite_habit_is_rejected(client):
    payload = copy.deepcopy(lab_payloads(client, RIDER, 1)[0])
    payload["habit"]["accept_rate"] = "__INF__"
    raw = json.dumps(payload).replace('"__INF__"', "Infinity")
    response = client.post("/sessions/score", content=raw, headers={"content-type": "application/json"})
    assert response.status_code == 422


def test_rider_endpoints(client):
    listing = client.get("/riders").json()
    assert len(listing) == 10 and {"rider_id", "status", "sessions_seen", "last_level"} <= set(listing[0])
    assert len(client.get("/riders?limit=3").json()) == 3
    assert client.get("/riders?q=R0000").json()
    assert client.get("/riders?status=suspended").json() == []
    detail = client.get(f"/riders/{RIDER}").json()
    assert detail["status"] == "active" and detail["baseline"]["avg_speed_kmh"] > 0
    assert set(detail["level_counts"]) == {"L0", "L1", "L2", "L3", "L4"}
    assert client.get("/riders/nobody").status_code == 404
    assert client.get("/riders/nobody/timeline").status_code == 404


def test_timeline_is_chronological_and_complete(client):
    for payload in lab_payloads(client, RIDER, 3):
        score(client, payload)
    timeline = client.get(f"/riders/{RIDER}/timeline?limit=1000").json()
    assert len(timeline) > 20
    assert [t["started_at"] for t in timeline] == sorted(t["started_at"] for t in timeline)
    assert {"level", "evidence_score", "threshold", "context_flags", "city", "device_id"} <= set(timeline[-1])
    assert len(client.get(f"/riders/{RIDER}/timeline?limit=5").json()) == 5


def run_takeover(client, rider=RIDER):
    """Hand the account over, then send sessions until the engine asks for a step-up."""
    client.app.state.lab.world.trigger(rider, "hard_handoff")
    for payload in lab_payloads(client, rider, 12):
        body = score(client, payload).json()
        if body["level"] != "L0" and body["level"] != "L1":
            return body
    raise AssertionError("the takeover was never escalated")


def test_takeover_step_up_and_hold(client):
    body = run_takeover(client)
    assert body["level"] == "L2" and body["action"] == "step_up_selfie" and body["status"] == "pending_stepup"
    assert client.get(f"/riders/{RIDER}").json()["status"] == "pending_stepup"
    assert client.get("/metrics/summary").json()["open_stepups"] == 1

    failed = client.post(f"/stepup/{RIDER}/result", json={"passed": False})
    assert failed.status_code == 200 and failed.json()["status"] == "held"
    nxt = score(client, lab_payloads(client, RIDER, 1)[0]).json()
    assert nxt["level"] == "L3" and nxt["action"] == "hold_payouts_review"

    queue = client.get("/decisions?unreviewed=true&min_level=2").json()
    assert queue and all(d["review_verdict"] is None for d in queue)
    review = client.post(f"/decisions/{nxt['decision_id']}/review",
                         json={"takeover_confirmed": True, "reviewer": "asha"}).json()
    assert review["status"] == "suspended" and review["decisions_closed"] >= 2
    assert client.get("/decisions?unreviewed=true&min_level=2").json() == []
    assert client.get(f"/decisions/{nxt['decision_id']}").json()["review_verdict"] == "confirmed_takeover"
    audit = client.get(f"/riders/{RIDER}/audit").json()
    assert {"stepup_failed", "review_confirmed_takeover"} <= {a["action"] for a in audit}


def test_passing_the_step_up_clears_the_flag(client):
    run_takeover(client)
    passed = client.post(f"/stepup/{RIDER}/result", json={"passed": True, "method": "liveness"}).json()
    assert passed["status"] == "active"
    assert client.get(f"/riders/{RIDER}").json()["status"] == "active"
    assert client.get("/metrics/summary").json()["open_stepups"] == 0


def test_dismissing_a_hold_reactivates_the_rider(client):
    body = run_takeover(client)
    client.post(f"/stepup/{RIDER}/result", json={"passed": False})
    review = client.post(f"/decisions/{body['decision_id']}/review", json={"takeover_confirmed": False}).json()
    assert review["verdict"] == "dismissed" and review["status"] == "active"


def test_state_machine_conflicts(client):
    assert client.post(f"/stepup/{RIDER}/result", json={"passed": True}).status_code == 409   # nothing pending
    assert client.post("/stepup/nobody/result", json={"passed": True}).status_code == 404
    decision_id = client.get("/decisions?limit=1").json()[0]["decision_id"]
    assert client.post(f"/decisions/{decision_id}/review", json={"takeover_confirmed": True}).status_code == 409
    assert client.post("/decisions/999999/review", json={"takeover_confirmed": True}).status_code == 404
    assert client.get("/decisions/999999").status_code == 404


def test_decision_filters(client):
    assert client.get("/decisions?level=L9").status_code == 422
    assert client.get("/decisions?limit=0").status_code == 422
    assert len(client.get("/decisions?limit=5").json()) == 5
    ids = [d["decision_id"] for d in client.get("/decisions?limit=20").json()]
    assert ids == sorted(ids, reverse=True)
    assert all(d["level"] == "L0" for d in client.get("/decisions?level=L0&limit=10").json())
    assert client.get(f"/decisions?rider_id={RIDER}&limit=5").json()[0]["rider_id"] == RIDER


def test_metrics_summary_and_compare(client):
    run_takeover(client)
    summary = client.get("/metrics/summary").json()
    assert summary["sessions_scored"] > 200 and summary["level_counts"]["L2"] >= 1
    assert summary["pending_reviews"] >= 1 and summary["accounts_under_watch"] >= 1
    sim = summary["simulation"]
    assert sim["honest_sessions"] > 200 and sim["false_lockout_rate"] == 0.0
    compare = client.get("/metrics/compare").json()
    assert set(compare["systems"]) == {"trust_juggler", "naive_anomaly", "strict_gate", "open_gate"}
    assert len(compare["tradeoff_curve"]) >= 5


def test_compare_is_404_when_the_file_is_missing(settings, tmp_path):
    from fastapi.testclient import TestClient
    from api.main import create_app
    settings.compare_path = tmp_path / "nope.json"
    settings.lab_enabled = False
    from api.seed import DEMO_COMPANY_EMAIL
    from api.tests.conftest import sign_in
    with TestClient(create_app(settings)) as c:
        sign_in(c, "company", DEMO_COMPANY_EMAIL)
        assert c.get("/metrics/compare").status_code == 404


# ---------------------------------------------------------------------- lab
def test_lab_catalog_and_state(client):
    catalog = client.get("/lab/scenarios").json()
    assert len(catalog) == 14 and {c["kind"] for c in catalog} == {"life_event", "attack"}
    state = client.get("/lab/state").json()
    assert state["riders"] == 10 and state["running"] is False and state["blocked"] == []


def test_lab_trigger_a_takeover_and_see_it_caught(client):
    out = client.post("/lab/scenario", json={"rider_id": RIDER, "scenario": "hard_handoff", "steps": 10}).json()
    assert out["triggered"]["kind"] == "attack"
    levels = [d["level"] for d in out["decisions"]]
    assert any(lv in ("L2", "L3", "L4") for lv in levels)
    assert all(d["ground_truth"]["actor"] == "other" for d in out["decisions"])
    assert RIDER in client.get("/lab/state").json()["blocked"]
    sim = client.get("/metrics/summary").json()["simulation"]
    assert sim["impostor_accounts_flagged"] == 1 and sim["median_sessions_to_detect"] <= 6


def test_lab_new_phone_is_not_a_problem(client):
    out = client.post("/lab/scenario", json={"rider_id": "R00005", "scenario": "new_phone", "steps": 6}).json()
    assert out["decisions"][0]["context_flags"] and out["decisions"][0]["level"] == "L0"
    assert client.get("/riders/R00005").json()["status"] in ("active", "watch")


def test_lab_without_auto_resolve_leaves_the_step_up_pending(client):
    client.post("/lab/scenario", json={"rider_id": RIDER, "scenario": "hard_handoff"})
    for _ in range(12):
        out = client.post("/lab/step", json={"rider_id": RIDER, "auto_resolve": False}).json()[0]
        assert out["resolution"] is None
        if out["level"] == "L2":
            break
    assert client.get(f"/riders/{RIDER}").json()["status"] == "pending_stepup"


def test_lab_errors(client):
    assert client.post("/lab/scenario", json={"rider_id": RIDER, "scenario": "teleport"}).status_code == 422
    assert client.post("/lab/scenario", json={"rider_id": "R99999", "scenario": "new_phone"}).status_code == 404
    assert client.post("/lab/step", json={"rider_id": "R99999"}).status_code == 404
    assert client.post("/lab/step", json={"count": 0}).status_code == 422
    assert client.post("/lab/run", json={"action": "start", "rate": 0}).status_code == 422
    assert client.post("/lab/run", json={"action": "pause"}).status_code == 422


def test_lab_step_random_riders(client):
    out = client.post("/lab/step", json={"count": 15}).json()
    assert len(out) == 15 and len({d["rider_id"] for d in out}) > 1
    assert client.get("/lab/state").json()["generated"] == 15


def test_lab_background_run(client):
    assert client.post("/lab/run", json={"action": "start", "rate": 100}).json()["running"] is True
    import time
    time.sleep(0.6)
    state = client.post("/lab/run", json={"action": "stop"}).json()
    assert state["running"] is False and state["generated"] >= 5
    generated = state["generated"]
    time.sleep(0.2)
    assert client.get("/lab/state").json()["generated"] <= generated + 1


def test_lab_reset_restores_a_clean_world(client):
    client.post("/lab/scenario", json={"rider_id": RIDER, "scenario": "hard_handoff", "steps": 8})
    assert client.get("/lab/state").json()["blocked"]
    state = client.post("/lab/reset").json()
    assert state["blocked"] == [] and state["generated"] == 0 and state["active_scenarios"] == {}
    summary = client.get("/metrics/summary").json()
    assert summary["simulation"]["impostor_accounts"] == 0
    assert client.get(f"/riders/{RIDER}").json()["status"] == "active"


def test_concurrent_scoring_is_safe(settings, tmp_path):
    from api.main import create_app
    from api.seed import DEMO_COMPANY_EMAIL
    from api.tests.conftest import sign_in
    settings.database_url = f"sqlite:///{tmp_path}/concurrent.db"
    with TestClient(create_app(settings)) as client:
        sign_in(client, "company", DEMO_COMPANY_EMAIL)
        run_concurrent_scoring(client)


def run_concurrent_scoring(client):
    payloads = {r: lab_payloads(client, r, 6) for r in ("R00001", "R00002", "R00004", "R00006")}
    before = {r: client.get(f"/riders/{r}").json()["sessions_seen"] for r in payloads}
    errors = []

    def worker(batch):
        for payload in batch:
            response = score(client, payload)
            if response.status_code != 200:
                errors.append(response.text)

    threads = [threading.Thread(target=worker, args=(b,)) for b in payloads.values()]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert not errors
    for rider in payloads:
        assert client.get(f"/riders/{rider}").json()["sessions_seen"] == before[rider] + 6
