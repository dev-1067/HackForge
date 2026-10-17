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

from . import partner, portal
from .auth import AuthContext, AuthService
from .deps import (COOKIE_NAME, any_user, company_user, current_context, ingest_access, rider_user)
from .errors import (AuthError, DuplicateSession, InvalidState, LabUnavailable, UnknownDecision, UnknownRider,
                     ValidationFailed)
from .lab import Lab
from .schemas import (CompanyLoginIn, CompanyRegisterIn, DecisionOut, DeviceChangeIn, LabRunIn, LabScenarioIn,
                      LabStepIn, PasswordIn, RequestIn, RespondIn, ReviewIn, RiderLoginIn, RiderRegisterIn,
                      SessionIn, StepupIn, VerificationIn)
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
    def start_session(request: Request, response: Response, user) -> dict[str, Any]:
        token, ctx, expires = auth.create_session(user)
        auth.record_sign_in(user.user_id, token, request.headers.get("user-agent"))
        response.set_cookie(COOKIE_NAME, token, httponly=True, samesite="lax", secure=settings.cookie_secure,
                            max_age=int((expires - datetime.now(timezone.utc).replace(tzinfo=None)).total_seconds()),
                            path="/")
        return {"user": ctx.public(), "csrf_token": ctx.csrf_token, "home": HOME_FOR_ROLE[ctx.role]}

    @app.post("/auth/rider/register", status_code=201, tags=["accounts"])
    def rider_register(body: RiderRegisterIn, request: Request, response: Response) -> dict[str, Any]:
        """Create a delivery rider account and sign in."""
        return start_session(request, response, auth.register_rider(body.name, body.phone, body.password))

    @app.post("/auth/rider/login", tags=["accounts"])
    def rider_login(body: RiderLoginIn, request: Request, response: Response) -> dict[str, Any]:
        return start_session(request, response, auth.login("rider", body.phone, body.password))

    @app.post("/auth/company/register", status_code=201, tags=["accounts"])
    def company_register(body: CompanyRegisterIn, request: Request, response: Response) -> dict[str, Any]:
        """Create an operations-team account. Needs the company invite code."""
        return start_session(request, response, auth.register_company_user(body.name, body.email, body.password, body.invite_code))

    @app.post("/auth/company/login", tags=["accounts"])
    def company_login(body: CompanyLoginIn, request: Request, response: Response) -> dict[str, Any]:
        return start_session(request, response, auth.login("company", body.email, body.password))

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


    @app.get("/me/rider/activity", tags=["rider portal"])
    def my_activity(limit: int = Query(40, ge=1, le=100), ctx: AuthContext = Depends(rider_user)) -> list[dict[str, Any]]:
        """Sign-ins, new phones, verification and request events for this rider, newest first."""
        return partner.activity_timeline(svc, ctx, limit)

    @app.get("/me/rider/account", tags=["rider portal"])
    def my_account_page(ctx: AuthContext = Depends(rider_user)) -> dict[str, Any]:
        """Account & Verification: profile, status, devices, verification history, a short check-up."""
        return partner.account_overview(svc, ctx)

    @app.post("/me/rider/device-change", status_code=201, tags=["rider portal"])
    def my_device_change(body: DeviceChangeIn, ctx: AuthContext = Depends(rider_user)) -> dict[str, Any]:
        """Tell the team that a device we saw is yours. Recorded for review; it does not change any check."""
        return partner.report_device_change(svc, ctx, body.device_id, body.note)

    @app.get("/me/rider/requests", tags=["rider portal"])
    def my_requests(ctx: AuthContext = Depends(rider_user)) -> list[dict[str, Any]]:
        return partner.list_requests(svc, ctx)

    @app.post("/me/rider/requests", status_code=201, tags=["rider portal"])
    def my_new_request(body: RequestIn, ctx: AuthContext = Depends(rider_user)) -> dict[str, Any]:
        """Ask for help or a human review."""
        return partner.create_request(svc, ctx, body.kind, body.message, body.device_id)

    @app.get("/me/rider/export", tags=["rider portal"])
    def my_export(ctx: AuthContext = Depends(rider_user)) -> JSONResponse:
        """Download the rider's own data as JSON."""
        return JSONResponse(partner.export_data(svc, ctx), headers={
            "Content-Disposition": 'attachment; filename="trust-juggler-my-data.json"'})

    # ------------------------------------------------------------------ any signed-in user
    @app.get("/me/sessions", tags=["accounts"])
    def my_sessions(request: Request, ctx: AuthContext = Depends(any_user)) -> list[dict[str, Any]]:
        """Where this account is signed in right now."""
        return auth.active_sessions(ctx.user_id, request.cookies.get(COOKIE_NAME))

    @app.post("/me/sessions/sign-out-others", tags=["accounts"])
    def sign_out_others(request: Request, ctx: AuthContext = Depends(any_user)) -> dict[str, int]:
        return {"signed_out": auth.revoke_other_sessions(ctx.user_id, request.cookies.get(COOKIE_NAME))}

    @app.post("/me/password", tags=["accounts"])
    def change_password(body: PasswordIn, request: Request, ctx: AuthContext = Depends(any_user)) -> dict[str, int]:
        """Change the password (needs the current one). Every other session is signed out."""
        others = auth.change_password(ctx.user_id, body.current_password, body.new_password,
                                      request.cookies.get(COOKIE_NAME))
        return {"signed_out_elsewhere": others}

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

    def bad_range(call):
        """Turn a bad date or range from the query string into a 422 instead of a crash."""
        try:
            return call()
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from None

    @ops.get("/riders", tags=["riders"])
    def list_riders(status: str | None = None, q: str | None = Query(None, max_length=80),
                    city: str | None = None, limit: int = Query(100, ge=1, le=500),
                    offset: int = Query(0, ge=0)) -> list[dict[str, Any]]:
        """Search by rider id, name or phone number (partial matches); filter by status and home city."""
        return svc.list_riders(status=status, q=q, city=city, limit=limit, offset=offset)

    @ops.get("/riders/{rider_id}", tags=["riders"])
    def get_rider(rider_id: str) -> dict[str, Any]:
        return svc.rider_detail(rider_id)

    @ops.get("/riders/{rider_id}/timeline", tags=["riders"])
    def rider_timeline(rider_id: str, limit: int = Query(200, ge=1, le=2000), since: str | None = None,
                       until: str | None = None, city: str | None = None,
                       device: str | None = Query(None, max_length=64)) -> list[dict[str, Any]]:
        """Sessions oldest first, each with its scores. Drives the rider detail chart."""
        return bad_range(lambda: svc.timeline(rider_id, limit, since=since, until=until, city=city, device=device))

    @ops.get("/riders/{rider_id}/audit", tags=["riders"])
    def rider_audit(rider_id: str, limit: int = Query(100, ge=1, le=1000)) -> list[dict[str, Any]]:
        return svc.audit_log(rider_id, limit)

    @ops.get("/decisions", response_model=list[DecisionOut], tags=["decisions"])
    def list_decisions(level: str | None = Query(None, pattern="^L[0-4]$"),
                       min_level: int | None = Query(None, ge=0, le=4), rider_id: str | None = None,
                       unreviewed: bool = False, limit: int = Query(50, ge=1, le=500),
                       offset: int = Query(0, ge=0), q: str | None = Query(None, max_length=80),
                       city: str | None = None, zone: str | None = None,
                       device: str | None = Query(None, max_length=64), since: str | None = None,
                       until: str | None = None,
                       case_status: str | None = Query(None, pattern="^(pending|completed)$"),
                       reviewer: str | None = None) -> list[dict[str, Any]]:
        """Newest first. ``unreviewed=true&min_level=2`` is the review queue.

        ``q`` matches rider id or name; ``since``/``until`` are ISO dates or times (UTC unless an offset is given).
        ``case_status`` limits to cases that were raised (extra check or worse) and are pending or completed."""
        return bad_range(lambda: svc.list_decisions(
            level=level, min_level=min_level, rider_id=rider_id, unreviewed=unreviewed, limit=limit, offset=offset,
            q=q, city=city, zone=zone, device=device, since=since, until=until, case_status=case_status,
            reviewer=reviewer))

    @ops.get("/decisions/{decision_id}", response_model=DecisionOut, tags=["decisions"])
    def get_decision(decision_id: int) -> dict[str, Any]:
        return svc.get_decision(decision_id)

    @ops.get("/sessions/{session_id}", response_model=DecisionOut, tags=["decisions"])
    def get_session_decision(session_id: str) -> dict[str, Any]:
        """The decision for one session, looked up by its session id (not the decision number)."""
        return svc.get_decision_by_session(session_id)

    @ops.get("/filters", tags=["decisions"])
    def filter_options() -> dict[str, Any]:
        """Cities, zones, history actions and reviewers that exist in the data, for filter drop-downs."""
        return svc.filter_options()

    @ops.post("/decisions/{decision_id}/review", tags=["decisions"])
    def review_decision(decision_id: int, body: ReviewIn, ctx: AuthContext = Depends(company_user)) -> dict[str, Any]:
        """A reviewer's verdict: confirm a takeover (suspend) or dismiss (clear the account)."""
        result = svc.review_decision(decision_id, body.takeover_confirmed, reviewer=ctx.name, note=body.note)
        lab.after_review(result["rider_id"], body.takeover_confirmed)
        return result


    @ops.get("/review-requests", tags=["rider requests"])
    def review_requests(status: str | None = Query(None, pattern="^(active|open|in_review|resolved|declined)$"),
                        rider_id: str | None = None, limit: int = Query(100, ge=1, le=300)) -> list[dict[str, Any]]:
        """Help and review requests from riders. ``status=active`` is open plus in review."""
        return partner.company_requests(svc, status, rider_id, limit)

    @ops.post("/review-requests/{request_id}/respond", tags=["rider requests"])
    def respond_request(request_id: int, body: RespondIn, ctx: AuthContext = Depends(company_user)) -> dict[str, Any]:
        """Start reviewing, resolve or decline a request. A reply is required to resolve or decline."""
        return partner.respond_to_request(svc, request_id, body.action, body.note, ctx.name)

    @ops.get("/audit", tags=["decisions"])
    def audit(limit: int = Query(100, ge=1, le=1000), offset: int = Query(0, ge=0),
              q: str | None = Query(None, max_length=80), action: str | None = None, reviewer: str | None = None,
              since: str | None = None, until: str | None = None) -> list[dict[str, Any]]:
        """History, newest first. ``q`` matches rider id or name, the action and who did it."""
        return bad_range(lambda: svc.audit_log(None, limit, offset=offset, q=q, action=action, reviewer=reviewer,
                                               since=since, until=until))

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
                lab.start(body.rate, body.auto_resolve, body.incidents)
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
