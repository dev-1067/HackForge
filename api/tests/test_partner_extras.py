"""Notifications, work summary, sign-in history and the read-only database view."""
import json

from fastapi.testclient import TestClient

from api.seed import DEMO_RIDERS
from api.tests.conftest import DEMO_PASSWORD, sign_in
from api.tests.test_partner import open_case


def other_rider(app):
    c = TestClient(app)
    sign_in(c, "rider", DEMO_RIDERS[1][1])
    return c


# ------------------------------------------------------------------ notifications
def test_notifications_start_clean_and_show_a_team_reply_as_unread(client, rider_client):
    assert rider_client.get("/me/rider/notifications").json()["unread"] == 0
    rider_client.post("/me/rider/requests", json={"kind": "human_review", "message": "Please look at my account again."})
    req = client.get("/review-requests?status=active").json()[0]
    client.post(f"/review-requests/{req['id']}/respond", json={"action": "resolve", "note": "All checked, you are fine."})
    data = rider_client.get("/me/rider/notifications").json()
    reply = next(i for i in data["items"] if i["kind"] == "request_reply")
    assert reply["unread"] and reply["detail"] == "All checked, you are fine." and reply["link"] == "/rider/help"
    assert data["unread"] >= 1 and rider_client.get("/me/rider").json()["unread_notifications"] == data["unread"]
    after = rider_client.post("/me/rider/notifications/read").json()
    assert after["unread"] == 0 and rider_client.get("/me/rider").json()["unread_notifications"] == 0
    assert any(i["kind"] == "request_reply" for i in after["items"])          # still listed, no longer unread


def test_status_notification_is_pinned_first_and_points_home(app, client, rider_client):
    open_case(app, client)
    items = rider_client.get("/me/rider/notifications").json()["items"]
    assert items[0]["kind"] == "status" and items[0]["sticky"] and items[0]["title"] == "Please confirm it is you"
    assert any(i["kind"] == "verification_requested" for i in items)


def test_notifications_belong_to_the_signed_in_rider_only(client, rider_client, app):
    rider_client.post("/me/rider/requests", json={"kind": "human_review", "message": "Please look at my account again."})
    req = client.get("/review-requests?status=active").json()[0]
    client.post(f"/review-requests/{req['id']}/respond", json={"action": "resolve", "note": "Private reply for rider one."})
    other = other_rider(app)
    assert "Private reply for rider one." not in json.dumps(other.get("/me/rider/notifications").json())
    assert client.get("/me/rider/notifications").status_code == 403           # company users have no rider notifications
    assert TestClient(app).get("/me/rider/notifications").status_code == 401


# ------------------------------------------------------------------ work summary
def test_work_summary_counts_the_riders_own_sessions(rider_client, client):
    data = rider_client.get("/me/rider/summary?days=30").json()
    assert data["totals"]["sessions"] == len(data["sessions"]) > 5
    assert data["totals"]["active_days"] >= 1 and data["totals"]["phones"] >= 1 and data["totals"]["cities"]
    assert data["all_time"]["sessions"] >= data["totals"]["sessions"]
    assert data["includes_demo"] is True and all(s["origin"] in ("demo", "recorded") for s in data["sessions"])
    assert sum(c["sessions"] for c in data["totals"]["cities"]) == data["totals"]["sessions"]
    assert set(data["sessions"][0]) == {"at", "city", "origin"}                # no phone ids, scores or reasons
    wider = rider_client.get("/me/rider/summary?days=90").json()
    assert wider["totals"]["sessions"] >= data["totals"]["sessions"]


def test_work_summary_is_private_and_validated(rider_client, client, app):
    mine = rider_client.get("/me/rider/summary").json()
    other = other_rider(app).get("/me/rider/summary").json()
    assert mine["sessions"] != other["sessions"]
    assert rider_client.get("/me/rider/summary?days=3").status_code == 422
    assert rider_client.get("/me/rider/summary?days=500").status_code == 422
    assert client.get("/me/rider/summary").status_code == 403


# ------------------------------------------------------------------ sign-ins
def test_sign_in_history_lists_this_session_and_works_for_both_roles(rider_client, client):
    rows = rider_client.get("/me/sign-ins").json()
    assert rows and rows[0]["current"] is True and rows[0]["browser"]
    assert client.get("/me/sign-ins").status_code == 200
    assert TestClient(client.app).get("/me/sign-ins").status_code == 401


# ------------------------------------------------------------------ database view
def test_database_overview_lists_every_table_with_columns_and_counts(client):
    data = client.get("/db/overview").json()
    names = {t["name"] for t in data["tables"]}
    assert {"riders", "sessions", "decisions", "audit_log", "users", "review_requests", "sign_in_events", "notification_reads"} <= names
    assert data["connection"]["engine"] == "sqlite" and data["connection"]["how_to_open"]
    riders = next(t for t in data["tables"] if t["name"] == "riders")
    assert riders["rows"] >= 10 and riders["demo"] is True and any(c["primary_key"] for c in riders["columns"])
    users = next(t for t in data["tables"] if t["name"] == "users")
    assert next(c for c in users["columns"] if c["name"] == "password_hash")["hidden"] is True


def test_database_rows_never_contain_secrets_and_mask_contact_details(client, rider_client):
    users = client.get("/db/tables/users").json()
    assert users["total"] >= 4
    for row in users["rows"]:
        assert row["password_hash"] == "hidden"
        assert row["phone"] is None or row["phone"].startswith("••••")
        assert row["email"] is None or "•••@" in row["email"]
    everything = ""
    for t in client.get("/db/overview").json()["tables"]:
        everything += json.dumps(client.get(f"/db/tables/{t['name']}", params={"limit": 200}).json())
    assert "scrypt" not in everything and DEMO_PASSWORD not in everything
    assert "9000000001" not in everything and "ops@trustjuggler.demo" not in everything
    tokens = client.get("/db/tables/auth_sessions").json()["rows"]
    assert tokens and all(r["token_hash"] == "hidden" and r["csrf_token"] == "hidden" for r in tokens)


def test_database_browse_search_paging_and_errors(client, rider_client):
    page = client.get("/db/tables/decisions?limit=5").json()
    assert len(page["rows"]) == 5 and page["total"] > 5
    nxt = client.get("/db/tables/decisions?limit=5&offset=5").json()
    assert {r["decision_id"] for r in page["rows"]}.isdisjoint({r["decision_id"] for r in nxt["rows"]})
    hit = client.get("/db/tables/riders", params={"q": "R00001"}).json()
    assert hit["total"] >= 1 and all("R00001" in json.dumps(r) for r in hit["rows"])
    assert client.get("/db/tables/riders", params={"q": "zzz-nothing"}).json()["total"] == 0
    assert client.get("/db/tables/not_a_table").status_code == 422
    assert client.get("/db/tables/riders?limit=0").status_code == 422
    assert client.get("/db/tables/riders?limit=1000").status_code == 422
    assert client.get("/db/tables/sqlite_master").status_code == 422             # only the application's own tables


def test_database_view_is_company_only_and_read_only(rider_client, anon):
    assert rider_client.get("/db/overview").status_code == 403
    assert rider_client.get("/db/tables/users").status_code == 403
    assert TestClient(anon.app).get("/db/overview").status_code == 401
    paths = anon.app.openapi()["paths"]
    assert all(set(paths[p]) == {"get"} for p in paths if p.startswith("/db/"))
