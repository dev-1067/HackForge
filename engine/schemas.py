"""Input/output types shared with the API layer."""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .features import CONTEXT_FIELDS, HABIT_FEATURES

LEVELS = ("L0", "L1", "L2", "L3", "L4")
ACTIONS = {
    0: "allow",
    1: "allow_monitor",
    2: "step_up_selfie",
    3: "hold_payouts_review",
    4: "suspend_pending_review",
}


@dataclass(frozen=True)
class Session:
    """One login/session as seen by the engine. Never contains ground truth."""

    session_id: str
    rider_id: str
    started_at: datetime
    context: dict[str, str]
    habit: dict[str, float]

    @property
    def local_hour(self) -> float:
        return self.started_at.hour + self.started_at.minute / 60.0

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Session":
        """Build and validate a Session from an API payload (raises ValueError)."""
        try:
            rider_id = str(data["rider_id"])
            raw_ts = data["started_at"]
            habit_in = data["habit"]
        except KeyError as exc:
            raise ValueError(f"missing required field: {exc.args[0]}") from None
        if isinstance(raw_ts, datetime):
            started_at = raw_ts
        else:
            try:
                started_at = datetime.fromisoformat(str(raw_ts).replace("Z", "+00:00"))
            except ValueError:
                raise ValueError(f"started_at is not an ISO-8601 timestamp: {raw_ts!r}") from None

        habit: dict[str, float] = {}
        for name in HABIT_FEATURES:
            if name not in habit_in:
                raise ValueError(f"missing habit feature: {name}")
            try:
                value = float(habit_in[name])
            except (TypeError, ValueError):
                raise ValueError(f"habit feature {name} is not a number") from None
            if not math.isfinite(value):
                raise ValueError(f"habit feature {name} is not finite")
            habit[name] = value

        ctx_in = data.get("context") or {}
        context = {name: str(ctx_in.get(name, "unknown")) for name in CONTEXT_FIELDS}
        session_id = str(data.get("session_id") or f"{rider_id}@{started_at.isoformat()}")
        return cls(session_id, rider_id, started_at, context, habit)


@dataclass
class Decision:
    session_id: str
    rider_id: str
    level: str
    action: str
    status: str
    context_score: float
    habit_score: float
    evidence_score: float
    threshold: float
    habit_deviation: float = 0.0
    reasons: list[dict[str, Any]] = field(default_factory=list)
    model_version: str = ""

    @property
    def level_index(self) -> int:
        return LEVELS.index(self.level)

    def to_dict(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "rider_id": self.rider_id,
            "level": self.level,
            "action": self.action,
            "status": self.status,
            "context_score": round(self.context_score, 4),
            "habit_score": round(self.habit_score, 4),
            "evidence_score": round(self.evidence_score, 3),
            "threshold": round(self.threshold, 3),
            "habit_deviation": round(self.habit_deviation, 3),
            "reasons": self.reasons,
            "model_version": self.model_version,
        }
