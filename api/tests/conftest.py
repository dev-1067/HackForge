import socket
import threading
import time

import httpx
import pytest
import uvicorn
from fastapi.testclient import TestClient

from api.main import create_app
from api.seed import DEMO_COMPANY_EMAIL, DEMO_RIDERS
from api.settings import Settings

DEMO_PASSWORD = "demo-pass-123"
INVITE = "invite-code-123"


@pytest.fixture
def settings():
    return Settings(database_url="sqlite://", lab_riders=10, lab_history_days=25, company_invite_code=INVITE,
                    seed_demo_accounts=True, demo_password=DEMO_PASSWORD, max_failed_logins=5)


@pytest.fixture
def app(settings):
    return create_app(settings)


def sign_in(client, role, identifier, password=DEMO_PASSWORD):
    body = {"email": identifier, "password": password} if role == "company" else {"phone": identifier, "password": password}
    response = client.post(f"/auth/{role}/login", json=body)
    assert response.status_code == 200, response.text
    client.headers["X-CSRF-Token"] = response.json()["csrf_token"]
    return response.json()


@pytest.fixture
def anon(app):
    """A browser with no session."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def client(anon):
    """A signed-in operations user (the default for operations tests)."""
    sign_in(anon, "company", DEMO_COMPANY_EMAIL)
    return anon


@pytest.fixture
def rider_client(app):
    """A second browser signed in as the demo rider linked to R00001."""
    with TestClient(app) as c:
        sign_in(c, "rider", DEMO_RIDERS[0][1])
        yield c


def lab_payloads(client, rider_id, n):
    """Sessions from the simulated world, as an API client would send them (no ground truth)."""
    world = client.app.state.lab.world
    return [world.next_session(rider_id).to_payload() for _ in range(n)]


@pytest.fixture
def live_server(app):
    """The app on a real socket (needed for streaming responses). Yields the base URL."""
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning",
                                           timeout_graceful_shutdown=1))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{port}"
    for _ in range(100):
        try:
            httpx.get(f"{base}/health", timeout=1)
            break
        except httpx.HTTPError:
            time.sleep(0.1)
    yield base
    server.should_exit = True
    thread.join(timeout=10)
