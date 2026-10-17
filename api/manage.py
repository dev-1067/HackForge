"""Account provisioning: ``python -m api.manage --help``."""
from __future__ import annotations

import argparse
import getpass
import sys

from sqlalchemy import select

from .auth import AuthService
from .db import Database
from .errors import AuthError, ValidationFailed
from .models import UserRow
from .settings import Settings


def _password(args: argparse.Namespace) -> str:
    return args.password or getpass.getpass("Password: ")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Create and manage Trust Juggler accounts")
    sub = parser.add_subparsers(dest="command", required=True)
    company = sub.add_parser("create-company-user", help="add a member of the operations team")
    company.add_argument("--name", required=True)
    company.add_argument("--email", required=True)
    company.add_argument("--password")
    rider = sub.add_parser("create-rider", help="add a delivery rider account")
    rider.add_argument("--name", required=True)
    rider.add_argument("--phone", required=True)
    rider.add_argument("--rider-id", required=True, help="the rider id used by the scoring engine, e.g. R00001")
    rider.add_argument("--password")
    reset = sub.add_parser("set-password", help="reset a password (also signs the user out everywhere)")
    reset.add_argument("identifier", help="email or phone number")
    reset.add_argument("--password")
    sub.add_parser("list-users", help="list accounts (no secrets)")
    args = parser.parse_args(argv)

    settings = Settings.from_env()
    db = Database(settings.database_url)
    db.create_all()
    auth = AuthService(db, settings)
    try:
        if args.command == "create-company-user":
            user = auth.provision_company_user(args.name, args.email, _password(args))
            print(f"company user ready: {user.email}")
        elif args.command == "create-rider":
            user = auth.provision_rider_user(args.name, args.phone, _password(args), args.rider_id)
            print(f"rider ready: {user.phone} -> {user.rider_id}")
        elif args.command == "set-password":
            print("password updated" if auth.set_password(args.identifier, _password(args)) else "no such user")
        else:
            with db.session() as session:
                for u in session.scalars(select(UserRow).order_by(UserRow.user_id)):
                    print(f"{u.user_id:>4}  {u.role:<8} {u.email or u.phone:<32} {u.name}")
    except ValidationFailed as exc:
        print("; ".join(f"{k}: {v}" for k, v in exc.fields.items()), file=sys.stderr)
        return 2
    except AuthError as exc:
        print(exc.detail, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
