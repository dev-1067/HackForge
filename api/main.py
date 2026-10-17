"""FastAPI application. Run with ``uvicorn api.asgi:app`` (docs at /docs)."""
from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from .errors import DuplicateSession, InvalidState, LabUnavailable, UnknownDecision, UnknownRider
from .lab import Lab
from .schemas import DecisionOut, LabRunIn, LabScenarioIn, LabStepIn, ReviewIn, SessionIn, StepupIn
from .service import TrustService
from .settings import Settings

KEEPALIVE_SECONDS = 15.0


def sse_message(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


def create_app(settings: Settings | None = None, service: TrustService | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    svc = service or TrustService(settings)
    lab = Lab(svc, settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        svc.bus.attach_loop(asyncio.get_running_loop())
        svc.startup()
        if settings.lab_enabled and settings.reset_on_start:
            await asyncio.to_thread(lab.build)
        yield
        lab.stop()
        svc.close()

    app = FastAPI(
        title="Trust Juggler API",
        description="Continuous identity scoring for gig-platform riders. Scores each session against the "
                    "rider's own pattern and escalates only sessions that look like someone else took over.",
        version="1.0.0", lifespan=lifespan)
    app.state.service, app.state.lab = svc, lab
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])

    # ------------------------------------------------------------------ errors
    def problem(status: int, exc: Exception) -> JSONResponse:
        return JSONResponse({"detail": str(exc.args[0]) if exc.args else exc.__class__.__name__}, status_code=status)

    app.add_exception_handler(DuplicateSession, lambda r, e: problem(409, DuplicateSession(f"session already scored: {e}")))
    app.add_exception_handler(UnknownRider, lambda r, e: problem(404, UnknownRider(f"unknown rider: {e}")))
    app.add_exception_handler(UnknownDecision, lambda r, e: problem(404, UnknownDecision(f"unknown decision: {e}")))
    app.add_exception_handler(InvalidState, lambda r, e: problem(409, e))
    app.add_exception_handler(LabUnavailable, lambda r, e: problem(503, e))

    # ------------------------------------------------------------------ health
    @app.get("/health", tags=["meta"])
    def health() -> dict[str, Any]:
        summary = svc.metrics_summary()
        return {"status": "ok", "model_version": summary["model_version"], "riders": summary["riders"],
                "sessions_scored": summary["sessions_scored"], "lab": lab.world is not None}

    # ------------------------------------------------------------------ scoring
    @app.post("/sessions/score", response_model=DecisionOut, tags=["scoring"])
    def score_session(body: SessionIn) -> dict[str, Any]:
        """Score one session and return the decision (level, action, reasons)."""
        data = body.model_dump()
        try:
            return svc.score_payload(data)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

    @app.post("/stepup/{rider_id}/result", tags=["scoring"])
    def stepup_result(rider_id: str, body: StepupIn) -> dict[str, Any]:
        """Report the outcome of a selfie / liveness check that an L2 decision asked for."""
        return svc.stepup_result(rider_id, body.passed, method=body.method, session_id=body.session_id)

    # ------------------------------------------------------------------ riders
    @app.get("/riders", tags=["riders"])
    def list_riders(status: str | None = None, q: str | None = None,
                    limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)) -> list[dict[str, Any]]:
        return svc.list_riders(status=status, q=q, limit=limit, offset=offset)

    @app.get("/riders/{rider_id}", tags=["riders"])
    def get_rider(rider_id: str) -> dict[str, Any]:
        return svc.rider_detail(rider_id)

    @app.get("/riders/{rider_id}/timeline", tags=["riders"])
    def rider_timeline(rider_id: str, limit: int = Query(200, ge=1, le=2000)) -> list[dict[str, Any]]:
        """Sessions oldest first, each with its scores. Drives the rider detail chart."""
        return svc.timeline(rider_id, limit)

    @app.get("/riders/{rider_id}/audit", tags=["riders"])
    def rider_audit(rider_id: str, limit: int = Query(100, ge=1, le=1000)) -> list[dict[str, Any]]:
        return svc.audit_log(rider_id, limit)

    # ------------------------------------------------------------------ decisions
    @app.get("/decisions", response_model=list[DecisionOut], tags=["decisions"])
    def list_decisions(level: str | None = Query(None, pattern="^L[0-4]$"),
                       min_level: int | None = Query(None, ge=0, le=4), rider_id: str | None = None,
                       unreviewed: bool = False, limit: int = Query(50, ge=1, le=500),
                       offset: int = Query(0, ge=0)) -> list[dict[str, Any]]:
        """Newest first. ``unreviewed=true&min_level=2`` is the review queue."""
        return svc.list_decisions(level=level, min_level=min_level, rider_id=rider_id,
                                  unreviewed=unreviewed, limit=limit, offset=offset)

    @app.get("/decisions/{decision_id}", response_model=DecisionOut, tags=["decisions"])
    def get_decision(decision_id: int) -> dict[str, Any]:
        return svc.get_decision(decision_id)

    @app.post("/decisions/{decision_id}/review", tags=["decisions"])
    def review_decision(decision_id: int, body: ReviewIn) -> dict[str, Any]:
        """A human reviewer's verdict: confirm a takeover (suspend) or dismiss (clear the account)."""
        return svc.review_decision(decision_id, body.takeover_confirmed, reviewer=body.reviewer, note=body.note)

    @app.get("/audit", tags=["decisions"])
    def audit(limit: int = Query(100, ge=1, le=1000)) -> list[dict[str, Any]]:
        return svc.audit_log(None, limit)

    # ------------------------------------------------------------------ stream
    @app.get("/stream", tags=["stream"])
    async def stream(request: Request) -> StreamingResponse:
        """Server-Sent Events: ``decision``, ``stepup``, ``review`` and ``lab`` events as they happen."""
        queue = svc.bus.subscribe()

        async def events():
            try:
                yield sse_message("hello", {"model_version": svc.metrics_summary()["model_version"]})
                while not await request.is_disconnected():
                    try:
                        message = await asyncio.wait_for(queue.get(), KEEPALIVE_SECONDS)
                    except asyncio.TimeoutError:
                        yield ": keepalive\n\n"
                        continue
                    yield sse_message(message.event, message.data)
            finally:
                svc.bus.unsubscribe(queue)

        return StreamingResponse(events(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    # ------------------------------------------------------------------ metrics
    @app.get("/metrics/summary", tags=["metrics"])
    def metrics_summary() -> dict[str, Any]:
        """Live KPIs. The ``simulation`` block compares decisions with the simulator's ground truth."""
        return svc.metrics_summary()

    @app.get("/metrics/compare", tags=["metrics"])
    def metrics_compare() -> dict[str, Any]:
        """Strict vs open vs naive vs Trust Juggler, plus the trade-off curve (from the offline evaluation)."""
        try:
            return svc.compare()
        except FileNotFoundError:
            raise HTTPException(404, "comparison data not found; run `python -m sim.evaluate --out docs/sample`") from None

    # ------------------------------------------------------------------ lab
    @app.get("/lab/scenarios", tags=["lab"])
    def lab_scenarios() -> list[dict[str, str]]:
        return lab.scenarios()

    @app.get("/lab/state", tags=["lab"])
    def lab_state() -> dict[str, Any]:
        return lab.state()

    @app.post("/lab/scenario", tags=["lab"])
    def lab_scenario(body: LabScenarioIn) -> dict[str, Any]:
        """Trigger a life event or an attack for a rider; optionally score the next ``steps`` sessions now."""
        try:
            return lab.trigger(body.rider_id, body.scenario, body.steps, body.auto_resolve)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

    @app.post("/lab/step", tags=["lab"])
    def lab_step(body: LabStepIn) -> list[dict[str, Any]]:
        """Generate and score the next sessions (one rider, or random riders)."""
        return lab.step(body.rider_id, body.count, body.auto_resolve)

    @app.post("/lab/run", tags=["lab"])
    async def lab_run(body: LabRunIn) -> dict[str, Any]:
        """Start or stop the background simulation at ``rate`` sessions per second."""
        if body.action == "start":
            try:
                lab.start(body.rate, body.auto_resolve)
            except ValueError as exc:
                raise HTTPException(422, str(exc)) from None
        else:
            lab.stop()
        return lab.state()

    @app.post("/lab/reset", tags=["lab"])
    async def lab_reset() -> dict[str, Any]:
        """Drop all data and rebuild the simulated world from scratch."""
        await asyncio.to_thread(lab.reset)
        return lab.state()

    return app
