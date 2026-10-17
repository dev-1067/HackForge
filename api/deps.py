"""Request-scoped helpers: who is calling, and are they allowed to?"""
from __future__ import annotations

import secrets
from typing import Callable

from fastapi import Request

from .auth import AuthContext, AuthService
from .errors import AuthError
from .service import TrustService

COOKIE_NAME = "tj_session"
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def get_service(request: Request) -> TrustService:
    return request.app.state.service


def get_auth(request: Request) -> AuthService:
    return request.app.state.auth


def current_context(request: Request) -> AuthContext | None:
    """The signed-in user behind this request's cookie, if any (resolved once per request)."""
    if not hasattr(request.state, "auth_ctx"):
        request.state.auth_ctx = get_auth(request).resolve(request.cookies.get(COOKIE_NAME))
    return request.state.auth_ctx


def check_csrf(request: Request, ctx: AuthContext) -> None:
    """State-changing calls must echo the token the server issued for this sign-in session."""
    if request.method in UNSAFE_METHODS:
        sent = request.headers.get("x-csrf-token", "")
        if not secrets.compare_digest(sent, ctx.csrf_token):
            raise AuthError(403, "Your session could not be verified. Refresh the page and try again.")


def require_role(*roles: str) -> Callable[[Request], AuthContext]:
    def dependency(request: Request) -> AuthContext:
        ctx = current_context(request)
        if ctx is None:
            raise AuthError(401, "Please sign in to continue.")
        if ctx.role not in roles:
            raise AuthError(403, "You do not have access to this page.")
        check_csrf(request, ctx)
        return ctx

    return dependency


any_user = require_role("rider", "company")
company_user = require_role("company")
rider_user = require_role("rider")


def ingest_access(request: Request) -> AuthContext | None:
    """Scoring input may come from a signed-in company user or from a service holding the ingest key."""
    key = request.app.state.settings.ingest_key
    sent = request.headers.get("x-ingest-key", "")
    if key and sent and secrets.compare_digest(sent, key):
        return None
    return company_user(request)
