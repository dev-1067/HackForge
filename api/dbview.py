"""A read-only look at the database, for operations staff and for showing the data model to others.

Secrets (password hashes, session tokens, CSRF tokens, login-attempt keys) are never returned. Phone numbers and
e-mail addresses are masked. Every table is read through the same SQLAlchemy models the application itself uses.
"""
from __future__ import annotations

import json
import os
from typing import Any

from sqlalchemy import String, Text, cast, func, or_, select
from sqlalchemy.engine import make_url

from .db import Database
from .errors import ValidationFailed
from .models import DEMO_TABLES, Base

REDACTED = {"password_hash", "token_hash", "csrf_token", "key_hash", "fingerprint"}
MASKED = {"phone", "email"}
TABLE_NOTES = {
    "riders": "One row per rider: status, home city, last decision. Demo data.",
    "sessions": "Every session scored: context and habit signals as JSON. Demo data.",
    "decisions": "The engine's decision for each session, with reasons and review outcome. Demo data.",
    "stepup_events": "Extra checks asked of riders and how they ended. Demo data.",
    "rider_profiles": "Each rider's learned baseline (JSON snapshot). Demo data.",
    "audit_log": "Who did what: reviews, extra checks, request replies. Append-only. Demo data.",
    "companies": "Fleet companies.",
    "users": "Rider and operations accounts (password hashes are never shown).",
    "auth_sessions": "Who is signed in (token hashes are never shown).",
    "login_attempts": "Recent sign-in attempts, used for lockout (keys are never shown).",
    "sign_in_events": "Every successful sign-in with a short browser label.",
    "review_requests": "Help and review requests from riders and the team's replies.",
    "notification_reads": "When each rider last opened their notifications.",
}
CELL_LIMIT = 160


def _mask(column: str, value: Any) -> Any:
    if value is None or not isinstance(value, str):
        return value
    if column == "phone":
        return "••••" + value[-4:] if len(value) > 4 else "••••"
    if column == "email":
        name, _, domain = value.partition("@")
        return f"{name[:1]}•••@{domain}" if domain else "•••"
    return value


def _cell(column: str, value: Any) -> Any:
    if column in REDACTED:
        return "hidden"
    if column in MASKED:
        return _mask(column, value)
    if isinstance(value, (dict, list)):
        text = json.dumps(value, default=str)
        return text if len(text) <= CELL_LIMIT else text[:CELL_LIMIT] + "…"
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, str) and len(value) > CELL_LIMIT:
        return value[:CELL_LIMIT] + "…"
    return value


def _tables() -> dict[str, Any]:
    return {t.name: t for t in Base.metadata.sorted_tables}


def describe_connection(db: Database) -> dict[str, Any]:
    url = make_url(str(db.engine.url))
    info: dict[str, Any] = {"engine": url.get_backend_name(), "name": url.database}
    if url.get_backend_name() == "sqlite":
        info["name"] = url.database or "in memory"
        if url.database and os.path.exists(url.database):
            info["size_kb"] = round(os.path.getsize(url.database) / 1024, 1)
        info["how_to_open"] = ("Open the file with DB Browser for SQLite, the sqlite3 command line, or the SQLite extension in your editor. "
                               "It is a normal SQLite 3 file.")
    else:
        info["host"] = url.host
        info["port"] = url.port
        info["how_to_open"] = "Connect any PostgreSQL client (psql, pgAdmin, DBeaver) with the same host, port, database and user as DATABASE_URL."
    return info


def overview(db: Database) -> dict[str, Any]:
    demo = {t.name for t in DEMO_TABLES}
    tables = []
    with db.session() as session:
        for name, table in _tables().items():
            tables.append({
                "name": name, "rows": session.scalar(select(func.count()).select_from(table)) or 0,
                "note": TABLE_NOTES.get(name, ""), "demo": name in demo,
                "columns": [{"name": c.name, "type": str(c.type), "primary_key": c.primary_key,
                             "foreign_key": next((fk.target_fullname for fk in c.foreign_keys), None),
                             "hidden": c.name in REDACTED, "masked": c.name in MASKED} for c in table.columns],
            })
    return {"connection": describe_connection(db), "tables": tables}


def rows(db: Database, name: str, *, limit: int = 50, offset: int = 0, q: str | None = None) -> dict[str, Any]:
    table = _tables().get(name)
    if table is None:
        raise ValidationFailed({"table": f"There is no table called '{name}'."})
    text_columns = [c for c in table.columns if c.name not in REDACTED and c.name not in MASKED
                    and isinstance(c.type, (String, Text))]
    stmt = select(table)
    count = select(func.count()).select_from(table)
    if q and q.strip():
        like = "%" + q.strip().lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        conds = [func.lower(c).like(like, escape="\\") for c in text_columns]
        conds += [func.lower(cast(c, String)).like(like, escape="\\") for c in table.columns
                  if c.name not in REDACTED and c.name not in MASKED and c not in text_columns and c.type.__class__.__name__ in ("Integer", "Float")]
        if conds:
            stmt, count = stmt.where(or_(*conds)), count.where(or_(*conds))
    pk = list(table.primary_key.columns)
    if pk:
        stmt = stmt.order_by(*[c.desc() for c in pk])
    with db.session() as session:
        total = session.scalar(count) or 0
        data = session.execute(stmt.limit(limit).offset(offset)).mappings().all()
    return {"table": name, "total": total, "limit": limit, "offset": offset,
            "columns": [c.name for c in table.columns],
            "rows": [{col: _cell(col, row[col]) for col in table.columns.keys()} for row in data]}
