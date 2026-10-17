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


def start_manual(client, rate=100):
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
