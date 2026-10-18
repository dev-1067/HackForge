"""Background activity can leave cases for a person to review, and the review has the right effect."""
import time


def wait_for(predicate, seconds=25):
    end = time.time() + seconds
    while time.time() < end:
        value = predicate()
        if value:
            return value
        time.sleep(0.2)
    return None


def start_manual(client, rate=100, fast=True):
    if fast:    # the real pacing is slow on purpose; the tests that are not about pacing shorten it
        client.app.state.lab.MIN_GAP_SECONDS = 0.3
        client.app.state.lab.COOLDOWN_SECONDS = 0.0
    return client.post("/lab/run", json={"action": "start", "rate": rate, "auto_resolve": False, "incidents": True}).json()


def test_background_run_leaves_several_cases_waiting_for_a_person(client):
    assert start_manual(client)["incidents"] is True
    cases = wait_for(lambda: (lambda c: c if len({d["rider_id"] for d in c}) >= 2 else None)(
        client.get("/decisions?case_status=pending&limit=200").json()))
    client.post("/lab/run", json={"action": "stop"})
    assert cases, "no cases were left waiting"
    assert all(d["review_verdict"] is None and d["reviewed_by"] is None for d in cases)
    assert client.get("/metrics/summary").json()["open_cases"] >= 2
    # they are still waiting after the activity stopped (nothing answered them automatically)
    again = client.get("/decisions?case_status=pending&limit=200").json()
    assert {d["rider_id"] for d in cases} <= {d["rider_id"] for d in again}


def test_clearing_a_case_ends_the_staged_attack_and_suspending_blocks_the_rider(client):
    start_manual(client)
    wait_for(lambda: len({d["rider_id"] for d in client.get("/decisions?case_status=pending&limit=200").json()}) >= 2)
    client.post("/lab/run", json={"action": "stop"})
    pending = client.get("/decisions?case_status=pending&limit=200").json()
    riders = list(dict.fromkeys(d["rider_id"] for d in pending))
    assert len(riders) >= 2
    clear_id = next(d["decision_id"] for d in pending if d["rider_id"] == riders[0])
    suspend_id = next(d["decision_id"] for d in pending if d["rider_id"] == riders[1])
    assert client.post(f"/decisions/{clear_id}/review", json={"takeover_confirmed": False, "note": "fine"}).status_code == 200
    assert client.post(f"/decisions/{suspend_id}/review", json={"takeover_confirmed": True}).status_code == 200
    state = client.get("/lab/state").json()
    assert riders[0] not in state["active_scenarios"]          # the false alarm is over
    assert riders[1] in state["blocked"]                        # the takeover is stopped
    assert client.get(f"/riders/{riders[0]}").json()["status"] == "active"
    assert client.get(f"/riders/{riders[1]}").json()["status"] == "suspended"


def test_automatic_mode_still_answers_everything(client):
    client.post("/lab/run", json={"action": "start", "rate": 100})
    time.sleep(0.8)
    client.post("/lab/run", json={"action": "stop"})
    assert client.get("/lab/state").json()["incidents"] is False


def test_a_settled_case_is_not_replaced_a_second_later(client):
    """Real pacing: after a person decides a case, nothing new is staged straight away and the count does not refill."""
    start_manual(client, fast=False)
    first = wait_for(lambda: client.get("/decisions?case_status=pending&limit=200").json() or None)
    assert first, "no case appeared"
    wait_for(lambda: client.get("/metrics/summary").json()["open_cases"] >= 1)
    decision = client.get("/decisions?case_status=pending&limit=1").json()[0]
    assert client.post(f"/decisions/{decision['decision_id']}/review", json={"takeover_confirmed": True}).status_code == 200
    remaining = client.get("/metrics/summary").json()["open_cases"]
    time.sleep(4)
    after = client.get("/metrics/summary").json()["open_cases"]
    client.post("/lab/run", json={"action": "stop"})
    assert after <= remaining, f"a new case appeared right after a decision ({remaining} -> {after})"
    assert client.app.state.lab.MAX_OPEN_CASES == 4


