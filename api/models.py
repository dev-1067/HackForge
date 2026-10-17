"""Database schema."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, String
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
