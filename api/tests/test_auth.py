"""Sign-in, sessions, role separation and the data model behind them."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from api.models import AuthSessionRow, UserRow
from api.security import hash_password, verify_password
from api.seed import DEMO_COMPANY_EMAIL, DEMO_RIDERS
from api.tests.conftest import DEMO_PASSWORD, INVITE, lab_payloads, sign_in

RIDER_PHONE = DEMO_RIDERS[0][1]


# ------------------------------------------------------------------ passwords
def test_passwords_are_hashed_salted_and_verifiable():
    a, b = hash_password("correct horse 9"), hash_password("correct horse 9")
    assert a != b and a.startswith("scrypt$") and "correct horse" not in a
    assert verify_password("correct horse 9", a) and not verify_password("wrong horse 9", a)
    assert not verify_password("x", "not-a-hash") and not verify_password("x", "scrypt$1$2$3$a$b")


def test_stored_password_is_not_plaintext(app, anon):
    with app.state.service.db.session() as db:
        hashes = [u.password_hash for u in db.scalars(select(UserRow))]
    assert hashes and all(h.startswith("scrypt$") and DEMO_PASSWORD not in h for h in hashes)


# ------------------------------------------------------------------ rider registration and login
def test_rider_can_register_and_is_signed_in(anon):
    response = anon.post("/auth/rider/register", json={"name": "Meera Das", "phone": "98765 43210", "password": "bike-ride-77"})
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["role"] == "rider" and body["user"]["rider_id"].startswith("RD-") and body["home"] == "/rider"
    assert "password" not in response.text and "tj_session" in response.headers["set-cookie"]
    assert "HttpOnly" in response.headers["set-cookie"] and "SameSite=lax" in response.headers["set-cookie"]
    anon.headers["X-CSRF-Token"] = body["csrf_token"]
    assert anon.get("/me/rider").json()["account"]["state"] == "ok"


@pytest.mark.parametrize("payload,field", [
    ({"name": "M", "phone": "9876543210", "password": "bike-ride-77"}, "name"),
    ({"name": "Meera Das", "phone": "12ab", "password": "bike-ride-77"}, "phone"),
    ({"name": "Meera Das", "phone": "9876543210", "password": "short1"}, "password"),
    ({"name": "Meera Das", "phone": "9876543210", "password": "12345678"}, "password"),
])
def test_rider_registration_validation(anon, payload, field):
    response = anon.post("/auth/rider/register", json=payload)
    assert response.status_code == 422 and field in response.json()["fields"]


def test_duplicate_rider_phone_is_rejected(anon):
    payload = {"name": "Meera Das", "phone": "9876543210", "password": "bike-ride-77"}
    assert anon.post("/auth/rider/register", json=payload).status_code == 201
    assert anon.post("/auth/rider/register", json=payload).status_code == 409
    other = {**payload, "phone": "+91 98765-43210"}  # same digits, different punctuation
    assert anon.post("/auth/rider/register", json={**other, "phone": "9876543210"}).status_code == 409


def test_rider_login_and_wrong_password(anon):
    assert anon.post("/auth/rider/login", json={"phone": RIDER_PHONE, "password": "nope-nope-1"}).status_code == 401
    ok = anon.post("/auth/rider/login", json={"phone": RIDER_PHONE, "password": DEMO_PASSWORD})
    assert ok.status_code == 200 and ok.json()["user"]["rider_id"] == "R00001"


def test_login_errors_do_not_reveal_whether_the_account_exists(anon):
    unknown = anon.post("/auth/rider/login", json={"phone": "9111111111", "password": "whatever-1"})
    wrong = anon.post("/auth/rider/login", json={"phone": RIDER_PHONE, "password": "whatever-1"})
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json() == wrong.json()


def test_missing_fields_are_422(anon):
    assert anon.post("/auth/rider/login", json={"phone": RIDER_PHONE}).status_code == 422
    assert anon.post("/auth/company/login", json={}).status_code == 422


def test_repeated_failures_lock_the_account_temporarily(anon):
    for _ in range(5):
        assert anon.post("/auth/rider/login", json={"phone": RIDER_PHONE, "password": "bad-guess-1"}).status_code == 401
    locked = anon.post("/auth/rider/login", json={"phone": RIDER_PHONE, "password": DEMO_PASSWORD})
    assert locked.status_code == 429 and "Too many" in locked.json()["detail"]
    other = anon.post("/auth/rider/login", json={"phone": DEMO_RIDERS[1][1], "password": DEMO_PASSWORD})
    assert other.status_code == 200  # only the targeted account is locked


# ------------------------------------------------------------------ company registration and login
def company(**over):
    base = {"name": "Ravi Kumar", "email": "Ravi@Fleet.example", "password": "ops-team-pass-1", "invite_code": INVITE}
    return {**base, **over}


def test_company_registration_needs_the_invite_code(anon):
    bad = anon.post("/auth/company/register", json=company(invite_code="guess"))
    assert bad.status_code == 422 and "invite_code" in bad.json()["fields"]
    ok = anon.post("/auth/company/register", json=company())
    assert ok.status_code == 201 and ok.json()["home"] == "/dashboard" and ok.json()["user"]["role"] == "company"
    assert anon.post("/auth/company/register", json=company(email="ravi@fleet.example")).status_code == 409


def test_company_registration_is_closed_without_a_configured_invite(settings):
    from api.main import create_app
    settings.company_invite_code = ""
    with TestClient(create_app(settings)) as c:
        assert c.post("/auth/company/register", json=company()).status_code == 403


def test_company_login_is_case_insensitive_on_email(anon):
    anon.post("/auth/company/register", json=company())
    assert anon.post("/auth/company/login", json={"email": "RAVI@fleet.example", "password": "ops-team-pass-1"}).status_code == 200


def test_company_email_must_look_like_an_email(anon):
    response = anon.post("/auth/company/register", json=company(email="not-an-email"))
    assert response.status_code == 422 and "email" in response.json()["fields"]


def test_rider_credentials_do_not_work_on_the_company_login(anon):
    assert anon.post("/auth/company/login", json={"email": RIDER_PHONE, "password": DEMO_PASSWORD}).status_code == 401
    assert anon.post("/auth/rider/login", json={"phone": DEMO_COMPANY_EMAIL, "password": DEMO_PASSWORD}).status_code == 401


# ------------------------------------------------------------------ sessions
def test_me_requires_a_session_and_logout_ends_it(anon):
    assert anon.get("/auth/me").status_code == 401
    sign_in(anon, "company", DEMO_COMPANY_EMAIL)
    assert anon.get("/auth/me").json()["user"]["role"] == "company"
    assert anon.post("/auth/logout").status_code == 200
    assert anon.get("/auth/me").status_code == 401
    assert anon.get("/riders").status_code == 401


def test_logout_removes_the_server_side_session(app, anon):
    sign_in(anon, "company", DEMO_COMPANY_EMAIL)
    token = anon.cookies.get("tj_session")
    anon.post("/auth/logout")
    with app.state.service.db.session() as db:
        assert db.scalar(select(AuthSessionRow).limit(1)) is None
    anon.cookies.set("tj_session", token)  # replaying the old cookie must not work
    assert anon.get("/auth/me").status_code == 401


def test_expired_sessions_are_rejected(app, anon):
    sign_in(anon, "company", DEMO_COMPANY_EMAIL)
    with app.state.service.db.session() as db:
        db.execute(text("UPDATE auth_sessions SET expires_at = '2000-01-01 00:00:00'"))
        db.commit()
    assert anon.get("/auth/me").status_code == 401
    assert anon.get("/riders").json()["detail"].startswith("Please sign in")


def test_a_forged_cookie_is_rejected(anon):
    anon.cookies.set("tj_session", "x" * 43)
    assert anon.get("/auth/me").status_code == 401


def test_only_a_digest_of_the_token_is_stored(app, anon):
    sign_in(anon, "company", DEMO_COMPANY_EMAIL)
    token = anon.cookies.get("tj_session")
    with app.state.service.db.session() as db:
        assert token not in {s.token_hash for s in db.scalars(select(AuthSessionRow))}


def test_changes_need_the_csrf_token(anon):
    sign_in(anon, "company", DEMO_COMPANY_EMAIL)
    del anon.headers["X-CSRF-Token"]
    forbidden = anon.post("/lab/step", json={"count": 1})
    assert forbidden.status_code == 403 and "verified" in forbidden.json()["detail"]
    anon.headers["X-CSRF-Token"] = "wrong"
    assert anon.post("/lab/step", json={"count": 1}).status_code == 403
    assert anon.get("/riders").status_code == 200  # reading does not need it


def test_passwords_and_tokens_never_appear_in_responses(anon):
    body = anon.post("/auth/company/login", json={"email": DEMO_COMPANY_EMAIL, "password": DEMO_PASSWORD}).text
    assert DEMO_PASSWORD not in body and "scrypt" not in body
    assert "tj_session" not in body


# ------------------------------------------------------------------ role separation
COMPANY_ONLY = [
    ("get", "/riders"), ("get", "/riders/R00001"), ("get", "/riders/R00001/timeline"), ("get", "/decisions"),
    ("get", "/decisions/1"), ("get", "/audit"), ("get", "/metrics/summary"), ("get", "/metrics/compare"),
    ("get", "/lab/state"), ("get", "/lab/scenarios"), ("get", "/stream"),
    ("post", "/lab/step"), ("post", "/lab/reset"), ("post", "/stepup/R00001/result"),
    ("post", "/decisions/1/review"), ("post", "/lab/run"), ("post", "/lab/scenario"),
]


@pytest.mark.parametrize("method,path", COMPANY_ONLY)
def test_operations_endpoints_reject_anonymous_callers(anon, method, path):
    assert getattr(anon, method)(path, **({"json": {}} if method == "post" else {})).status_code == 401


@pytest.mark.parametrize("method,path", [c for c in COMPANY_ONLY if c[1] != "/stream"])
def test_operations_endpoints_reject_riders(rider_client, method, path):
    kwargs = {"json": {}} if method == "post" else {}
    assert getattr(rider_client, method)(path, **kwargs).status_code == 403


def test_riders_cannot_submit_sessions_for_scoring(rider_client):
    payload = lab_payloads(rider_client, "R00001", 1)[0]
    assert rider_client.post("/sessions/score", json=payload).status_code == 403


def test_company_users_cannot_use_the_rider_portal(client):
    assert client.get("/me/rider").status_code == 403
    assert client.post("/me/rider/verification", json={"confirmed": True}).status_code == 403


def test_anonymous_users_cannot_use_the_rider_portal(anon):
    assert anon.get("/me/rider").status_code == 401


def test_ingest_key_lets_a_service_submit_sessions(settings):
    from api.main import create_app
    settings.ingest_key = "pipeline-key-1"
    with TestClient(create_app(settings)) as c:
        payload = lab_payloads(c, "R00002", 1)[0]
        assert c.post("/sessions/score", json=payload).status_code == 401
        assert c.post("/sessions/score", json=payload, headers={"X-Ingest-Key": "wrong"}).status_code == 401
        assert c.post("/sessions/score", json=payload, headers={"X-Ingest-Key": "pipeline-key-1"}).status_code == 200


def test_the_ingest_key_does_not_open_other_endpoints(settings):
    from api.main import create_app
    settings.ingest_key = "pipeline-key-1"
    with TestClient(create_app(settings)) as c:
        assert c.get("/riders", headers={"X-Ingest-Key": "pipeline-key-1"}).status_code == 401


# ------------------------------------------------------------------ rider portal
def test_rider_sees_only_their_own_plain_language_view(rider_client):
    overview = rider_client.get("/me/rider").json()
    assert overview["rider"]["rider_id"] == "R00001" and overview["account"]["state"] == "ok"
    assert overview["recent_activity"] and set(overview["recent_activity"][0]) == {"when", "city", "phone", "note", "tone"}
    text_dump = str(overview).lower()
    for internal in ("evidence", "threshold", "habit", "score", "level", "l2", "l3", "reasons"):
        assert internal not in text_dump


def test_rider_verification_flow(app, rider_client, client):
    # an operations user and a rider are two different browsers on the same app
    world = app.state.lab.world
    world.trigger("R00001", "hard_handoff")
    for payload in lab_payloads(client, "R00001", 12):
        if client.post("/sessions/score", json=payload).json()["level"] == "L2":
            break
    overview = rider_client.get("/me/rider").json()
    assert overview["account"]["state"] == "verification_needed" and overview["account"]["action_required"]
    done = rider_client.post("/me/rider/verification", json={"confirmed": True}).json()
    assert done["account"]["state"] == "ok"
    assert rider_client.post("/me/rider/verification", json={"confirmed": True}).status_code == 409


def test_rider_saying_it_was_not_me_puts_the_account_on_hold(app, rider_client, client):
    app.state.lab.world.trigger("R00001", "hard_handoff")
    for payload in lab_payloads(client, "R00001", 12):
        if client.post("/sessions/score", json=payload).json()["level"] == "L2":
            break
    held = rider_client.post("/me/rider/verification", json={"confirmed": False}).json()
    assert held["account"]["state"] == "on_hold" and not held["account"]["action_required"]


def test_a_new_rider_with_no_activity_sees_a_calm_empty_state(anon):
    r = anon.post("/auth/rider/register", json={"name": "Meera Das", "phone": "9876543210", "password": "bike-ride-77"})
    anon.headers["X-CSRF-Token"] = r.json()["csrf_token"]
    overview = anon.get("/me/rider").json()
    assert overview["recent_activity"] == [] and overview["account"]["state"] == "ok"


# ------------------------------------------------------------------ data model
def test_database_rejects_users_with_the_wrong_fields_for_their_role(app, anon):
    from api.models import UserRow
    from api.auth import utcnow
    with app.state.service.db.session() as db:
        db.add(UserRow(role="rider", name="No Phone", password_hash="x", created_at=utcnow()))
        with pytest.raises(IntegrityError):
            db.commit()
    with app.state.service.db.session() as db:
        db.add(UserRow(role="admin", name="Bad Role", email="a@b.co", password_hash="x", created_at=utcnow()))
        with pytest.raises(IntegrityError):
            db.commit()


def test_accounts_survive_a_lab_reset_and_a_restart(settings, tmp_path):
    from api.main import create_app
    settings.database_url = f"sqlite:///{tmp_path}/tj.db"
    with TestClient(create_app(settings)) as first:
        sign_in(first, "company", DEMO_COMPANY_EMAIL)
        assert first.post("/lab/reset").status_code == 200
        assert first.get("/auth/me").status_code == 200            # session survived the reset
        first.post("/auth/rider/register", json={"name": "Meera Das", "phone": "9876543210", "password": "bike-ride-77"})
    with TestClient(create_app(settings)) as second:               # "restart": new app, same database
        assert second.post("/auth/rider/login", json={"phone": "9876543210", "password": "bike-ride-77"}).status_code == 200
        sign_in(second, "company", DEMO_COMPANY_EMAIL)
        assert second.get("/riders").status_code == 200


def test_provisioning_cli(settings, tmp_path, monkeypatch, capsys):
    from api import manage
    url = f"sqlite:///{tmp_path}/cli.db"
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("TJ_RESET_ON_START", "true")
    assert manage.main(["create-company-user", "--name", "Ops Person", "--email", "ops@x.example", "--password", "cli-password-1"]) == 0
    assert manage.main(["create-rider", "--name", "Rider One", "--phone", "9000011111", "--rider-id", "R00009", "--password", "cli-password-1"]) == 0
    assert manage.main(["create-company-user", "--name", "Ops Person", "--email", "bad", "--password", "x"]) == 2
    assert manage.main(["set-password", "ops@x.example", "--password", "new-password-2"]) == 0
    assert manage.main(["list-users"]) == 0
    assert "ops@x.example" in capsys.readouterr().out


def test_decision_lists_carry_where_the_session_happened(client):
    first = client.get("/decisions?limit=3").json()[0]
    assert first["context"]["city"] and first["context"]["device_id"] and "rider_name" in first


def test_a_rider_confirming_it_is_them_settles_their_open_cases(app, rider_client, client):
    app.state.lab.world.trigger("R00001", "hard_handoff")
    for payload in lab_payloads(client, "R00001", 12):
        if client.post("/sessions/score", json=payload).json()["level"] == "L2":
            break
    assert client.get("/metrics/summary").json()["open_cases"] == 1
    assert rider_client.post("/me/rider/verification", json={"confirmed": True}).status_code == 200
    assert client.get("/metrics/summary").json()["open_cases"] == 0
    closed = [d for d in client.get("/decisions?rider_id=R00001&min_level=2").json() if d["review_verdict"]]
    assert closed and {d["review_verdict"] for d in closed} == {"rider_verified"}
    assert client.get("/decisions?unreviewed=true&min_level=2").json() == []


def test_a_rider_saying_it_was_not_them_keeps_the_case_open_for_review(app, rider_client, client):
    app.state.lab.world.trigger("R00001", "hard_handoff")
    for payload in lab_payloads(client, "R00001", 12):
        if client.post("/sessions/score", json=payload).json()["level"] == "L2":
            break
    assert rider_client.post("/me/rider/verification", json={"confirmed": False}).status_code == 200
    queue = client.get("/decisions?unreviewed=true&min_level=2").json()
    assert queue and queue[0]["rider_id"] == "R00001"
    result = client.post(f"/decisions/{queue[0]['decision_id']}/review", json={"takeover_confirmed": False, "note": "checked"})
    assert result.status_code == 200 and result.json()["verdict"] == "dismissed"
    assert client.get("/audit?limit=5").json()[0]["actor"].startswith("reviewer:")
