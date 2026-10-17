"""The delivery partner portal: activity, account & verification, help requests, settings."""
import json

from fastapi.testclient import TestClient

from api.auth import describe_browser
from api.seed import DEMO_COMPANY_EMAIL, DEMO_RIDERS
from api.tests.conftest import DEMO_PASSWORD, lab_payloads, sign_in

CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1"
GOOD = "My phone broke and I use my brother's phone for a few days."


def open_case(app, client, rider="R00001"):
    """Drive a rider into a pending verification (nobody answers it)."""
    app.state.lab.world.trigger(rider, "hard_handoff")
    for payload in lab_payloads(client, rider, 14):
        if client.post("/sessions/score", json=payload).json()["level"] == "L2":
            return
    raise AssertionError("no verification was requested")


def first_device(rider_client):
    return rider_client.get("/me/rider/account").json()["devices"][0]["device_id"]


# ------------------------------------------------------------------ browser labels
def test_browser_labels_are_short_and_never_the_raw_header():
    assert describe_browser(CHROME_WIN) == "Chrome on Windows"
    assert describe_browser(SAFARI_IPHONE) == "Safari on iPhone"
    assert describe_browser("curl/8.0") == "Browser"
    assert describe_browser(None) == "Unknown browser"


# ------------------------------------------------------------------ activity
def test_sign_ins_are_recorded_and_a_new_browser_is_noticed(app):
    with TestClient(app) as c:
        sign_in(c, "rider", DEMO_RIDERS[2][1])
        c.cookies.clear()
        r = c.post("/auth/rider/login", json={"phone": DEMO_RIDERS[2][1], "password": DEMO_PASSWORD},
                   headers={"user-agent": CHROME_WIN})
        c.headers["X-CSRF-Token"] = r.json()["csrf_token"]
        events = [e for e in c.get("/me/rider/activity").json() if e["kind"] == "sign_in"]
    assert len(events) == 2 and all(e["origin"] == "recorded" for e in events)
    assert events[0]["title"] == "New browser: Chrome on Windows" and events[0]["tone"] == "noted"
    assert events[1]["title"] == "Signed in"            # the first sign-in is not "new"


def test_activity_marks_simulated_events_as_demo(client, rider_client):
    client.post("/lab/scenario", json={"rider_id": "R00001", "scenario": "new_phone", "steps": 3})
    events = rider_client.get("/me/rider/activity?limit=100").json()
    assert events and set(e["origin"] for e in events) <= {"recorded", "demo"}
    demo = [e for e in events if e["origin"] == "demo"]
    assert demo and all(e["kind"] in ("new_device", "verification_requested", "verification_done") for e in demo)
    assert [e["at"] for e in events] == sorted((e["at"] for e in events), reverse=True)


def test_activity_shows_an_outstanding_verification_with_an_action(app, client, rider_client):
    open_case(app, client)
    events = rider_client.get("/me/rider/activity").json()
    ask = next(e for e in events if e["kind"] == "verification_requested" and e.get("action"))
    assert ask["action"] == "verify" and "confirm" in ask["title"].lower()


def test_a_brand_new_rider_has_only_real_events(anon):
    r = anon.post("/auth/rider/register", json={"name": "Meera Das", "phone": "9876543210", "password": "bike-ride-77"})
    anon.headers["X-CSRF-Token"] = r.json()["csrf_token"]
    events = anon.get("/me/rider/activity").json()
    assert [e["kind"] for e in events] == ["sign_in"] and events[0]["origin"] == "recorded"
    account = anon.get("/me/rider/account").json()
    assert account["devices"] == [] and account["verification"]["history"] == []


