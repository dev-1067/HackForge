"""Search, filters, date ranges and session lookup for the operations team."""
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient



def ids(rows, key="rider_id"):
    return [r[key] for r in rows]


def day(offset_days=0):
    return (datetime.now(timezone.utc) + timedelta(days=offset_days)).strftime("%Y-%m-%d")


# ------------------------------------------------------------------ rider search
def test_rider_search_by_id_name_and_phone_with_partial_matches(client):
    assert ids(client.get("/riders?q=R00001").json()) == ["R00001"]
    assert ids(client.get("/riders?q=r0000").json())            # partial, case-insensitive
    assert ids(client.get("/riders?q=rider%20two").json()) == ["R00002"]
    assert set(ids(client.get("/riders?q=Demo%20Rider").json())) == {"R00001", "R00002", "R00003"}
    assert ids(client.get("/riders?q=9000000003").json()) == ["R00003"]
    assert ids(client.get("/riders?q=0003").json()) == ["R00003"]       # last digits of the phone
    assert client.get("/riders?q=zzzz-nobody").json() == []


def test_rider_search_has_no_duplicates_and_escapes_wildcards(client):
    rows = client.get("/riders?q=Demo&limit=500").json()
    assert len(ids(rows)) == len(set(ids(rows)))
    assert client.get("/riders?q=%25").json() == []                      # a literal percent sign, not "everything"
    assert client.get("/riders?q=_").json() == []


def test_rider_search_combines_with_status_and_city(client):
    everyone = client.get("/riders?limit=500").json()
    city = next(r["home_city"] for r in everyone if r["home_city"])
    in_city = client.get("/riders", params={"city": city, "limit": 500}).json()
    assert in_city and all(r["home_city"] == city for r in in_city)
    assert client.get("/riders?q=R00001&status=suspended").json() == []
    assert ids(client.get("/riders?q=R00001&status=active").json()) == ["R00001"]


def test_rider_search_searches_everything_not_just_the_first_page(client):
    all_ids = ids(client.get("/riders?limit=500").json())
    last = all_ids[-1]
    assert ids(client.get(f"/riders?q={last}&limit=1").json()) == [last]


def test_rider_search_requires_the_company_role(rider_client, anon):
    assert rider_client.get("/riders?q=9000000001").status_code == 403
    assert TestClient(anon.app).get("/riders?q=a").status_code == 401


# ------------------------------------------------------------------ decisions: filters
def seed_activity(client):
    client.post("/lab/scenario", json={"rider_id": "R00001", "scenario": "hard_handoff", "steps": 14, "auto_resolve": False})
    client.post("/lab/scenario", json={"rider_id": "R00002", "scenario": "new_phone", "steps": 3})


def test_review_queue_filters_work_together(client):
    seed_activity(client)
    pending = client.get("/decisions?case_status=pending&limit=500").json()
    assert pending and all(d["level"] in ("L2", "L3", "L4") and d["review_verdict"] is None for d in pending)
    by_rider = client.get("/decisions?case_status=pending&q=R00001&limit=500").json()
    assert by_rider and set(ids(by_rider)) == {"R00001"}
    by_name = client.get("/decisions?case_status=pending&q=demo%20rider%20one&limit=500").json()
    assert set(ids(by_name)) == {"R00001"}
    severe = client.get("/decisions?case_status=pending&level=L2&limit=500").json()
    assert all(d["level"] == "L2" for d in severe)
    assert client.get("/decisions?case_status=pending&q=R00002&level=L4").json() == []


def test_completed_cases_are_separated_from_pending_ones(client):
    seed_activity(client)
    case = client.get("/decisions?case_status=pending&limit=1").json()[0]
    assert client.post(f"/decisions/{case['decision_id']}/review", json={"takeover_confirmed": False, "note": "ok"}).status_code == 200
    done = client.get("/decisions?case_status=completed&limit=500").json()
    assert done and all(d["review_verdict"] for d in done)
    assert case["decision_id"] in ids(done, "decision_id")
    assert case["decision_id"] not in ids(client.get("/decisions?case_status=pending&limit=500").json(), "decision_id")
    reviewer = done[0]["reviewed_by"]
    assert client.get("/decisions", params={"case_status": "completed", "reviewer": reviewer}).json()
    assert client.get("/decisions", params={"case_status": "completed", "reviewer": "someone-else"}).json() == []


def test_city_zone_device_filters_use_the_stored_context(client):
    seed_activity(client)
    rows = client.get("/decisions?limit=500").json()
    ctx = rows[0]["context"]
    by_city = client.get("/decisions", params={"city": ctx["city"], "limit": 500}).json()
    assert by_city and all(d["context"]["city"] == ctx["city"] for d in by_city)
    by_zone = client.get("/decisions", params={"city": ctx["city"], "zone": ctx["zone"], "limit": 500}).json()
    assert by_zone and all(d["context"]["zone"] == ctx["zone"] for d in by_zone)
    by_device = client.get("/decisions", params={"device": ctx["device_id"][-6:], "limit": 500}).json()
    assert by_device and all(ctx["device_id"][-6:].lower() in d["context"]["device_id"].lower() for d in by_device)
    assert client.get("/decisions?city=Atlantis").json() == []
    options = client.get("/filters").json()
    assert ctx["city"] in options["cities"] and ctx["zone"] in options["zones"]


