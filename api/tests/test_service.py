import asyncio

import pytest

from api.bus import EventBus
from api.main import sse_message
from api.service import TrustService
from api.settings import Settings
from sim.live import LiveWorld
from sim.quickstart import warm_engine


def test_bus_delivers_to_every_subscriber_and_unsubscribes():
    async def scenario():
        bus = EventBus()
        a, b = bus.subscribe(), bus.subscribe()
        bus.publish("decision", {"n": 1})
        assert (await a.get()).data == {"n": 1} and (await b.get()).event == "decision"
        bus.unsubscribe(a)
        bus.publish("decision", {"n": 2})
        assert a.empty() and (await b.get()).data == {"n": 2}
        assert bus.subscriber_count == 1

    asyncio.run(scenario())


def test_bus_drops_the_oldest_event_for_a_slow_consumer():
    async def scenario():
        bus = EventBus(maxsize=3)
        queue = bus.subscribe()
        for n in range(5):
            bus.publish("decision", {"n": n})
        assert [queue.get_nowait().data["n"] for _ in range(3)] == [2, 3, 4]

    asyncio.run(scenario())


def test_bus_publish_from_another_thread():
    import threading

    async def scenario():
        bus = EventBus()
        bus.attach_loop(asyncio.get_running_loop())
        queue = bus.subscribe()
        threading.Thread(target=bus.publish, args=("stepup", {"ok": True})).start()
        assert (await asyncio.wait_for(queue.get(), 2)).data == {"ok": True}

    asyncio.run(scenario())


def test_sse_framing():
    assert sse_message("decision", {"a": 1}) == 'event: decision\ndata: {"a": 1}\n\n'


def test_stream_endpoint_emits_hello_then_events(app, live_server):
    import httpx
    from api.seed import DEMO_COMPANY_EMAIL
    from api.tests.conftest import DEMO_PASSWORD
    bus = app.state.service.bus
    with httpx.Client(base_url=live_server, timeout=10) as http:
        assert http.post("/auth/company/login", json={"email": DEMO_COMPANY_EMAIL, "password": DEMO_PASSWORD}).status_code == 200
        with http.stream("GET", "/stream") as response:
            assert response.status_code == 200 and response.headers["content-type"].startswith("text/event-stream")
            lines = response.iter_lines()
            assert next(lines) == "event: hello"
            next(lines), next(lines)  # data line and the blank separator
            assert bus.subscriber_count == 1
            bus.publish("decision", {"level": "L2"})
            assert next(lines) == "event: decision"
            assert next(lines) == 'data: {"level": "L2"}'


def test_stream_requires_sign_in(anon):
    assert anon.get("/stream").status_code == 401


def test_decision_events_reach_subscribers(client):
    bus = client.app.state.service.bus
    seen = []
    original = bus.publish
    bus.publish = lambda event, data: (seen.append((event, data)), original(event, data))
    client.post("/lab/step", json={"count": 2, "rider_id": "R00001"})
    bus.publish = original
    decisions = [d for e, d in seen if e == "decision"]
    assert len(decisions) == 2 and decisions[0]["ground_truth"]["actor"] == "owner"
    assert {"decision_id", "level", "reasons", "context"} <= set(decisions[0])


def test_engine_state_survives_a_restart(tmp_path):
    url = f"sqlite:///{tmp_path}/tj.db"
    first = TrustService(Settings(database_url=url, reset_on_start=True))
    first.startup()
    world = LiveWorld(n_riders=5, seed=3, history_days=25)
    warm_engine(first.engine, world)
    for rider in world.rider_ids:
        for _ in range(3):
            first.score_payload(world.next_session(rider).to_payload())
    summary = first.engine.rider_summary("R00002")
    devices = {k: set(v) for k, v in first.engine.device_riders.items()}
    first.close()

    second = TrustService(Settings(database_url=url, reset_on_start=False))
    second.startup()
    assert second.engine.rider_summary("R00002")["status"] == summary["status"]
    assert second.engine.rider_summary("R00002")["baseline"] == summary["baseline"]
    assert second.engine.device_riders == devices
    # scoring continues seamlessly after the restart
    payload = world.next_session("R00002").to_payload()
    assert second.score_payload(payload)["rider_id"] == "R00002"
    second.close()


def test_service_rolls_back_on_duplicate(settings):
    svc = TrustService(settings)
    svc.startup()
    world = LiveWorld(n_riders=2, seed=1, history_days=10)
    payload = world.next_session("R00000").to_payload()
    svc.score_payload(payload)
    from api.errors import DuplicateSession
    with pytest.raises(DuplicateSession):
        svc.score_payload(payload)
    assert svc.metrics_summary()["sessions_scored"] == 1
    svc.close()
