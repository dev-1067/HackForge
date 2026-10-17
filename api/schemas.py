"""Request and response models (these are what /docs shows)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class SessionIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {
        "rider_id": "R10432", "started_at": "2026-03-01T18:04:11",
        "context": {"device_id": "d_91af", "os": "Android 14", "app_version": "5.2.1", "ip_asn": "AS55836",
                    "city": "Pune", "zone": "Z7", "network_type": "4g"},
        "habit": {"accept_latency_ms": 1840, "tap_interval_ms": 212, "swipe_speed": 0.61,
                  "avg_speed_kmh": 23.4, "route_deviation": 0.18, "idle_gap_min": 6.2,
                  "cancel_rate": 0.04, "accept_rate": 0.91, "orders_per_hour": 2.1}}})

    session_id: str | None = Field(None, max_length=96, description="Generated if omitted. Must be unique.")
    rider_id: str = Field(min_length=1, max_length=64)
    started_at: datetime = Field(description="Rider-local time; hour and minute are used as sent.")
    context: dict[str, str] = Field(default_factory=dict)
    habit: dict[str, float]
    archetype: str | None = Field(None, description="Rider type for a first-seen rider (cold-start prior).")


class DecisionOut(BaseModel):
    decision_id: int
    session_id: str
    rider_id: str
    decided_at: str
    started_at: str | None = None
    level: Literal["L0", "L1", "L2", "L3", "L4"]
    action: str
    status: str
    context_score: float
    habit_score: float
    evidence_score: float
    threshold: float
    habit_deviation: float
    context_flags: list[str]
    reasons: list[dict[str, Any]]
    model_version: str
    review_verdict: str | None = None
    reviewed_by: str | None = None
    reviewed_at: str | None = None
    context: dict[str, str | None] | None = None
    source: str | None = None
    ground_truth: dict[str, Any] | None = Field(None, description="Simulation only.")
    resolution: dict[str, Any] | None = Field(None, description="Lab only: how the step-up / review played out.")


class StepupIn(BaseModel):
    passed: bool
    method: str = Field("selfie", max_length=24)
    session_id: str | None = None


class ReviewIn(BaseModel):
    takeover_confirmed: bool
    reviewer: str = Field("reviewer", min_length=1, max_length=64)
    note: str | None = Field(None, max_length=500)


class LabScenarioIn(BaseModel):
    rider_id: str
    scenario: str
    steps: int = Field(0, ge=0, le=50, description="Sessions to generate and score right away.")
    auto_resolve: bool = True


class LabStepIn(BaseModel):
    rider_id: str | None = None
    count: int = Field(1, ge=1, le=200)
    auto_resolve: bool = True


class LabRunIn(BaseModel):
    action: Literal["start", "stop"]
    rate: float = Field(2.0, gt=0, le=100, description="Sessions per second.")
    auto_resolve: bool = True
