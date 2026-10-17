"""Human-readable reasons attached to every decision."""
from __future__ import annotations

from typing import Any

NOTEWORTHY_Z = 2.0
MAX_FEATURE_REASONS = 3

PART_LABELS = {
    "new_device": "new device", "new_city": "new city", "new_zone": "new delivery zone",
    "new_network_provider": "new network provider", "new_network_type": "new network type",
    "new_os": "new OS", "shared_device": "device shared with other rider accounts",
}


def feature_reasons(contribs: list[tuple[str, str, float]]) -> list[dict[str, Any]]:
    """Top features that deviate from this rider's baseline. ``contribs`` = (feature, group, z)."""
    strong = [c for c in contribs if abs(c[2]) >= NOTEWORTHY_Z]
    strong.sort(key=lambda c: abs(c[2]), reverse=True)
    return [{"feature": f, "group": g, "z": round(z, 2), "direction": "higher" if z > 0 else "lower"}
            for f, g, z in strong[:MAX_FEATURE_REASONS]]


def context_note(parts: list[str]) -> str:
    return "unfamiliar context: " + ", ".join(PART_LABELS.get(p, p) for p in parts)


def build_reasons(*, level: int, learning: bool, n_sessions: int, min_sessions: int,
                  contribs: list[tuple[str, str, float]], novel_parts: list[str],
                  habit: float, k: float, streak: int, evidence: float, threshold: float,
                  status: str) -> list[dict[str, Any]]:
    if learning:
        return [{"note": f"learning this rider's pattern ({n_sessions + 1}/{min_sessions} sessions)"}]

    reasons = feature_reasons(contribs) if level >= 1 else []
    if novel_parts:
        reasons.append({"note": context_note(novel_parts)})
    if not novel_parts:
        reasons.append({"note": "known device and location"})

    if level == 0:
        if novel_parts and habit <= k:
            reasons.append({"note": "habits match the rider's pattern, so the change is treated as a "
                                    "life event and the new context is learned"})
        else:
            reasons.append({"note": "consistent with this rider's usual pattern"})
    else:
        reasons.append({"note": f"{streak} consecutive session(s) above normal; "
                                f"evidence {evidence:.1f} (step-up at {threshold:.1f})"})
    if status == "held":
        reasons.append({"note": "payouts held until a reviewer clears the account"})
    elif status == "suspended":
        reasons.append({"note": "account suspended pending manual review"})
    return reasons
