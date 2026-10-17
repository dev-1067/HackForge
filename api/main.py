"""FastAPI application. Run with ``uvicorn api.asgi:app`` (docs at /docs)."""
from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from . import portal
from .auth import AuthContext, AuthService
from .deps import (COOKIE_NAME, any_user, company_user, current_context, ingest_access, rider_user)
from .errors import (AuthError, DuplicateSession, InvalidState, LabUnavailable, UnknownDecision, UnknownRider,
                     ValidationFailed)
from .lab import Lab
from .schemas import (CompanyLoginIn, CompanyRegisterIn, DecisionOut, LabRunIn, LabScenarioIn, LabStepIn,
                      ReviewIn, RiderLoginIn, RiderRegisterIn, SessionIn, StepupIn, VerificationIn)
from .seed import seed_demo_accounts
from .service import TrustService
from .settings import Settings

KEEPALIVE_SECONDS = 15.0
HOME_FOR_ROLE = {"rider": "/rider", "company": "/dashboard"}


def sse_message(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


def create_app(settings: Settings | None = None, service: TrustService | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    svc = service or TrustService(settings)
    auth = AuthService(svc.db, settings)
    lab = Lab(svc, settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        svc.bus.attach_loop(asyncio.get_running_loop())
        svc.startup()
        if settings.lab_enabled and settings.reset_on_start:
            await asyncio.to_thread(lab.build)
        await asyncio.to_thread(seed_demo_accounts, auth, settings)
        yield
        lab.stop()
        svc.close()

    app = FastAPI(
        title="Trust Juggler API",
        description="Continuous identity scoring for gig-platform riders. Scores each session against the "
                    "rider's own pattern and escalates only sessions that look like someone else took over. "
                    "Sign in with the /auth endpoints; operations endpoints need a company account, "
                    "rider endpoints (/me/...) need a rider account.",
        version="1.1.0", lifespan=lifespan)
    app.state.service, app.state.lab, app.state.auth, app.state.settings = svc, lab, auth, settings
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                       allow_methods=["*"], allow_headers=["*"])

    # ------------------------------------------------------------------ errors
    def problem(status: int, exc: Exception) -> JSONResponse:
        return JSONResponse({"detail": str(exc.args[0]) if exc.args else exc.__class__.__name__}, status_code=status)

    app.add_exception_handler(DuplicateSession, lambda r, e: problem(409, DuplicateSession(f"session already scored: {e}")))
    app.add_exception_handler(UnknownRider, lambda r, e: problem(404, UnknownRider(f"unknown rider: {e}")))
    app.add_exception_handler(UnknownDecision, lambda r, e: problem(404, UnknownDecision(f"unknown decision: {e}")))
    app.add_exception_handler(InvalidState, lambda r, e: problem(409, e))
    app.add_exception_handler(LabUnavailable, lambda r, e: problem(503, e))
    app.add_exception_handler(AuthError, lambda r, e: JSONResponse({"detail": e.detail}, status_code=e.status))
    app.add_exception_handler(
        ValidationFailed, lambda r, e: JSONResponse({"detail": str(e), "fields": e.fields}, status_code=422))

    # ------------------------------------------------------------------ public
    @app.get("/health", tags=["meta"])
    def health() -> dict[str, Any]:
        return {"status": "ok"}

    # ------------------------------------------------------------------ accounts
    def start_session(response: Response, user) -> dict[str, Any]:
        token, ctx, expires = auth.create_session(user)
        response.set_cookie(COOKIE_NAME, token, httponly=True, samesite="lax", secure=settings.cookie_secure,
                            max_age=int((expires - datetime.now(timezone.utc).replace(tzinfo=None)).total_seconds()),
                            path="/")
        return {"user": ctx.public(), "csrf_token": ctx.csrf_token, "home": HOME_FOR_ROLE[ctx.role]}

    @app.post("/auth/rider/register", status_code=201, tags=["accounts"])
    def rider_register(body: RiderRegisterIn, response: Response) -> dict[str, Any]:
        """Create a delivery rider account and sign in."""
        return start_session(response, auth.register_rider(body.name, body.phone, body.password))

    @app.post("/auth/rider/login", tags=["accounts"])
    def rider_login(body: RiderLoginIn, response: Response) -> dict[str, Any]:
        return start_session(response, auth.login("rider", body.phone, body.password))

    @app.post("/auth/company/register", status_code=201, tags=["accounts"])
    def company_register(body: CompanyRegisterIn, response: Response) -> dict[str, Any]:
        """Create an operations-team account. Needs the company invite code."""
        return start_session(response, auth.register_company_user(body.name, body.email, body.password, body.invite_code))

    @app.post("/auth/company/login", tags=["accounts"])
    def company_login(body: CompanyLoginIn, response: Response) -> dict[str, Any]:
        return start_session(response, auth.login("company", body.email, body.password))

    @app.post("/auth/logout", tags=["accounts"])
    def logout(request: Request, response: Response, _ctx: AuthContext = Depends(any_user)) -> dict[str, str]:
        auth.logout(request.cookies.get(COOKIE_NAME))
        response.delete_cookie(COOKIE_NAME, path="/")
        return {"status": "signed_out"}

    @app.get("/auth/me", tags=["accounts"])
    def me(request: Request) -> dict[str, Any]:
        """The signed-in user and the CSRF token to send as ``X-CSRF-Token`` on changes. 401 when signed out."""
        ctx = current_context(request)
        if ctx is None:
            raise AuthError(401, "Please sign in to continue.")
        return {"user": ctx.public(), "csrf_token": ctx.csrf_token, "home": HOME_FOR_ROLE[ctx.role]}

    # ------------------------------------------------------------------ rider portal
    @app.get("/me/rider", tags=["rider portal"])
    def my_account(ctx: AuthContext = Depends(rider_user)) -> dict[str, Any]:
        """The signed-in rider's own account: status, notices and recent activity (no internal scores)."""
        return portal.rider_overview(svc, ctx)

    @app.post("/me/rider/verification", tags=["rider portal"])
    def my_verification(body: VerificationIn, ctx: AuthContext = Depends(rider_user)) -> dict[str, Any]:
        """Answer an extra-check request: ``confirmed=true`` ("it is me") or false ("that was not me")."""
        return portal.submit_verification(svc, ctx, body.confirmed)

    # ------------------------------------------------------------------ scoring input
    @app.post("/sessions/score", response_model=DecisionOut, tags=["scoring"], dependencies=[Depends(ingest_access)])
    def score_session(body: SessionIn) -> dict[str, Any]:
        """Score one session and return the decision. Company session or ``X-Ingest-Key``."""
        try:
            return svc.score_payload(body.model_dump())
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

    # ------------------------------------------------------------------ operations (company only)
    ops = APIRouter(dependencies=[Depends(company_user)])

    @ops.post("/stepup/{rider_id}/result", tags=["scoring"])
    def stepup_result(rider_id: str, body: StepupIn) -> dict[str, Any]:
        """Report the outcome of a selfie / liveness check that an extra-check decision asked for."""
        return svc.stepup_result(rider_id, body.passed, method=body.method, session_id=body.session_id)

    @ops.get("/riders", tags=["riders"])
    def list_riders(status: str | None = None, q: str | None = None,
                    limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)) -> list[dict[str, Any]]:
        return svc.list_riders(status=status, q=q, limit=limit, offset=offset)

    @ops.get("/riders/{rider_id}", tags=["riders"])
    def get_rider(rider_id: str) -> dict[str, Any]:
        return svc.rider_detail(rider_id)

    @ops.get("/riders/{rider_id}/timeline", tags=["riders"])
    def rider_timeline(rider_id: str, limit: int = Query(200, ge=1, le=2000)) -> list[dict[str, Any]]:
        """Sessions oldest first, each with its scores. Drives the rider detail chart."""
        return svc.timeline(rider_id, limit)

    @ops.get("/riders/{rider_id}/audit", tags=["riders"])
    def rider_audit(rider_id: str, limit: int = Query(100, ge=1, le=1000)) -> list[dict[str, Any]]:
        return svc.audit_log(rider_id, limit)

    @ops.get("/decisions", response_model=list[DecisionOut], tags=["decisions"])
    def list_decisions(level: str | None = Query(None, pattern="^L[0-4]$"),
                       min_level: int | None = Query(None, ge=0, le=4), rider_id: str | None = None,
                       unreviewed: bool = False, limit: int = Query(50, ge=1, le=500),
                       offset: int = Query(0, ge=0)) -> list[dict[str, Any]]:
        """Newest first. ``unreviewed=true&min_level=2`` is the review queue."""
        return svc.list_decisions(level=level, min_level=min_level, rider_id=rider_id,
                                  unreviewed=unreviewed, limit=limit, offset=offset)

    @ops.get("/decisions/{decision_id}", response_model=DecisionOut, tags=["decisions"])
    def get_decision(decision_id: int) -> dict[str, Any]:
        return svc.get_decision(decision_id)

    @ops.post("/decisions/{decision_id}/review", tags=["decisions"])
    def review_decision(decision_id: int, body: ReviewIn, ctx: AuthContext = Depends(company_user)) -> dict[str, Any]:
        """A reviewer's verdict: confirm a takeover (suspend) or dismiss (clear the account)."""
        return svc.review_decision(decision_id, body.takeover_confirmed, reviewer=ctx.name, note=body.note)

    @ops.get("/audit", tags=["decisions"])
    def audit(limit: int = Query(100, ge=1, le=1000)) -> list[dict[str, Any]]:
        return svc.audit_log(None, limit)

    @ops.get("/stream", tags=["stream"])
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

    @ops.get("/metrics/summary", tags=["metrics"])
    def metrics_summary() -> dict[str, Any]:
        """Live KPIs. The ``simulation`` block compares decisions with the simulator's ground truth."""
        return svc.metrics_summary()

    @ops.get("/metrics/compare", tags=["metrics"])
    def metrics_compare() -> dict[str, Any]:
        """Strict vs open vs naive vs Trust Juggler, plus the trade-off curve (from the offline evaluation)."""
        try:
            return svc.compare()
        except FileNotFoundError:
            raise HTTPException(404, "comparison data not found; run `python -m sim.evaluate --out docs/sample`") from None

    @ops.get("/lab/scenarios", tags=["lab"])
    def lab_scenarios() -> list[dict[str, str]]:
        return lab.scenarios()

    @ops.get("/lab/state", tags=["lab"])
    def lab_state() -> dict[str, Any]:
        return lab.state()

    @ops.post("/lab/scenario", tags=["lab"])
    def lab_scenario(body: LabScenarioIn) -> dict[str, Any]:
        """Trigger a life event or an attack for a rider; optionally score the next ``steps`` sessions now."""
        try:
            return lab.trigger(body.rider_id, body.scenario, body.steps, body.auto_resolve)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

    @ops.post("/lab/step", tags=["lab"])
    def lab_step(body: LabStepIn) -> list[dict[str, Any]]:
        """Generate and score the next sessions (one rider, or random riders)."""
        return lab.step(body.rider_id, body.count, body.auto_resolve)

    @ops.post("/lab/run", tags=["lab"])
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

    @ops.post("/lab/reset", tags=["lab"])
    async def lab_reset() -> dict[str, Any]:
        """Drop all simulated rider data and rebuild the world from scratch. Accounts are kept."""
        await asyncio.to_thread(lab.reset)
        return lab.state()

    app.include_router(ops)
    return app
