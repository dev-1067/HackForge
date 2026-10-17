"""Database schema."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class RiderRow(Base):
    __tablename__ = "riders"

    rider_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    archetype: Mapped[str] = mapped_column(String(32), default="unknown")
    home_city: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="active", index=True)
    sessions_seen: Mapped[int] = mapped_column(Integer, default=0)
    last_level: Mapped[str] = mapped_column(String(2), default="L0")
    last_evidence: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class SessionRow(Base):
    __tablename__ = "sessions"
    __table_args__ = (Index("ix_sessions_rider_started", "rider_id", "started_at"),)

    session_id: Mapped[str] = mapped_column(String(96), primary_key=True)
    rider_id: Mapped[str] = mapped_column(String(64), ForeignKey("riders.rider_id"))
    started_at: Mapped[datetime] = mapped_column(DateTime)
    context: Mapped[dict[str, Any]] = mapped_column(JSON)
    habit: Mapped[dict[str, Any]] = mapped_column(JSON)
    source: Mapped[str] = mapped_column(String(8), default="api")  # api | lab | seed
    # simulation only: never read by the engine
    gt_actor: Mapped[str | None] = mapped_column(String(8), nullable=True)
    gt_label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class DecisionRow(Base):
    __tablename__ = "decisions"
    __table_args__ = (
        Index("ix_decisions_level_time", "level_num", "decided_at"),
        Index("ix_decisions_rider_time", "rider_id", "decided_at"),
    )

    decision_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(96), ForeignKey("sessions.session_id"), unique=True)
    rider_id: Mapped[str] = mapped_column(String(64), ForeignKey("riders.rider_id"))
    decided_at: Mapped[datetime] = mapped_column(DateTime)
    level: Mapped[str] = mapped_column(String(2))
    level_num: Mapped[int] = mapped_column(Integer)
    action: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(24))
    context_score: Mapped[float] = mapped_column(Float)
    habit_score: Mapped[float] = mapped_column(Float)
    evidence_score: Mapped[float] = mapped_column(Float)
    threshold: Mapped[float] = mapped_column(Float)
    habit_deviation: Mapped[float] = mapped_column(Float, default=0.0)
    context_flags: Mapped[list[str]] = mapped_column(JSON, default=list)
    reasons: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    model_version: Mapped[str] = mapped_column(String(24))
    review_verdict: Mapped[str | None] = mapped_column(String(24), nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class StepupRow(Base):
    __tablename__ = "stepup_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rider_id: Mapped[str] = mapped_column(String(64), ForeignKey("riders.rider_id"), index=True)
    session_id: Mapped[str | None] = mapped_column(String(96), nullable=True)
    method: Mapped[str] = mapped_column(String(24), default="selfie")
    issued_at: Mapped[datetime] = mapped_column(DateTime)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    result: Mapped[str] = mapped_column(String(8), default="pending")  # pending | passed | failed


class ProfileRow(Base):
    __tablename__ = "rider_profiles"

    rider_id: Mapped[str] = mapped_column(String(64), ForeignKey("riders.rider_id"), primary_key=True)
    profile: Mapped[dict[str, Any]] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class AuditRow(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rider_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    actor: Mapped[str] = mapped_column(String(64))  # system | reviewer:<id> | lab
    action: Mapped[str] = mapped_column(String(48))
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    at: Mapped[datetime] = mapped_column(DateTime)


# ---------------------------------------------------------------------------- accounts
class CompanyRow(Base):
    __tablename__ = "companies"

    company_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class UserRow(Base):
    """A person who can sign in: a delivery rider or a member of the company's operations team."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('rider', 'company')", name="ck_users_role"),
        CheckConstraint(
            "(role = 'rider' AND phone IS NOT NULL AND rider_id IS NOT NULL AND company_id IS NULL) OR "
            "(role = 'company' AND email IS NOT NULL AND company_id IS NOT NULL AND rider_id IS NULL)",
            name="ck_users_role_fields"),
    )

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role: Mapped[str] = mapped_column(String(16), index=True)
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str | None] = mapped_column(String(160), unique=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    # Soft reference to riders.rider_id: demo data can be reset without deleting accounts.
    rider_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    company_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("companies.company_id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class AuthSessionRow(Base):
    __tablename__ = "auth_sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    csrf_token: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime)


class LoginAttemptRow(Base):
    __tablename__ = "login_attempts"
    __table_args__ = (Index("ix_login_attempts_key_time", "key_hash", "at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key_hash: Mapped[str] = mapped_column(String(64))
    at: Mapped[datetime] = mapped_column(DateTime)
    success: Mapped[bool] = mapped_column(Boolean)


class SignInEventRow(Base):
    """One successful sign-in. Lets a person see where they are signed in and spot a new browser."""

    __tablename__ = "sign_in_events"
    __table_args__ = (Index("ix_sign_in_events_user_time", "user_id", "at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"))
    at: Mapped[datetime] = mapped_column(DateTime)
    browser_label: Mapped[str] = mapped_column(String(80))          # e.g. "Chrome on Windows"
    fingerprint: Mapped[str] = mapped_column(String(32))            # digest of the label, to spot a new browser
    is_new_browser: Mapped[bool] = mapped_column(Boolean, default=False)
    token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)


REQUEST_KINDS = ("unfamiliar_signin", "verification_help", "legitimate_change", "human_review", "device_change", "other")
REQUEST_STATUSES = ("open", "in_review", "resolved", "declined")


class ReviewRequestRow(Base):
    """A rider asking for help or a human review, or reporting a device change they recognise."""

    __tablename__ = "review_requests"
    __table_args__ = (
        CheckConstraint("kind IN ('unfamiliar_signin','verification_help','legitimate_change','human_review','device_change','other')",
                        name="ck_review_requests_kind"),
        CheckConstraint("status IN ('open','in_review','resolved','declined')", name="ck_review_requests_status"),
        Index("ix_review_requests_status_time", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rider_id: Mapped[str] = mapped_column(String(64), index=True)   # soft reference, like users.rider_id
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(24))
    message: Mapped[str] = mapped_column(String(1000))
    device_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    response_note: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    responded_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


# Tables holding simulated / operational data. Accounts and sign-in sessions are never reset.
DEMO_TABLES = [RiderRow.__table__, SessionRow.__table__, DecisionRow.__table__, StepupRow.__table__,
               ProfileRow.__table__, AuditRow.__table__]
