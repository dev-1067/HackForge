import sqlite3
import json
from datetime import datetime, timezone

conn = sqlite3.connect('data/trustjuggler.db')
now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')

# -------------------------------------------------------------
# 1. Rider 2 (R00002) - Quick Switcher "Was this you?" challenge
# -------------------------------------------------------------
conn.execute("UPDATE riders SET status='pending_stepup' WHERE rider_id='R00002'")

row = conn.execute("SELECT profile FROM rider_profiles WHERE rider_id='R00002'").fetchone()
if row:
    p = json.loads(row[0])
    p['status'] = 'pending_stepup'
    conn.execute("UPDATE rider_profiles SET profile=? WHERE rider_id='R00002'", (json.dumps(p),))

session_row = conn.execute("SELECT session_id FROM sessions WHERE rider_id='R00002' ORDER BY started_at DESC LIMIT 1").fetchone()
if session_row:
    session_id = session_row[0]
    conn.execute(
        "UPDATE decisions SET level='L2', level_num=2, status='pending_stepup', review_verdict=NULL, context_flags=? WHERE session_id=?",
        (json.dumps(["new_device"]), session_id)
    )
    conn.execute("DELETE FROM stepup_events WHERE rider_id='R00002'")
    conn.execute(
        "INSERT INTO stepup_events (rider_id, session_id, method, issued_at, resolved_at, result) VALUES (?, ?, 'in_app_confirmation', ?, NULL, 'pending')",
        ('R00002', session_id, now)
    )

# -------------------------------------------------------------
# 2. Distinct review queue situations for the 4 open cases
# -------------------------------------------------------------

# Case A: Demo Rider 20 (R00020) - Shared Device Ring & Bot Automation
conn.execute(
    "UPDATE decisions SET context_flags=?, reasons=? WHERE rider_id='R00020' AND review_verdict IS NULL",
    (
        json.dumps(["shared_device", "new_device"]),
        json.dumps([
            {"note": "Phone hardware signature matches 2 other registered rider accounts (shared device ring)"},
            {"feature": "swipe_speed", "group": "device", "z": -3.2, "direction": "lower"},
            {"feature": "accept_latency_ms", "group": "persona", "z": -3.4, "direction": "lower"},
            {"note": "Unnaturally rapid order claims (140 ms acceptance latency)"},
            {"note": "The change has shown up in the last 2 consecutive peak shifts"}
        ])
    )
)

# Case B: Demo Rider 9 (R00009) - GPS Spoofing & Datacenter VPN Proxy
conn.execute(
    "UPDATE decisions SET context_flags=?, reasons=? WHERE rider_id='R00009' AND review_verdict IS NULL",
    (
        json.dumps(["new_network_provider", "new_city"]),
        json.dumps([
            {"note": "Connection routed through a commercial datacenter proxy (Hosting ASN 13335)"},
            {"note": "Calculated transit speed between delivery dropoffs is 114 km/h (impossible travel)"},
            {"feature": "login_hour", "group": "persona", "z": -2.8, "direction": "lower"},
            {"feature": "cancel_rate", "group": "persona", "z": 3.1, "direction": "higher"},
            {"note": "GPS heading and altitude variance is zero (synthetic mock location provider)"}
        ])
    )
)

# Case C: Demo Rider 17 (R00017) - Physical Sub-leasing / Riding Dynamics in New Zone
conn.execute(
    "UPDATE decisions SET context_flags=?, reasons=? WHERE rider_id='R00017' AND review_verdict IS NULL",
    (
        json.dumps(["new_zone"]),
        json.dumps([
            {"note": "Operating in an unfamiliar delivery sector (Whitefield Outer Zone)"},
            {"feature": "avg_speed_kmh", "group": "environment", "z": 2.9, "direction": "higher"},
            {"feature": "cancel_rate", "group": "persona", "z": 2.4, "direction": "higher"},
            {"note": "Braking and cornering motion biometrics do not match owner baseline"},
            {"note": "The change has shown up across 3 recent delivery orders"}
        ])
    )
)

# Case D: Demo Rider 41 (R00041) - Hardware Switch (iPhone 16) & Prolonged Idle Gaps
conn.execute(
    "UPDATE decisions SET context_flags=?, reasons=? WHERE rider_id='R00041' AND review_verdict IS NULL",
    (
        json.dumps(["new_device", "new_os"]),
        json.dumps([
            {"note": "First session on newly seen device model (iPhone 16 / iOS 18.2)"},
            {"feature": "idle_gap_min", "group": "persona", "z": 3.4, "direction": "higher"},
            {"feature": "accept_rate", "group": "persona", "z": -2.8, "direction": "lower"},
            {"note": "Extended idle gaps averaging 34 min between customer deliveries"},
            {"note": "Hardware change pending delivery partner confirmation"}
        ])
    )
)

conn.commit()
conn.close()
print("Successfully configured distinct situations for Rider 20, 9, 17, and 41, plus Rider 2 step-up challenge!")