# ------------------------------------------------------------------ account & verification
def test_account_page_has_only_the_riders_own_plain_information(rider_client):
    account = rider_client.get("/me/rider/account").json()
    assert account["profile"]["name"] == "Demo Rider One" and account["profile"]["phone_hint"].startswith("••••")
    assert "9000000001" not in json.dumps(account)
    assert account["status"]["state"] == "ok" and account["verification"]["outstanding"] is None
    assert account["devices"] and account["devices"][0]["origin"] == "demo" and account["devices"][0]["current"]
    assert {c["key"] for c in account["checkup"]} == {"phone", "verification", "sign_ins"}
    dump = json.dumps(account).lower()
    for internal in ("evidence", "threshold", "habit", "score", "password", "scrypt", "context_flags", "z\":"):
        assert internal not in dump


def test_outstanding_verification_is_shown_and_can_be_answered(app, client, rider_client):
    open_case(app, client)
    account = rider_client.get("/me/rider/account").json()
    assert account["status"]["state"] == "verification_needed" and account["verification"]["outstanding"]
    assert account["verification"]["outstanding"]["requested_at"]
    done = rider_client.post("/me/rider/verification", json={"confirmed": True}).json()
    assert done["account"]["state"] == "ok"
    after = rider_client.get("/me/rider/account").json()
    assert after["verification"]["outstanding"] is None
    assert after["verification"]["latest_event_at"] and after["verification"]["history"][0]["result"] == "passed"


# ------------------------------------------------------------------ device change
def test_reporting_a_device_is_recorded_and_visible_to_the_team(rider_client, client):
    device = first_device(rider_client)
    response = rider_client.post("/me/rider/device-change", json={"device_id": device, "note": "New phone from my shop"})
    assert response.status_code == 201
    body = response.json()
    assert body["kind"] == "device_change" and body["status"] == "open" and body["device_id"] == device
    mine = rider_client.get("/me/rider/requests").json()
    assert [r["id"] for r in mine] == [body["id"]]
    assert next(d for d in rider_client.get("/me/rider/account").json()["devices"] if d["device_id"] == device)["reported"]
    queue = client.get("/review-requests?status=active").json()
    assert queue[0]["rider_id"] == "R00001" and queue[0]["device_label"] and "New phone from my shop" in queue[0]["message"]
    assert client.get("/metrics/summary").json()["open_requests"] == 1


def test_reporting_a_device_changes_nothing_about_the_checks(app, client, rider_client):
    open_case(app, client)
    before = client.get("/riders/R00001").json()
    decisions_before = client.get("/decisions?rider_id=R00001&limit=200").json()
    assert rider_client.post("/me/rider/device-change", json={"device_id": first_device(rider_client)}).status_code == 201
    after = client.get("/riders/R00001").json()
    assert (after["status"], after["evidence"], after["failed_stepups"], after["last_level"]) == \
           (before["status"], before["evidence"], before["failed_stepups"], before["last_level"]) \
           == ("pending_stepup", before["evidence"], 0, "L2")
    assert client.get("/decisions?rider_id=R00001&limit=200").json() == decisions_before
    assert rider_client.get("/me/rider/account").json()["verification"]["outstanding"] is not None  # still required


def test_a_device_can_only_be_reported_once(rider_client):
    device = first_device(rider_client)
    assert rider_client.post("/me/rider/device-change", json={"device_id": device}).status_code == 201
    again = rider_client.post("/me/rider/device-change", json={"device_id": device})
    assert again.status_code == 409 and "already" in again.json()["detail"]


def test_an_unknown_device_cannot_be_reported(rider_client):
    response = rider_client.post("/me/rider/device-change", json={"device_id": "d_not_mine"})
    assert response.status_code == 422 and "device_id" in response.json()["fields"]


def test_a_rider_cannot_report_another_riders_device(app, rider_client):
    other = TestClient(app)
    sign_in(other, "rider", DEMO_RIDERS[1][1])
    theirs = first_device(other)
    assert rider_client.post("/me/rider/device-change", json={"device_id": theirs}).status_code == 422


