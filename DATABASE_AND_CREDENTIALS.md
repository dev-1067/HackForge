# Trust Juggler — Database & Credentials Reference (A to Z)

This document provides a complete reference for judges and evaluators explaining the database schema, credentials for all simulated riders and operators, and the telemetry dataset.

---

## 1. Database Architecture & Engine

- **ORM Layer:** SQLAlchemy 2.0 (engine-agnostic: SQLite for zero-config demo; PostgreSQL for cloud production).
- **Default Database File:** `data/trustjuggler.db` (about 8 MB after a fresh start; SQLite in WAL mode).
- **Inspection Tool:** Launch [`open_database.bat`](file:///c:/Users/DEVAANSH/Desktop/Hackforge/open_database.bat) to inspect all tables, live rows, and run SQL queries in **DB Browser for SQLite**.

### Database Tables Overview

| Table Name | Description | Key Columns |
|---|---|---|
| `users` | All registered sign-in accounts (Operators & Riders) | `user_id`, `role`, `name`, `email`, `phone`, `rider_id`, `password_hash` |
| `riders` | Fleet rider profiles and current status | `rider_id`, `archetype`, `home_city`, `status`, `sessions_seen`, `last_level`, `last_evidence` |
| `sessions` | Simulated telemetry dataset for every delivery shift | `session_id`, `rider_id`, `started_at`, `context` (JSON), `habit` (JSON), `gt_actor`, `gt_label` |
| `decisions` | Scored decisions from the decoupled AI engine | `decision_id`, `session_id`, `rider_id`, `level` (L0–L4), `context_score`, `habit_score`, `evidence_score`, `reasons` (JSON) |
| `stepup_events` | Verification challenges (selfie / liveness checks) | `id`, `rider_id`, `session_id`, `method`, `issued_at`, `resolved_at`, `result` (pending/passed/failed) |
| `rider_profiles` | Mathematical profiles & known context memory | `rider_id`, `profile` (EWMA means, variances, device/city whitelist) |
| `audit_log` | Immutable compliance log of reviewer actions | `id`, `rider_id`, `actor`, `action`, `details` (JSON), `at` |
| `review_requests` | Help and review requests from riders and the team's replies | `id`, `rider_id`, `kind`, `message`, `status`, `response_note`, `responded_by`, `created_at` |

---

## 2. Credentials Directory (A to Z)

All demo accounts are pre-seeded in the database and ready for immediate login.

### A. Operations Team (Company Portal)
- **Login URL:** [http://localhost:5173/company/login](http://localhost:5173/company/login)
- **Email:** `ops@trustjuggler.demo`
- **Password:** `demo-pass-123`
- **Role:** Fleet Operations / Reviewer

---

### B. Delivery Riders (60 accounts, one per simulated rider R00000 to R00059)
- **Login URL:** [http://localhost:5173/rider/login](http://localhost:5173/rider/login)
- **Password for all riders:** `demo-pass-123`
- **Quick-Login:** Use the `Rider 1`, `Rider 2`, `Rider 3` buttons on the login screen, or type any mobile number below:

| Rider ID | Name | Registered mobile number | Home city | Pattern (archetype) |
|---|---|---|---|---|
| `R00001` | Demo Rider 1 | `9000000001` | Kolkata | bike evening |
| `R00002` | Demo Rider 2 | `9000000002` | Bengaluru | car day |
| `R00003` | Demo Rider 3 | `9000000003` | Mumbai | car night |
| `R00004` | Demo Rider 4 | `9000000004` | Bengaluru | scooter day |
| `R00005` | Demo Rider 5 | `9000000005` | Ahmedabad | scooter night |
| `R00006` | Demo Rider 6 | `9000000006` | Kolkata | bike day |
| `R00007` | Demo Rider 7 | `9000000007` | Hyderabad | bike evening |
| `R00008` | Demo Rider 8 | `9000000008` | Mumbai | car day |
| `R00009` | Demo Rider 9 | `9000000009` | Bengaluru | car night |
| `R00010` | Demo Rider 10 | `9000000010` | Mumbai | scooter day |
| `R00011` | Demo Rider 11 | `9000000011` | Bengaluru | scooter night |
| `R00012` | Demo Rider 12 | `9000000012` | Kolkata | bike day |
| `R00013` | Demo Rider 13 | `9000000013` | Ahmedabad | bike evening |
| `R00014` | Demo Rider 14 | `9000000014` | Chennai | car day |
| `R00015` | Demo Rider 15 | `9000000015` | Kolkata | car night |
| `R00016` | Demo Rider 16 | `9000000016` | Kolkata | scooter day |
| `R00017` | Demo Rider 17 | `9000000017` | Kolkata | scooter night |
| `R00018` | Demo Rider 18 | `9000000018` | Ahmedabad | bike day |
| `R00019` | Demo Rider 19 | `9000000019` | Hyderabad | bike evening |
| `R00020` | Demo Rider 20 | `9000000020` | Hyderabad | car day |
| `R00021` | Demo Rider 21 | `9000000021` | Bengaluru | car night |
| `R00022` | Demo Rider 22 | `9000000022` | Bengaluru | scooter day |
| `R00023` | Demo Rider 23 | `9000000023` | Ahmedabad | scooter night |
| `R00024` | Demo Rider 24 | `9000000024` | Bengaluru | bike day |
| `R00025` | Demo Rider 25 | `9000000025` | Kolkata | bike evening |
| `R00026` | Demo Rider 26 | `9000000026` | Delhi | car day |
| `R00027` | Demo Rider 27 | `9000000027` | Delhi | car night |
| `R00028` | Demo Rider 28 | `9000000028` | Kolkata | scooter day |
| `R00029` | Demo Rider 29 | `9000000029` | Kolkata | scooter night |
| `R00030` | Demo Rider 30 | `9000000030` | Ahmedabad | bike day |
| `R00031` | Demo Rider 31 | `9000000031` | Chennai | bike evening |
| `R00032` | Demo Rider 32 | `9000000032` | Pune | car day |
| `R00033` | Demo Rider 33 | `9000000033` | Ahmedabad | car night |
| `R00034` | Demo Rider 34 | `9000000034` | Kolkata | scooter day |
| `R00035` | Demo Rider 35 | `9000000035` | Ahmedabad | scooter night |
| `R00036` | Demo Rider 36 | `9000000036` | Bengaluru | bike day |
| `R00037` | Demo Rider 37 | `9000000037` | Hyderabad | bike evening |
| `R00038` | Demo Rider 38 | `9000000038` | Bengaluru | car day |
| `R00039` | Demo Rider 39 | `9000000039` | Bengaluru | car night |
| `R00040` | Demo Rider 40 | `9000000040` | Ahmedabad | scooter day |
| `R00041` | Demo Rider 41 | `9000000041` | Pune | scooter night |
| `R00042` | Demo Rider 42 | `9000000042` | Delhi | bike day |
| `R00043` | Demo Rider 43 | `9000000043` | Ahmedabad | bike evening |
| `R00044` | Demo Rider 44 | `9000000044` | Hyderabad | car day |
| `R00045` | Demo Rider 45 | `9000000045` | Delhi | car night |
| `R00046` | Demo Rider 46 | `9000000046` | Chennai | scooter day |
| `R00047` | Demo Rider 47 | `9000000047` | Hyderabad | scooter night |
| `R00048` | Demo Rider 48 | `9000000048` | Chennai | bike day |
| `R00049` | Demo Rider 49 | `9000000049` | Ahmedabad | bike evening |
| `R00050` | Demo Rider 50 | `9000000050` | Ahmedabad | car day |
| `R00051` | Demo Rider 51 | `9000000051` | Mumbai | car night |
| `R00052` | Demo Rider 52 | `9000000052` | Mumbai | scooter day |
| `R00053` | Demo Rider 53 | `9000000053` | Kolkata | scooter night |
| `R00054` | Demo Rider 54 | `9000000054` | Chennai | bike day |
| `R00055` | Demo Rider 55 | `9000000055` | Bengaluru | bike evening |
| `R00056` | Demo Rider 56 | `9000000056` | Hyderabad | car day |
| `R00057` | Demo Rider 57 | `9000000057` | Kolkata | car night |
| `R00058` | Demo Rider 58 | `9000000058` | Hyderabad | scooter day |
| `R00059` | Demo Rider 59 | `9000000059` | Mumbai | scooter night |
| `R00000` | Demo Rider 0 | `9000000000` | Kolkata | bike day |

---

## 3. The Telemetry Dataset Anatomy

Every delivery session in the `sessions` table contains 2 decoupled signal groups:

### 1. Context Signals (Cheap to change legitimately)
Stored in `sessions.context`:
- `device_id`: Unique handset fingerprint.
- `os`: Operating system and version (e.g. `Android 14`, `iOS 17.4`).
- `city`: Operating city.
- `zone`: Specific delivery geofence or micro-market.
- `network_type`: `5g`, `4g`, `wifi`.
- `ip_asn`: Autonomous System Number of internet provider.
- `app_version`: App version on the phone.

### 2. Habit Signals (Hard to fake / Biometric cadence)
Stored in `sessions.habit`:
- `accept_latency_ms`: Time in milliseconds to accept an order offer (Reaction speed).
- `tap_interval_ms`: Micro-rhythm between consecutive screen taps.
- `swipe_speed`: Kinematic velocity of swipes across the app UI.
- `avg_speed_kmh`: Driving/riding speed profile.
- `route_deviation`: Detour frequency against optimal GPS routing.
- `idle_gap_min`: Rest and pause rhythm between orders.
- `cancel_rate`: Percentage of orders cancelled post-acceptance.
- `orders_per_hour`: Delivery efficiency pace.
- `accept_rate`: Share of offered orders accepted.

---

## 4. Useful SQL Queries to Show Judges in DB Browser

When opening [`open_database.bat`](file:///c:/Users/DEVAANSH/Desktop/Hackforge/open_database.bat), switch to the **"Execute SQL"** tab and demonstrate these queries:

### Query 1: View Top Security Decisions with Explainable Reasons
```sql
SELECT 
    d.decision_id,
    d.rider_id,
    d.level,
    ROUND(d.context_score, 3) AS context_novelty,
    ROUND(d.habit_score, 3) AS habit_deviation,
    ROUND(d.evidence_score, 3) AS evidence_meter,
    d.reasons
FROM decisions d
WHERE d.level IN ('L2', 'L3', 'L4')
ORDER BY d.decided_at DESC
LIMIT 10;
```

### Query 2: Inspect Telemetry Captured from Rider 1's Phone
```sql
SELECT 
    session_id,
    started_at,
    json_extract(context, '$.device_id') AS device,
    json_extract(context, '$.city') AS city,
    json_extract(habit, '$.accept_latency_ms') AS accept_ms,
    json_extract(habit, '$.tap_interval_ms') AS tap_ms,
    json_extract(habit, '$.avg_speed_kmh') AS speed_kmh
FROM sessions
WHERE rider_id = 'R00001'
ORDER BY started_at DESC
LIMIT 10;
```

### Query 3: Verify All 60 Rider Login Accounts
```sql
SELECT user_id, role, name, phone, rider_id, created_at 
FROM users 
WHERE role = 'rider' 
ORDER BY user_id ASC;
```

---

## 5. Generating Raw CSV Files

If judges request raw standalone CSV exports of the entire synthetic dataset:
```powershell
python -m sim.generate --riders 100 --days 30 --out data
```
This generates:
- `data/riders.csv` (Rider profiles, home zones, archetypes)
- `data/sessions.csv` (All delivery sessions with full telemetry and ground truth labels)


---

## 6. Honesty notes for the judges

- Every rider, session and signal is **simulated** (`sim/`). The ground-truth columns `gt_actor` and `gt_label` exist only so accuracy can be measured; the scoring engine never reads them.
- Decisions and their reasons are produced by the engine. They are not edited by hand. To put demo riders into pending, flagged or suspended states, run `python scripts/setup_demo_states.py` while the backend is running; it drives the simulation lab through the normal API.
- Each account is linked to a simulated rider (R00000 to R00059). Home city and pattern in the table come from the simulator's seed (`TJ_LAB_SEED`, default 11); a different seed gives a different table.
