"""In-process pub/sub that feeds the Server-Sent Events stream."""
from __future__ import annotations

import asyncio
import threading
from dataclasses import dataclass
from typing import Any


@dataclass
class BusEvent:
    event: str
    data: dict[str, Any]


class EventBus:
    """Fan-out to any number of SSE subscribers. ``publish`` is safe to call from any thread."""

    def __init__(self, maxsize: int = 500) -> None:
        self.maxsize = maxsize
        self._subs: set[asyncio.Queue[BusEvent]] = set()
        self._lock = threading.Lock()
        self._loop: asyncio.AbstractEventLoop | None = None

    def attach_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def subscribe(self) -> "asyncio.Queue[BusEvent]":
        queue: asyncio.Queue[BusEvent] = asyncio.Queue(self.maxsize)
        with self._lock:
            self._subs.add(queue)
        return queue

    def unsubscribe(self, queue: "asyncio.Queue[BusEvent]") -> None:
        with self._lock:
            self._subs.discard(queue)

    @property
    def subscriber_count(self) -> int:
        with self._lock:
            return len(self._subs)

    def publish(self, event: str, data: dict[str, Any]) -> None:
        message = BusEvent(event, data)
        with self._lock:
            targets = list(self._subs)
        for queue in targets:
            if self._loop is not None and self._loop.is_running():
                self._loop.call_soon_threadsafe(self._offer, queue, message)
            else:
                self._offer(queue, message)

    @staticmethod
    def _offer(queue: "asyncio.Queue[BusEvent]", message: BusEvent) -> None:
        if queue.full():  # slow consumer: drop the oldest event rather than block the engine
            try:
                queue.get_nowait()
            except asyncio.QueueEmpty:  # pragma: no cover - race with the consumer
                pass
        queue.put_nowait(message)
