import pytest
from fastapi.testclient import TestClient

from api.main import create_app
from api.settings import Settings


@pytest.fixture
def settings():
    return Settings(database_url="sqlite://", lab_riders=10, lab_history_days=25)


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings)) as c:
        yield c


def lab_payloads(client, rider_id, n):
    """Sessions from the simulated world, as an API client would send them (no ground truth)."""
    world = client.app.state.lab.world
    return [world.next_session(rider_id).to_payload() for _ in range(n)]
