"""What a rider is told about a hold or a suspension, an unanswered check that does not wait forever, and the rider map."""
from datetime import timedelta

from api.service import utcnow
from api.tests.test_partner import open_case

INTERNAL = ("evidence_score", "threshold", "habit_deviation", "context_score", "z-score", "ewma", "model")


def story(rider_client):
    return rider_client.get("/me/rider").json()["explanation"]


def test_a_good_account_has_no_explanation(rider_client):
    assert rider_client.get("/me/rider").json()["explanation"] is None
    assert rider_client.get("/me/rider/account").json()["explanation"] is None


def test_pending_check_is_explained_with_what_was_seen(app, client, rider_client):
    open_case(app, client)
    e = story(rider_client)
    assert e["state"] == "verification_needed" and e["outcome"] == "A confirmation was asked"
    assert e["noticed"] and e["evidence"] and e["what_you_can_do"] and e["help"]["kind"] == "verification_help"
    assert "keep working" in e["what_it_means"]
    assert rider_client.get("/me/rider/account").json()["explanation"]["state"] == "verification_needed"


def test_suspension_shows_why_who_decided_and_what_to_do_without_internal_terms(app, client, rider_client):
    open_case(app, client)
    d = client.get("/decisions?case_status=pending&q=R00001&limit=1").json()[0]
    secret = "PRIVATE-REVIEWER-NOTE-do-not-show"
    assert client.post(f"/decisions/{d['decision_id']}/review", json={"takeover_confirmed": True, "note": secret}).status_code == 200
    e = story(rider_client)
    assert e["state"] == "suspended" and e["decided_by"] == "our team" and e["outcome"] == "Account paused after review"
    assert e["since"] and any("paused" in n for n in e["noticed"])
    assert e["evidence"] and all(x["at"] and x["what"] for x in e["evidence"])
    assert e["help"]["kind"] == "human_review" and any("Help & Review" in t for t in e["what_you_can_do"])
    blob = str(rider_client.get("/me/rider").json()) + str(rider_client.get("/me/rider/account").json())
    assert secret not in blob and not any(term in blob for term in INTERNAL)
    # the help route really works for a paused account
    r = rider_client.post("/me/rider/requests", json={"kind": "human_review", "message": "I changed my phone last week, please look again."})
    assert r.status_code == 201
    assert any(q["message"].startswith("I changed my phone") for q in client.get("/review-requests?status=active").json())


def test_an_unanswered_check_expires_into_a_hold_for_a_person(app, client, rider_client):
    svc = app.state.service
    open_case(app, client)
    assert svc.expire_stepups() == []                                   # not yet old enough
    assert rider_client.get("/me/rider").json()["account"]["state"] == "verification_needed"
    expired = svc.expire_stepups(now=utcnow() + timedelta(minutes=svc.settings.stepup_expiry_minutes + 1))
    assert expired == ["R00001"]
    assert rider_client.get("/me/rider").json()["account"]["state"] == "on_hold"
    detail = client.get("/riders/R00001").json()
    assert detail["status"] == "held" and detail["failed_stepups"] == 0     # not counted as a failed check
    e = story(rider_client)
    assert any("did not receive an answer" in n for n in e["noticed"])
    assert svc.expire_stepups(now=utcnow() + timedelta(days=2)) == []        # only once
    actions = [a["action"] for a in client.get("/riders/R00001/audit").json()]
    assert "stepup_expired" in actions
    # the case is still open for a person, who can still decide it
    d = client.get("/decisions?case_status=pending&q=R00001&limit=1").json()[0]
    assert client.post(f"/decisions/{d['decision_id']}/review", json={"takeover_confirmed": False}).status_code == 200
    assert rider_client.get("/me/rider").json()["account"]["state"] == "ok"


def test_expiry_can_be_switched_off(app, client):
    svc = app.state.service
    svc.settings.stepup_expiry_minutes = 0
    open_case(app, client)
    assert svc.expire_stepups(now=utcnow() + timedelta(days=30)) == []


def test_open_cases_report_how_long_the_rider_has_not_answered(app, client):
    open_case(app, client)
    d = client.get("/decisions?case_status=pending&q=R00001&limit=1").json()[0]
    assert d["awaiting_rider_since"]


def test_rider_map_lists_each_rider_once_with_city_area_and_status(client, rider_client):
    rows = client.get("/map/riders").json()
    assert len(rows) == len({r["rider_id"] for r in rows}) >= 10
    assert all(r["city"] and r["status"] and r["last_seen_at"] for r in rows)
    city = rows[0]["city"]
    only = client.get("/map/riders", params={"city": city}).json()
    assert only and all(r["city"] == city for r in only)
    assert client.get("/map/riders?city=Atlantis").json() == []
    assert rider_client.get("/map/riders").status_code == 403


def test_the_map_follows_a_rider_who_moves_city(client):
    before = {r["rider_id"]: r for r in client.get("/map/riders").json()}["R00002"]
    client.post("/lab/scenario", json={"rider_id": "R00002", "scenario": "moved_city", "steps": 4})
    after = {r["rider_id"]: r for r in client.get("/map/riders").json()}["R00002"]
    assert after["city"] != before["city"] and after["last_seen_at"] > before["last_seen_at"]


def test_demo_accounts_match_the_simulated_riders_exactly(client):
    """Every demo account belongs to a simulated rider and every simulated rider has one (no phantom riders)."""
    from api.seed import DEMO_RIDERS
    riders = {r["rider_id"] for r in client.get("/riders?limit=500").json()}
    lab = client.app.state.lab
    assert riders == set(lab.world.rider_ids)                       # nobody extra, nobody missing
    accounts = {rid for _, _, rid in DEMO_RIDERS if int(rid[1:]) < client.app.state.settings.lab_riders}
    assert accounts == riders
    assert {rid for _, _, rid in DEMO_RIDERS} == {f"R{i:05d}" for i in range(60)}      # R00000 to R00059, once each
    assert len({phone for _, phone, _ in DEMO_RIDERS}) == 60


def test_reseeding_refreshes_demo_names_but_never_other_accounts(client):
    auth = client.app.state.auth
    auth.provision_rider_user("Old Name", "9111111111", "demo-pass-123", "R90004")
    assert auth.provision_rider_user("New Name", "9111111111", "demo-pass-123", "R90004").name == "Old Name"
    assert auth.provision_rider_user("New Name", "9111111111", "demo-pass-123", "R90004", refresh_name=True).name == "New Name"