# ------------------------------------------------------------------ help & review
def test_request_validation(rider_client):
    assert rider_client.post("/me/rider/requests", json={"kind": "human_review", "message": "short"}).status_code == 422
    assert rider_client.post("/me/rider/requests", json={"kind": "hack", "message": GOOD}).status_code == 422
    assert rider_client.post("/me/rider/requests", json={"kind": "device_change", "message": GOOD}).status_code == 422
    assert rider_client.post("/me/rider/requests", json={"kind": "other", "message": "x" * 1001}).status_code == 422
    assert rider_client.post("/me/rider/requests", json={"kind": "other", "message": GOOD, "device_id": "d_nope"}).status_code == 422
    assert rider_client.get("/me/rider/requests").json() == []


def test_request_goes_to_the_team_and_the_reply_comes_back(rider_client, client):
    created = rider_client.post("/me/rider/requests", json={"kind": "legitimate_change", "message": GOOD}).json()
    assert created["status"] == "open" and created["status_label"] == "Received" and created["kind_label"]
    team = client.get("/review-requests?status=active").json()
    assert team[0]["id"] == created["id"] and team[0]["rider_name"] == "Demo Rider One" and team[0]["rider_status"] == "active"

    assert client.post(f"/review-requests/{created['id']}/respond", json={"action": "start_review"}).status_code == 200
    assert rider_client.get("/me/rider/requests").json()[0]["status_label"] == "Being reviewed"
    assert client.post(f"/review-requests/{created['id']}/respond", json={"action": "start_review"}).status_code == 409

    assert client.post(f"/review-requests/{created['id']}/respond", json={"action": "resolve"}).status_code == 422
    done = client.post(f"/review-requests/{created['id']}/respond", json={"action": "resolve", "note": "Thanks, we noted the new phone."})
    assert done.status_code == 200 and done.json()["status"] == "resolved"
    mine = rider_client.get("/me/rider/requests").json()[0]
    assert mine["status_label"] == "Resolved" and mine["response_note"] == "Thanks, we noted the new phone."
    assert "responded_by" not in mine
    assert client.post(f"/review-requests/{created['id']}/respond", json={"action": "decline", "note": "late"}).status_code == 409
    assert client.get("/metrics/summary").json()["open_requests"] == 0
    assert any(a["action"] == "request_resolve" and a["actor"].startswith("reviewer:") for a in client.get("/audit?limit=20").json())
    kinds = {e["kind"] for e in rider_client.get("/me/rider/activity").json()}
    assert {"request", "request_reply"} <= kinds


def test_declining_needs_a_reason(rider_client, client):
    created = rider_client.post("/me/rider/requests", json={"kind": "other", "message": GOOD}).json()
    assert client.post(f"/review-requests/{created['id']}/respond", json={"action": "decline", "note": ""}).status_code == 422
    ok = client.post(f"/review-requests/{created['id']}/respond", json={"action": "decline", "note": "This is not something we can change."})
    assert ok.json()["status"] == "declined" and rider_client.get("/me/rider/requests").json()[0]["status_label"] == "Closed"


def test_open_requests_are_capped(rider_client):
    for _ in range(5):
        assert rider_client.post("/me/rider/requests", json={"kind": "other", "message": GOOD}).status_code == 201
    capped = rider_client.post("/me/rider/requests", json={"kind": "other", "message": GOOD})
    assert capped.status_code == 409 and "open requests" in capped.json()["detail"]


def test_a_rider_only_sees_their_own_requests(app, rider_client):
    rider_client.post("/me/rider/requests", json={"kind": "other", "message": GOOD})
    other = TestClient(app)
    sign_in(other, "rider", DEMO_RIDERS[1][1])
    assert other.get("/me/rider/requests").json() == []
    other.post("/me/rider/requests", json={"kind": "human_review", "message": "Please look at my account again."})
    assert len(other.get("/me/rider/requests").json()) == 1
    assert len(rider_client.get("/me/rider/requests").json()) == 1


