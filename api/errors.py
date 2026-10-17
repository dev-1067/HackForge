"""Domain errors, mapped to HTTP status codes in ``main.py``."""
from __future__ import annotations


class DuplicateSession(Exception):
    """The session_id was already scored."""


class UnknownRider(Exception):
    """No such rider."""


class UnknownDecision(Exception):
    """No such decision."""


class InvalidState(Exception):
    """The rider is not in a state that allows this action."""


class LabUnavailable(Exception):
    """The simulation lab is disabled or not ready."""


class AuthError(Exception):
    """Authentication or authorisation failure. ``status`` is the HTTP status to return."""

    def __init__(self, status: int, detail: str) -> None:
        super().__init__(detail)
        self.status = status
        self.detail = detail


class ValidationFailed(Exception):
    """Input rejected; ``fields`` maps field name to a message a person can act on."""

    def __init__(self, fields: dict[str, str]) -> None:
        super().__init__("Please check the highlighted fields.")
        self.fields = fields
