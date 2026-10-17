"""Accounts and sign-in sessions: registration, login, throttling, session lookup."""
from __future__ import annotations

import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from .db import Database
from .errors import AuthError, ValidationFailed
from .models import AuthSessionRow, CompanyRow, LoginAttemptRow, RiderRow, UserRow
from .security import (burn_password_check, hash_password, identifier_digest, new_token, token_digest,
                       verify_password)
from .settings import Settings

PHONE_RE = re.compile(r"^\+?[0-9]{10,15}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
BAD_LOGIN = "That phone number, email or password is not right."
ROLES = ("rider", "company")


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@dataclass(frozen=True)
class AuthContext:
    user_id: int
    role: str
    name: str
    rider_id: str | None
    company_id: int | None
    csrf_token: str

    def public(self) -> dict:
        return {"user_id": self.user_id, "role": self.role, "name": self.name, "rider_id": self.rider_id}


def normalise_phone(raw: str) -> str:
    return re.sub(r"[\s\-()]", "", raw or "")


def validate_password(password: str, errors: dict[str, str]) -> None:
    if not password or len(password) < 8:
        errors["password"] = "Use at least 8 characters."
    elif len(password) > 128:
        errors["password"] = "That password is too long."
    elif password.strip() != password or password.isdigit():
        errors["password"] = "Use a mix of letters and numbers, without spaces at the ends."


def validate_name(name: str, errors: dict[str, str]) -> str:
    cleaned = re.sub(r"\s+", " ", (name or "").strip())
    if len(cleaned) < 2 or len(cleaned) > 80:
        errors["name"] = "Enter your full name."
    return cleaned


class AuthService:
    def __init__(self, db: Database, settings: Settings) -> None:
        self.db = db
        self.settings = settings

    # ------------------------------------------------------------------ registration
    def register_rider(self, name: str, phone: str, password: str) -> UserRow:
        errors: dict[str, str] = {}
        name = validate_name(name, errors)
        phone = normalise_phone(phone)
        if not PHONE_RE.match(phone):
            errors["phone"] = "Enter a valid mobile number (10 to 15 digits)."
        validate_password(password, errors)
        if errors:
            raise ValidationFailed(errors)
        with self.db.session() as db:
            if db.scalar(select(UserRow.user_id).where(UserRow.phone == phone)) is not None:
                raise AuthError(409, "An account with this phone number already exists. Try signing in.")
            rider_id = self._new_rider_id(db)
            now = utcnow()
            user = UserRow(role="rider", name=name, phone=phone, rider_id=rider_id,
                           password_hash=hash_password(password), created_at=now)
            db.add_all([RiderRow(rider_id=rider_id, archetype="unknown", status="active", created_at=now), user])
            return self._commit_user(db, user, "An account with this phone number already exists. Try signing in.")

    def register_company_user(self, name: str, email: str, password: str, invite_code: str) -> UserRow:
        if not self.settings.company_invite_code:
            raise AuthError(403, "Company sign-up is closed. Ask your administrator for an account.")
        errors: dict[str, str] = {}
        name = validate_name(name, errors)
        email = (email or "").strip().lower()
        if not EMAIL_RE.match(email) or len(email) > 160:
            errors["email"] = "Enter a valid work email."
        validate_password(password, errors)
        if errors:
            raise ValidationFailed(errors)
        if not secrets.compare_digest(invite_code or "", self.settings.company_invite_code):
            raise ValidationFailed({"invite_code": "That invite code is not valid."})
        with self.db.session() as db:
            if db.scalar(select(UserRow.user_id).where(UserRow.email == email)) is not None:
                raise AuthError(409, "An account with this email already exists. Try signing in.")
            company = self._ensure_company(db)
            user = UserRow(role="company", name=name, email=email, company_id=company.company_id,
                           password_hash=hash_password(password), created_at=utcnow())
            db.add(user)
            return self._commit_user(db, user, "An account with this email already exists. Try signing in.")

    def _commit_user(self, db: DbSession, user: UserRow, duplicate_message: str) -> UserRow:
        try:
            db.commit()
        except IntegrityError:  # two sign-ups racing for the same phone / email
            db.rollback()
            raise AuthError(409, duplicate_message) from None
        db.refresh(user)
        return user

    def _ensure_company(self, db: DbSession) -> CompanyRow:
        company = db.scalar(select(CompanyRow).where(CompanyRow.name == self.settings.company_name))
        if company is None:
            company = CompanyRow(name=self.settings.company_name, created_at=utcnow())
            db.add(company)
            db.flush()
        return company

    @staticmethod
    def _new_rider_id(db: DbSession) -> str:
        while True:
            candidate = "RD-" + secrets.token_hex(4).upper()
            if db.get(RiderRow, candidate) is None:
                return candidate

    # ------------------------------------------------------------------ sign in
    def login(self, role: str, identifier: str, password: str) -> UserRow:
        """Check credentials. Every failure looks the same to the caller."""
        if role not in ROLES:
            raise AuthError(400, "Unknown account type.")
        identifier = normalise_phone(identifier) if role == "rider" else (identifier or "").strip().lower()
        key = identifier_digest(role, identifier)
        now = utcnow()
        with self.db.session() as db:
            window = now - timedelta(minutes=self.settings.lockout_minutes)
            failures = db.scalar(select(func.count()).select_from(LoginAttemptRow).where(
                LoginAttemptRow.key_hash == key, LoginAttemptRow.at >= window,
                LoginAttemptRow.success.is_(False))) or 0
            if failures >= self.settings.max_failed_logins:
                raise AuthError(429, f"Too many attempts. Try again in {self.settings.lockout_minutes} minutes.")
            column = UserRow.phone if role == "rider" else UserRow.email
            user = db.scalar(select(UserRow).where(UserRow.role == role, column == identifier))
            ok = False
            if user is not None and user.is_active:
                ok = verify_password(password or "", user.password_hash)
            else:
                burn_password_check(password or "")
            db.add(LoginAttemptRow(key_hash=key, at=now, success=ok))
            if ok:
                db.execute(delete(LoginAttemptRow).where(LoginAttemptRow.key_hash == key))
                user.last_login_at = now
            db.commit()
            if not ok:
                raise AuthError(401, BAD_LOGIN)
            db.refresh(user)
            return user

    # ------------------------------------------------------------------ sessions
    def create_session(self, user: UserRow) -> tuple[str, AuthContext, datetime]:
        token, csrf = new_token(), new_token()
        hours = self.settings.rider_session_hours if user.role == "rider" else self.settings.company_session_hours
        now = utcnow()
        expires = now + timedelta(hours=hours)
        with self.db.session() as db:
            db.execute(delete(AuthSessionRow).where(AuthSessionRow.expires_at < now))
            db.add(AuthSessionRow(token_hash=token_digest(token), user_id=user.user_id, csrf_token=csrf,
                                  created_at=now, expires_at=expires, last_seen_at=now))
            db.commit()
        return token, self._context(user, csrf), expires

    def resolve(self, token: str | None) -> AuthContext | None:
        if not token:
            return None
        now = utcnow()
        with self.db.session() as db:
            session = db.get(AuthSessionRow, token_digest(token))
            if session is None:
                return None
            if session.expires_at < now:
                db.delete(session)
                db.commit()
                return None
            user = db.get(UserRow, session.user_id)
            if user is None or not user.is_active:
                return None
            if (now - session.last_seen_at) > timedelta(minutes=5):
                session.last_seen_at = now
                db.commit()
            return self._context(user, session.csrf_token)

    def logout(self, token: str | None) -> None:
        if not token:
            return
        with self.db.session() as db:
            db.execute(delete(AuthSessionRow).where(AuthSessionRow.token_hash == token_digest(token)))
            db.commit()

    @staticmethod
    def _context(user: UserRow, csrf: str) -> AuthContext:
        return AuthContext(user.user_id, user.role, user.name, user.rider_id, user.company_id, csrf)

    # ------------------------------------------------------------------ provisioning (CLI / demo seed)
    def provision_company_user(self, name: str, email: str, password: str) -> UserRow:
        errors: dict[str, str] = {}
        name = validate_name(name, errors)
        email = (email or "").strip().lower()
        if not EMAIL_RE.match(email):
            errors["email"] = "Enter a valid work email."
        validate_password(password, errors)
        if errors:
            raise ValidationFailed(errors)
        with self.db.session() as db:
            existing = db.scalar(select(UserRow).where(UserRow.email == email))
            if existing is not None:
                return existing
            company = self._ensure_company(db)
            user = UserRow(role="company", name=name, email=email, company_id=company.company_id,
                           password_hash=hash_password(password), created_at=utcnow())
            db.add(user)
            return self._commit_user(db, user, "That email is already registered.")

    def provision_rider_user(self, name: str, phone: str, password: str, rider_id: str) -> UserRow:
        errors: dict[str, str] = {}
        name = validate_name(name, errors)
        phone = normalise_phone(phone)
        if not PHONE_RE.match(phone):
            errors["phone"] = "Enter a valid mobile number (10 to 15 digits)."
        validate_password(password, errors)
        if errors:
            raise ValidationFailed(errors)
        with self.db.session() as db:
            existing = db.scalar(select(UserRow).where(UserRow.phone == phone))
            if existing is not None:
                return existing
            if db.get(RiderRow, rider_id) is None:
                db.add(RiderRow(rider_id=rider_id, archetype="unknown", status="active", created_at=utcnow()))
            user = UserRow(role="rider", name=name, phone=phone, rider_id=rider_id,
                           password_hash=hash_password(password), created_at=utcnow())
            db.add(user)
            return self._commit_user(db, user, "That phone number or rider is already registered.")

    def set_password(self, identifier: str, password: str) -> bool:
        errors: dict[str, str] = {}
        validate_password(password, errors)
        if errors:
            raise ValidationFailed(errors)
        ident = identifier.strip().lower()
        with self.db.session() as db:
            user = db.scalar(select(UserRow).where((UserRow.email == ident) | (UserRow.phone == normalise_phone(ident))))
            if user is None:
                return False
            user.password_hash = hash_password(password)
            db.execute(delete(AuthSessionRow).where(AuthSessionRow.user_id == user.user_id))
            db.commit()
            return True
