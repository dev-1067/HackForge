"""Runtime configuration, read from environment variables (see .env.example)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _flag(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    return default if raw is None else raw.strip().lower() in ("1", "true", "yes", "on")


@dataclass
class Settings:
    database_url: str = "sqlite:///data/trustjuggler.db"
    model_path: Path | None = None            # None = the model shipped in engine/models/default.json
    compare_path: Path = ROOT / "docs" / "sample" / "compare.json"
    cors_origins: list[str] = field(default_factory=lambda: ["*"])
    reset_on_start: bool = True               # drop and re-seed the demo database at startup
    lab_enabled: bool = True
    lab_riders: int = 60
    lab_history_days: int = 30
    lab_seed: int = 11
    lab_owner_stepup_fail: float = 0.02       # simulated owner fails a selfie check
    lab_impostor_stepup_pass: float = 0.10    # simulated impostor passes a selfie check
    snapshot_every: int = 5                   # persist rider state every N quiet sessions

    @classmethod
    def from_env(cls) -> "Settings":
        model = os.environ.get("TJ_MODEL_PATH")
        return cls(
            database_url=os.environ.get("DATABASE_URL", cls.database_url),
            model_path=Path(model) if model else None,
            compare_path=Path(os.environ.get("TJ_COMPARE_PATH", str(cls.compare_path))),
            cors_origins=[o.strip() for o in os.environ.get("TJ_CORS_ORIGINS", "*").split(",") if o.strip()],
            reset_on_start=_flag("TJ_RESET_ON_START", True),
            lab_enabled=_flag("TJ_LAB_ENABLED", True),
            lab_riders=int(os.environ.get("TJ_LAB_RIDERS", cls.lab_riders)),
            lab_history_days=int(os.environ.get("TJ_LAB_HISTORY_DAYS", cls.lab_history_days)),
            lab_seed=int(os.environ.get("TJ_LAB_SEED", cls.lab_seed)),
        )
