import sqlite3
import json
import datetime

conn = sqlite3.connect('data/trustjuggler.db')
now = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')

# 1. Update riders table for R00002
conn.execute("UPDATE riders SET status='pending_stepup' WHERE rider_id='R00002'")

# 2. Update rider_profiles table for R00002
row = conn.execute("SELECT profile FROM rider_profiles WHERE rider_id='R00002'").fetchone()
if row:
    p = json.loads(row[0])
    p['status'] = 'pending_stepup'
    conn.execute("UPDATE rider_profiles SET profile=? WHERE rider_id='R00002'", (json.dumps(p),))

# 3. Find latest session for R00002 and make it an open L2 decision
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

conn.commit()
conn.close()
print("R00002 (Rider 2) is now configured as pending_stepup with active verification challenge!")
