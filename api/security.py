"""Password hashing and token helpers (standard library only)."""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

SCRYPT_N, SCRYPT_R, SCRYPT_P, KEY_LEN = 2 ** 14, 8, 1, 32


def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def hash_password(password: str) -> str:
    """``scrypt$N$r$p$salt$hash``; a fresh random salt per password."""
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=KEY_LEN)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, expected = stored.split("$")
        if scheme != "scrypt":
            return False
        digest = hashlib.scrypt(password.encode(), salt=base64.b64decode(salt), n=int(n), r=int(r),
                                p=int(p), dklen=KEY_LEN)
        return hmac.compare_digest(digest, base64.b64decode(expected))
    except (ValueError, TypeError):
        return False


_DUMMY_HASH: str | None = None


def burn_password_check(password: str) -> None:
    """Spend the same time as a real check, so unknown accounts are not distinguishable by timing."""
    global _DUMMY_HASH
    if _DUMMY_HASH is None:
        _DUMMY_HASH = hash_password(secrets.token_hex(8))
    verify_password(password, _DUMMY_HASH)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_digest(token: str) -> str:
    """Only the digest of a session token is stored, so a database leak does not leak sessions."""
    return hashlib.sha256(token.encode()).hexdigest()


def identifier_digest(role: str, identifier: str) -> str:
    return hashlib.sha256(f"{role}:{identifier.strip().lower()}".encode()).hexdigest()
