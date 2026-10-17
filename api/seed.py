"""Development / demo accounts. Only created when TJ_SEED_DEMO_ACCOUNTS is on and a password is set."""
from __future__ import annotations

from .auth import AuthService
from .settings import Settings

DEMO_COMPANY_EMAIL = "ops@trustjuggler.demo"
DEMO_RIDERS = (("Demo Rider One", "9000000001", "R00001"),
               ("Demo Rider Two", "9000000002", "R00002"),
               ("Demo Rider Three", "9000000003", "R00003"))


def seed_demo_accounts(auth: AuthService, settings: Settings) -> list[str]:
    """Idempotent. Returns the sign-in identifiers created or already present."""
    if not (settings.seed_demo_accounts and settings.demo_password):
        return []
    auth.provision_company_user("Demo Operator", DEMO_COMPANY_EMAIL, settings.demo_password)
    identifiers = [DEMO_COMPANY_EMAIL]
    for name, phone, rider_id in DEMO_RIDERS:
        auth.provision_rider_user(name, phone, settings.demo_password, rider_id)
        identifiers.append(phone)
    return identifiers
