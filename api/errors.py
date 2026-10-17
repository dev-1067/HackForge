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