def test_date_ranges_use_stored_times_and_reject_bad_input(client):
    seed_activity(client)
    everything = client.get("/decisions?limit=500").json()
    future = client.get("/decisions", params={"since": day(2)}).json()
    assert future == []
    window = client.get("/decisions", params={"since": day(-3650), "until": day(3650), "limit": 500}).json()
    assert len(window) == len(everything)
    # only the sessions that fall inside a narrow window come back (history starts weeks before today)
    first = min(d["started_at"] for d in everything)
    one_day = client.get("/decisions", params={"since": first[:10], "until": first[:10] + "T23:59:59", "limit": 500}).json()
    assert 0 < len(one_day) < len(everything)
    assert all(d["started_at"][:10] == first[:10] for d in one_day)
    assert client.get("/decisions?since=not-a-date").status_code == 422
    assert client.get("/decisions", params={"since": day(2), "until": day(-2)}).status_code == 422
    assert client.get("/decisions?since=2026-01-01T00:00:00%2B05:30").status_code == 200   # offsets are understood


def test_time_zone_offsets_move_the_boundary(client):
    seed_activity(client)
    first = min(d["started_at"] for d in client.get("/decisions?limit=500").json())
    stamp = datetime.fromisoformat(first)
    after = (stamp + timedelta(seconds=1)).replace(tzinfo=timezone.utc).isoformat()
    inclusive = client.get("/decisions", params={"since": (stamp.replace(tzinfo=timezone.utc)).isoformat(), "limit": 500}).json()
    exclusive = client.get("/decisions", params={"since": after, "limit": 500}).json()
    assert len(inclusive) > len(exclusive)


def test_rider_timeline_filters(client):
    seed_activity(client)
    full = client.get("/riders/R00002/timeline").json()
    assert full
    city = full[0]["city"]
    assert client.get("/riders/R00002/timeline", params={"city": city}).json()
    assert client.get("/riders/R00002/timeline", params={"city": "Atlantis"}).json() == []
    assert client.get("/riders/R00002/timeline", params={"since": day(2)}).json() == []
    assert client.get("/riders/R00002/timeline?until=bad").status_code == 422


# ------------------------------------------------------------------ lookup
def test_session_and_decision_lookup_are_separate_identifiers(client):
    seed_activity(client)
    d = client.get("/decisions?limit=1").json()[0]
    by_decision = client.get(f"/decisions/{d['decision_id']}").json()
    by_session = client.get(f"/sessions/{d['session_id']}").json()
    assert by_decision["session_id"] == by_session["session_id"] == d["session_id"]
    assert by_session["decision_id"] == d["decision_id"]
    assert by_session["rider"]["baseline"] is not None and "habit" in by_session["session"]
    assert by_session["rider_name"] is None or isinstance(by_session["rider_name"], str)
    assert client.get("/sessions/does-not-exist").status_code == 404
    assert client.get("/decisions/99999999").status_code == 404
    assert client.get(f"/sessions/{d['decision_id']}").status_code == 404     # not interchangeable
    assert client.get("/decisions/abc").status_code == 422


def test_lookup_and_filters_are_company_only(rider_client, anon):
    for path in ("/decisions", "/decisions/1", "/sessions/x", "/filters", "/audit"):
        assert rider_client.get(path).status_code == 403, path
        assert TestClient(anon.app).get(path).status_code == 401, path


# ------------------------------------------------------------------ audit history
def test_audit_search_filters_and_pagination(client):
    seed_activity(client)
    case = client.get("/decisions?case_status=pending&limit=1").json()[0]
    client.post(f"/decisions/{case['decision_id']}/review", json={"takeover_confirmed": True, "note": "n"})
    rows = client.get("/audit?limit=500").json()
    assert rows and [r["id"] for r in rows] == sorted((r["id"] for r in rows), reverse=True)
    rid = case["rider_id"]
    assert set(ids(client.get("/audit", params={"q": rid}).json())) == {rid}
    by_action = client.get("/audit", params={"action": "review_confirmed_takeover"}).json()
    assert by_action and all(r["action"] == "review_confirmed_takeover" for r in by_action)
    assert client.get("/audit", params={"q": "confirmed_takeover"}).json()      # matches the action text too
    assert client.get("/audit", params={"since": day(2)}).json() == []
    assert client.get("/audit?since=nope").status_code == 422
    reviewer = by_action[0]["actor"].split(":", 1)[1]
    assert client.get("/audit", params={"reviewer": reviewer}).json()
    assert client.get("/audit", params={"reviewer": "nobody"}).json() == []
    page1 = client.get("/audit?limit=1").json()
    page2 = client.get("/audit?limit=1&offset=1").json()
    assert page1 and (not page2 or page1[0]["id"] != page2[0]["id"])
    assert client.get("/filters").json()["audit_actions"]


def test_filters_never_change_stored_history(client):
    seed_activity(client)
    before = len(client.get("/audit?limit=1000").json())
    for q in ("R00001", "zzz", "%"):
        client.get("/audit", params={"q": q})
        client.get("/decisions", params={"q": q})
    assert len(client.get("/audit?limit=1000").json()) == before
