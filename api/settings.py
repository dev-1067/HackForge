"""Runtime configuration, read from environment variables (see .env.example)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ORIGINS = ["http://localhost:5173", "http://localhost:4173", "http://127.0.0.1:5173"]


def load_dotenv(path: Path = ROOT / ".env") -> None:
    """Minimal .env reader: KEY=VALUE lines; real environment variables always win."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _flag(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    return default if raw is None else raw.strip().lower() in ("1", "true", "yes", "on")


@dataclass
class Settings:
    database_url: str = "sqlite:///data/trustjuggler.db"
    model_path: Path | None = None            # None = the model shipped in engine/models/default.json
    compare_path: Path = ROOT / "docs" / "sample" / "compare.json"
    cors_origins: list[str] = field(default_factory=lambda: list(DEFAULT_ORIGINS))
    reset_on_start: bool = True               # demo mode: clear simulated rider data at startup (accounts are kept)
    lab_enabled: bool = True
    lab_riders: int = 60
    lab_history_days: int = 30
    lab_seed: int = 11
    lab_owner_stepup_fail: float = 0.02       # simulated owner fails a selfie check
    lab_impostor_stepup_pass: float = 0.10    # simulated impostor passes a selfie check
    stepup_expiry_minutes: int = 60           # an unanswered extra check becomes an on-hold case for a person (0 = never)
    snapshot_every: int = 5                   # persist rider state every N quiet sessions

    # accounts and sessions
    company_name: str = "Trust Juggler Demo Fleet"
    company_invite_code: str = ""             # empty = company self-registration is closed
    ingest_key: str = ""                      # optional X-Ingest-Key for the rider app / pipelines
    rider_session_hours: int = 24 * 7
    company_session_hours: int = 12
    cookie_secure: bool = False               # set true behind HTTPS
    max_failed_logins: int = 5                # per account, per window
    lockout_minutes: int = 15
    seed_demo_accounts: bool = False
    demo_password: str = ""                   # used only when seed_demo_accounts is on

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()
        env = os.environ.get
        model = env("TJ_MODEL_PATH")
        origins = env("TJ_CORS_ORIGINS")
        return cls(
            database_url=env("DATABASE_URL", cls.database_url),
            model_path=Path(model) if model else None,
            compare_path=Path(env("TJ_COMPARE_PATH", str(cls.compare_path))),
            cors_origins=[o.strip() for o in origins.split(",") if o.strip()] if origins else list(DEFAULT_ORIGINS),
            reset_on_start=_flag("TJ_RESET_ON_START", True),
            lab_enabled=_flag("TJ_LAB_ENABLED", True),
            lab_riders=int(env("TJ_LAB_RIDERS", cls.lab_riders)),
            lab_history_days=int(env("TJ_LAB_HISTORY_DAYS", cls.lab_history_days)),
            lab_seed=int(env("TJ_LAB_SEED", cls.lab_seed)),
            stepup_expiry_minutes=int(env("TJ_STEPUP_EXPIRY_MINUTES", cls.stepup_expiry_minutes)),
            company_name=env("TJ_COMPANY_NAME", cls.company_name),
            company_invite_code=env("TJ_COMPANY_INVITE_CODE", ""),
            ingest_key=env("TJ_INGEST_KEY", ""),
            rider_session_hours=int(env("TJ_RIDER_SESSION_HOURS", cls.rider_session_hours)),
            company_session_hours=int(env("TJ_COMPANY_SESSION_HOURS", cls.company_session_hours)),
            cookie_secure=_flag("TJ_COOKIE_SECURE", False),
            seed_demo_accounts=_flag("TJ_SEED_DEMO_ACCOUNTS", False),
            demo_password=env("TJ_DEMO_PASSWORD", ""),
        )
