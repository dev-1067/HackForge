"""Development / demo accounts. Only created when TJ_SEED_DEMO_ACCOUNTS is on and a password is set."""
from __future__ import annotations

from .auth import AuthService
from .settings import Settings

DEMO_COMPANY_EMAIL = "ops@trustjuggler.demo"
# One account for each simulated rider. The simulated world numbers its riders R00000 upwards, so the sixty riders are
# R00000 to R00059. R00001 to R00003 stay first because the tests and the sign-in shortcuts rely on them.
DEMO_RIDERS = tuple(
    (f"Demo Rider {i}", f"900000{i:04d}", f"R{i:05d}")
    for i in (*range(1, 60), 0)
)


def seed_demo_accounts(auth: AuthService, settings: Settings) -> list[str]:
    """Idempotent. Returns the sign-in identifiers created or already present."""
    if not (settings.seed_demo_accounts and settings.demo_password):
        return []
    auth.provision_company_user("Demo Operator", DEMO_COMPANY_EMAIL, settings.demo_password)
    identifiers = [DEMO_COMPANY_EMAIL]
    for name, phone, rider_id in DEMO_RIDERS:
        if int(rider_id[1:]) >= settings.lab_riders:
            continue        # no simulated rider behind this account (the lab was started with fewer riders)
        auth.provision_rider_user(name, phone, settings.demo_password, rider_id, refresh_name=True)
        identifiers.append(phone)
    return identifiers
