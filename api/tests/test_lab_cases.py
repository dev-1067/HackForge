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