def test_the_queue_stays_bounded_and_the_run_waits_for_a_person(client):
    lab = client.app.state.lab
    start_manual(client)
    wait_for(lambda: client.get("/metrics/summary").json()["open_cases"] >= lab.MAX_OPEN_CASES, seconds=40)
    time.sleep(2.5)
    state = client.get("/lab/state").json()
    count = client.get("/metrics/summary").json()["open_cases"]
    generated = state["generated"]
    time.sleep(1.5)
    assert client.get("/metrics/summary").json()["open_cases"] == count <= lab.MAX_OPEN_CASES
    assert client.get("/lab/state").json()["generated"] == generated          # paused, not piling on
    assert state["waiting_for_review"] is True
    # a decision frees a place and the run carries on
    case = client.get("/decisions?case_status=pending&limit=1").json()[0]
    client.post(f"/decisions/{case['decision_id']}/review", json={"takeover_confirmed": False})
    assert wait_for(lambda: client.get("/lab/state").json()["generated"] > generated, seconds=10)
    client.post("/lab/run", json={"action": "stop"})


def test_blocked_follows_the_riders_real_status(client):
    """A rider is only shown as blocked while the account is really suspended, and a normal rider never is."""
    client.post("/lab/scenario", json={"rider_id": "R00002", "scenario": "new_phone", "steps": 4})
    state = client.get("/lab/state").json()
    assert "R00002" not in state["blocked"] and "R00002" not in state["statuses"]          # an everyday change is normal
    client.post("/lab/scenario", json={"rider_id": "R00001", "scenario": "hard_handoff", "steps": 12})
    state = client.get("/lab/state").json()
    assert "R00001" in state["blocked"] and state["statuses"]["R00001"] == "suspended"
    # a person clears the account: it is no longer blocked and no longer listed as flagged
    decision = client.get("/decisions?q=R00001&limit=1").json()[0]
    assert client.post(f"/decisions/{decision['decision_id']}/review", json={"takeover_confirmed": False}).status_code == 200
    state = client.get("/lab/state").json()
    assert "R00001" not in state["blocked"] and "R00001" not in state["statuses"]
    # starting an everyday change for a suspended rider does not pretend to unblock them
    client.post("/lab/scenario", json={"rider_id": "R00003", "scenario": "hard_handoff", "steps": 12})
    client.post("/lab/scenario", json={"rider_id": "R00003", "scenario": "os_update", "steps": 2})
    assert client.get("/lab/state").json()["statuses"].get("R00003") in ("suspended", "held", "pending_stepup")


def test_restoring_a_suspended_rider_gives_a_clean_account_and_is_recorded(client, rider_client):
    client.post("/lab/scenario", json={"rider_id": "R00001", "scenario": "hard_handoff", "steps": 12})
    assert client.get("/lab/state").json()["statuses"]["R00001"] == "suspended"
    assert rider_client.get("/me/rider").json()["account"]["state"] == "suspended"
    out = client.post("/lab/restore/R00001").json()
    assert out["from"] == "suspended" and out["status"] == "active"
    state = client.get("/lab/state").json()
    assert "R00001" not in state["blocked"] and "R00001" not in state["statuses"] and "R00001" not in state["active_scenarios"]
    assert rider_client.get("/me/rider").json()["account"]["state"] == "ok"
    entry = next(a for a in client.get("/riders/R00001/audit").json() if a["action"] == "account_restored")
    assert entry["actor"] == "lab" and entry["details"]["from"] == "suspended"
    assert client.get("/riders/R00001").json()["status"] == "active"
    assert not client.get("/decisions?case_status=pending&q=R00001").json()          # nothing left open
    assert client.post("/lab/restore/NOPE").status_code == 404


def test_a_scenario_can_start_from_a_restored_account(client):
    client.post("/lab/scenario", json={"rider_id": "R00002", "scenario": "hard_handoff", "steps": 12})
    assert client.get("/lab/state").json()["statuses"]["R00002"] == "suspended"
    out = client.post("/lab/scenario", json={"rider_id": "R00002", "scenario": "new_phone", "steps": 3, "restore": True}).json()
    assert out["restored"]["from"] == "suspended"
    assert [d["status"] for d in out["decisions"]][0] in ("active", "watch")             # started clean
    assert client.get("/lab/state").json()["statuses"].get("R00002") in (None, "watch")
    # without restore a suspended rider stays suspended, as the screen says
    client.post("/lab/scenario", json={"rider_id": "R00003", "scenario": "hard_handoff", "steps": 12})
    kept = client.post("/lab/scenario", json={"rider_id": "R00003", "scenario": "new_phone", "steps": 2}).json()
    assert kept["restored"] is None and client.get("/lab/state").json()["statuses"]["R00003"] == "suspended"


def test_restoring_a_normal_rider_changes_nothing_important(client):
    out = client.post("/lab/restore/R00004").json()
    assert out["from"] == "active" and out["status"] == "active" and out["cases_closed"] == 0