def test_request_endpoints_are_role_protected(app, client, rider_client):
    anon = TestClient(app)
    assert anon.get("/me/rider/account").status_code == 401 and anon.get("/me/rider/requests").status_code == 401
    assert client.get("/me/rider/account").status_code == 403 and client.get("/me/rider/activity").status_code == 403
    assert client.post("/me/rider/requests", json={"kind": "other", "message": GOOD}).status_code == 403
    assert rider_client.get("/review-requests").status_code == 403
    assert rider_client.post("/review-requests/1/respond", json={"action": "resolve", "note": "x y z"}).status_code == 403
    assert client.post("/review-requests/9999/respond", json={"action": "start_review"}).status_code == 404


def test_rider_writes_need_the_csrf_token(rider_client):
    del rider_client.headers["X-CSRF-Token"]
    assert rider_client.post("/me/rider/requests", json={"kind": "other", "message": GOOD}).status_code == 403
    assert rider_client.post("/me/rider/device-change", json={"device_id": "d_x"}).status_code == 403


# ------------------------------------------------------------------ settings
def test_change_password(app, rider_client):
    other = TestClient(app)
    sign_in(other, "rider", DEMO_RIDERS[0][1])                    # a second browser for the same rider
    assert len(rider_client.get("/me/sessions").json()) == 2
    bad = rider_client.post("/me/password", json={"current_password": "wrong-one-1", "new_password": "fresh-pass-99"})
    assert bad.status_code == 422 and "current_password" in bad.json()["fields"]
    weak = rider_client.post("/me/password", json={"current_password": DEMO_PASSWORD, "new_password": "short"})
    assert weak.status_code == 422 and "new_password" in weak.json()["fields"]
    same = rider_client.post("/me/password", json={"current_password": DEMO_PASSWORD, "new_password": DEMO_PASSWORD})
    assert same.status_code == 422
    ok = rider_client.post("/me/password", json={"current_password": DEMO_PASSWORD, "new_password": "fresh-pass-99"})
    assert ok.status_code == 200 and ok.json()["signed_out_elsewhere"] == 1
    assert rider_client.get("/auth/me").status_code == 200       # this browser stays signed in
    assert other.get("/auth/me").status_code == 401              # the other one is signed out
    fresh = TestClient(app)
    assert fresh.post("/auth/rider/login", json={"phone": DEMO_RIDERS[0][1], "password": DEMO_PASSWORD}).status_code == 401
    assert fresh.post("/auth/rider/login", json={"phone": DEMO_RIDERS[0][1], "password": "fresh-pass-99"}).status_code == 200


def test_company_users_can_change_their_password_too(client):
    assert client.post("/me/password", json={"current_password": DEMO_PASSWORD, "new_password": "ops-new-pass-9"}).status_code == 200


def test_sessions_list_and_sign_out_others(app, rider_client):
    other = TestClient(app)
    sign_in(other, "rider", DEMO_RIDERS[0][1])
    sessions = rider_client.get("/me/sessions").json()
    assert len(sessions) == 2 and sum(s["current"] for s in sessions) == 1 and all(s["browser"] for s in sessions)
    assert rider_client.post("/me/sessions/sign-out-others").json() == {"signed_out": 1}
    assert other.get("/auth/me").status_code == 401 and rider_client.get("/auth/me").status_code == 200
    assert len(rider_client.get("/me/sessions").json()) == 1


def test_export_has_the_riders_own_data_and_no_secrets(rider_client):
    rider_client.post("/me/rider/requests", json={"kind": "other", "message": GOOD})
    response = rider_client.get("/me/rider/export")
    assert response.status_code == 200 and "attachment" in response.headers["content-disposition"]
    data = response.json()
    assert data["profile"]["name"] == "Demo Rider One" and data["requests"] and data["sign_ins"] and data["devices"]
    dump = json.dumps(data).lower()
    for secret in ("password", "scrypt", "csrf", "token_hash", "evidence", "threshold"):
        assert secret not in dump


# ------------------------------------------------------------------ existing company routes still work
def test_company_dashboard_routes_are_untouched(client):
    for path in ("/riders", "/decisions", "/metrics/summary", "/metrics/compare", "/lab/state", "/audit", "/review-requests"):
        assert client.get(path).status_code == 200, path
    assert DEMO_COMPANY_EMAIL
