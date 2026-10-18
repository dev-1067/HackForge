"""Put a few demo riders into interesting states, using the real pipeline.

Run while the backend is up:  python scripts/setup_demo_states.py [http://localhost:8000]

Nothing is written to the database directly. Each rider is driven through the simulation lab, so the decisions, reasons and
history you then see were really produced by the scoring engine:

  R00002  an extra check is waiting for the rider ("Was this you?")
  R00009, R00017, R00020, R00041  open cases in Needs review (different staged takeovers)
  R00003  suspended after a reviewer confirmed a takeover (shows the rider's "account paused" page)

Sign-in details come from .env (TJ_DEMO_PASSWORD) and the demo operator account.
"""
import json
import os
import sys
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/")
EMAIL = "ops@trustjuggler.demo"


def password() -> str:
    if os.environ.get("TJ_DEMO_PASSWORD"):
        return os.environ["TJ_DEMO_PASSWORD"]
    env = Path(__file__).resolve().parent.parent / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("TJ_DEMO_PASSWORD="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return "demo-pass-123"


opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
csrf = ""


def call(path: str, body: dict | None = None, method: str | None = None):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(BASE + path, data=data, method=method or ("POST" if body is not None else "GET"))
    request.add_header("Content-Type", "application/json")
    if csrf:
        request.add_header("X-CSRF-Token", csrf)
    with opener.open(request, timeout=60) as response:
        return json.loads(response.read() or b"null")


def drive(rider: str, scenario: str, until_status: str, max_steps: int = 40) -> str:
    """Trigger a scenario for a rider and score sessions (no automatic answers) until they reach a status."""
    call("/lab/scenario", {"rider_id": rider, "scenario": scenario, "steps": 0, "auto_resolve": False})
    status = "active"
    for _ in range(max_steps):
        out = call("/lab/step", {"rider_id": rider, "count": 1, "auto_resolve": False})
        status = out[0]["status"]
        if status == until_status or (until_status == "any_flag" and status != "active" and status != "watch"):
            break
    return status


def main() -> None:
    global csrf
    csrf = call("/auth/company/login", {"email": EMAIL, "password": password()})["csrf_token"]
    call("/lab/reset", {})
    plan = [("R00002", "hard_handoff", "pending_stepup"), ("R00009", "credential_theft", "any_flag"),
            ("R00017", "timeshare_rental", "any_flag"), ("R00020", "gradual_sharing", "any_flag"),
            ("R00041", "slow_drift", "any_flag")]
    for rider, scenario, goal in plan:
        print(f"{rider}: {scenario} -> {drive(rider, scenario, goal)}")
    # R00003: a takeover that a reviewer confirms, so the account ends up suspended
    status = drive("R00003", "hard_handoff", "any_flag")
    case = call("/decisions?case_status=pending&q=R00003&limit=1")
    if case:
        call(f"/decisions/{case[0]['decision_id']}/review", {"takeover_confirmed": True, "note": "Demo: confirmed takeover"})
        status = "suspended"
    print(f"R00003: hard_handoff -> {status}")
    summary = call("/metrics/summary")
    print(f"Open cases now: {summary['open_cases']}")


if __name__ == "__main__":
    main()
