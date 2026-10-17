"""Dataset record types. Ground-truth (``gt_*``) fields are for evaluation only."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.features import CONTEXT_FIELDS, HABIT_FEATURES
from engine.schemas import Session


@dataclass
class RiderMeta:
    rider_id: str
    archetype: str
    home_city: str
    scenario_kind: str = ""    # "", "life_event" or "attack"
    scenario: str = ""
    scenario_day: int = -1


@dataclass
class SessionRecord:
    session_id: str
    rider_id: str
    started_at: datetime
    day: int
    idx: int
    context: dict[str, str]
    habit: dict[str, float]
    gt_actor: str = "owner"        # "owner" or "other"
    gt_label: str = "honest"       # honest | life_event:<name> | attack:<name>
    gt_event: str = ""
    gt_event_day: int = -1
    gt_attack: str = ""
    gt_attack_day: int = -1

    def to_engine_session(self) -> Session:
        return Session(self.session_id, self.rider_id, self.started_at, self.context, self.habit)

    def to_payload(self) -> dict[str, Any]:
        """JSON body for ``POST /sessions/score`` (no ground truth)."""
        return {"session_id": self.session_id, "rider_id": self.rider_id,
                "started_at": self.started_at.isoformat(), "context": dict(self.context),
                "habit": {k: round(v, 4) for k, v in self.habit.items()}}

    def ground_truth(self) -> dict[str, Any]:
        return {"actor": self.gt_actor, "label": self.gt_label, "event": self.gt_event,
                "event_day": self.gt_event_day, "attack": self.gt_attack, "attack_day": self.gt_attack_day}

    CSV_COLUMNS = (("session_id", "rider_id", "started_at", "day", "idx") + CONTEXT_FIELDS
                   + HABIT_FEATURES + ("gt_actor", "gt_label", "gt_event", "gt_event_day",
                                       "gt_attack", "gt_attack_day"))

    def to_row(self) -> dict[str, Any]:
        row: dict[str, Any] = {"session_id": self.session_id, "rider_id": self.rider_id,
                               "started_at": self.started_at.isoformat(), "day": self.day, "idx": self.idx}
        row.update({c: self.context.get(c, "unknown") for c in CONTEXT_FIELDS})
        row.update({h: round(self.habit[h], 5) for h in HABIT_FEATURES})
        row.update(gt_actor=self.gt_actor, gt_label=self.gt_label, gt_event=self.gt_event,
                   gt_event_day=self.gt_event_day, gt_attack=self.gt_attack, gt_attack_day=self.gt_attack_day)
        return row

    @classmethod
    def from_row(cls, row: dict[str, str]) -> "SessionRecord":
        return cls(
            session_id=row["session_id"], rider_id=row["rider_id"],
            started_at=datetime.fromisoformat(row["started_at"]), day=int(row["day"]), idx=int(row["idx"]),
            context={c: row[c] for c in CONTEXT_FIELDS},
            habit={h: float(row[h]) for h in HABIT_FEATURES},
            gt_actor=row.get("gt_actor", "owner"), gt_label=row.get("gt_label", "honest"),
            gt_event=row.get("gt_event", ""), gt_event_day=int(row.get("gt_event_day", -1) or -1),
            gt_attack=row.get("gt_attack", ""), gt_attack_day=int(row.get("gt_attack_day", -1) or -1))
