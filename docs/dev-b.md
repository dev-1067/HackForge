# Dev B hand-off: API, database, live stream, lab

FastAPI service around the Dev A engine. Interactive docs: **http://localhost:8000/docs**.

```bash
pip install -r requirements.txt
uvicorn api.asgi:app --port 8000            # SQLite in data/trustjuggler.db, lab on, ~5 s to start
python -m pytest -q                         # engine, simulator, API and accounts
docker compose up --build                   # API + PostgreSQL (see "Untested" below)
```

Start-up clears and rebuilds the **simulated** data (`TJ_RESET_ON_START=true`): 60 simulated riders with their 30-day history scored so every baseline is warm, and the lab ready. **Accounts, the company and sign-in sessions are never cleared.** Configuration is in `.env.example`; copy it to `.env`.

## Accounts and access

Two roles, both documented in the project plan: **rider** (a delivery partner) and **company** (the operations team that reviews cases). The plan defines no separate "customer" role, so none exists; a customer-facing role would need its own permissions and was not invented.

| Method | Path | Who | Purpose |
|---|---|---|---|
| `POST` | `/auth/rider/register`, `/auth/rider/login` | anyone | name + mobile number + password |
| `POST` | `/auth/company/register`, `/auth/company/login` | anyone | work email + password; sign-up needs `TJ_COMPANY_INVITE_CODE` (closed if unset) |
| `GET` | `/auth/me` | signed in | the user and a CSRF token (401 when signed out) |
| `POST` | `/auth/logout` | signed in | deletes the server-side session |
| `GET` | `/me/rider` | rider | own status, notices, recent activity in plain words (no scores) |
| `POST` | `/me/rider/verification` | rider | `{"confirmed": true/false}` answer to an extra-check request |
| everything else | | company | operations data, review, lab, stream |
| `POST` | `/sessions/score` | company, or a service with `X-Ingest-Key` | scoring input |

* Passwords: scrypt with a random salt per password; only a digest of each session token is stored; failures look the same whether or not the account exists (and cost the same time); 5 failed sign-ins lock that account for 15 minutes.
* Sessions: `HttpOnly`, `SameSite=Lax` cookie (`Secure` when `TJ_COOKIE_SECURE=true`); riders 7 days, company 12 hours; expired or deleted sessions are rejected by the server.
* CSRF: every state-changing call from a signed-in browser must send the `X-CSRF-Token` returned by `/auth/login` or `/auth/me`.
* Roles are enforced by the server on every route. A rider calling a company route gets 403, and a company user calling `/me/*` gets 403.
* A rider answering "it was me" is a stand-in for a real selfie / liveness check, which is out of scope.
* No password-reset email (there is no mail service). An administrator uses `python -m api.manage set-password <email-or-phone>`, which also signs that user out everywhere.

Provisioning without the web form: `python -m api.manage create-company-user|create-rider|set-password|list-users`.

### Tables

`users` (role, name, email *or* phone, scrypt hash, rider_id / company_id; a check constraint ties each role to the right fields), `companies`, `auth_sessions` (digest, csrf token, expiry), `login_attempts`. The operational tables are `riders`, `sessions`, `decisions`, `stepup_events`, `rider_profiles`, `audit_log`. Only the operational tables are reset in demo mode. There is no migration tool: tables are created with `create_all`, which never alters or drops an existing table.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/sessions/score` | Score one session, persist it and the decision. 409 if `session_id` was already scored, 422 for a bad payload |
| `POST` | `/stepup/{rider_id}/result` | `{"passed": true}` after an L2 selfie check. 409 unless the rider is `pending_stepup` |
| `GET` | `/riders` | List (`status`, `q`, `limit`, `offset`) |
| `GET` | `/riders/{id}` | Status, evidence, baselines, level counts |
| `GET` | `/riders/{id}/timeline?limit=` | Sessions oldest first with scores (the rider detail chart) |
| `GET` | `/riders/{id}/audit` | Step-up and review history |
| `GET` | `/decisions` | Newest first. Filters: `level`, `min_level`, `rider_id`, `unreviewed`, `limit`, `offset` |
| `GET` | `/decisions/{id}` | One decision |
| `POST` | `/decisions/{id}/review` | `{"takeover_confirmed": bool, "reviewer": "asha", "note": "..."}`. 409 if the rider is not escalated |
| `GET` | `/stream` | Server-Sent Events (below) |
| `GET` | `/metrics/summary` | Live KPIs, plus a `simulation` block that checks decisions against ground truth |
| `GET` | `/metrics/compare` | Strict / open / naive / Trust Juggler and the trade-off curve (from `docs/sample/compare.json`) |
| `GET` | `/lab/scenarios` | The 14 buttons: `{name, kind, title, description}` |
| `GET` | `/lab/state` | `running`, `rate`, `blocked` riders, `active_scenarios`, `generated` |
| `POST` | `/lab/scenario` | `{"rider_id", "scenario", "steps": 0..50, "auto_resolve": true}` |
| `POST` | `/lab/step` | `{"rider_id"?, "count": 1..200, "auto_resolve": true}` |
| `POST` | `/lab/run` | `{"action": "start"|"stop", "rate": 0.1..100}` background simulation |
| `POST` | `/lab/reset` | Clear the simulated data and rebuild the world (about 5 s); accounts are kept |
| `GET` | `/health` | Liveness: `{"status": "ok"}` (public) |

Errors are `{"detail": "..."}` with 404 (unknown rider / decision), 409 (duplicate session, wrong state), 422 (validation), 503 (lab unavailable).

### Decision shape (`POST /sessions/score`, `GET /decisions`, SSE `decision`)

```json
{"decision_id": 2601, "session_id": "R00007-00039", "rider_id": "R00007",
 "decided_at": "2026-10-17T16:17:38", "started_at": "2026-02-04T22:13:10",
 "level": "L2", "action": "step_up_selfie", "status": "pending_stepup",
 "context_score": 0.0, "habit_score": 0.61, "evidence_score": 4.12, "threshold": 3.21,
 "habit_deviation": 3.03, "context_flags": [],
 "reasons": [{"feature": "swipe_speed", "group": "device", "z": -2.84, "direction": "lower"},
             {"note": "known device and location"}],
 "model_version": "tj-1.0", "review_verdict": null, "reviewed_by": null, "reviewed_at": null}
```

Lab-originated decisions (SSE and `/lab/*` responses) also carry `context` (`device_id`, `city`, `zone`, `network_type`), `source` (`seed` / `lab` / `api`), `ground_truth` (`{actor: "owner"|"other", label}`) and, from `/lab/*` only, `resolution` (`{stepup: "passed"|"failed", review: "dismissed"|"confirmed_takeover", blocked: true}`). `ground_truth` is how the demo shows whether the engine was right; it is never sent to the engine.

`context_flags` lists what was unfamiliar: `new_device`, `new_city`, `new_zone`, `new_network_provider`, `new_network_type`, `new_os`, `shared_device`.

### Live stream

`GET /stream` (`Accept: text/event-stream`), JavaScript:

```js
const es = new EventSource("http://localhost:8000/stream");
es.addEventListener("decision", e => addToFeed(JSON.parse(e.data)));
es.addEventListener("stepup", e => ...);   // {rider_id, result, status}
es.addEventListener("review", e => ...);   // {decision_id, rider_id, verdict, status, decisions_closed}
es.addEventListener("lab", e => ...);      // {type: "scenario"|"blocked"|"running"|"stopped"|"reset", ...}
```

Plus an initial `hello` and a `: keepalive` comment every 15 s. A slow client loses its oldest events rather than slowing the engine. Seeding does not publish events.

## For Dev C: wiring the screens

| Screen | Calls |
|---|---|
| Live feed | `EventSource /stream`; first page from `GET /decisions?limit=50` |
| Rider detail | `GET /riders/{id}`, `GET /riders/{id}/timeline`; chart `evidence_score` against `threshold`, mark points whose `context_flags` is non-empty |
| Lab buttons | `GET /lab/scenarios` for the list; click calls `POST /lab/scenario` with `steps: 6` so the reaction shows at once; "play" calls `POST /lab/run` |
| Review queue | `GET /decisions?unreviewed=true&min_level=2`; buttons call `POST /decisions/{id}/review` |
| Trade-off page | `GET /metrics/compare` (`systems`, `tradeoff_curve`) |
| KPI strip | `GET /metrics/summary` (poll every few seconds, or refresh on each SSE event) |

With `auto_resolve: true` (default) the lab plays the rider and reviewer: owners pass a selfie check 98% of the time, impostors 10%, and an impostor who fails is marked `blocked` and leaves the random rotation. Use `auto_resolve: false` to leave the step-up pending and let the UI's own buttons call `/stepup/.../result` and `/decisions/.../review`.

## How it fits together

| File | Role |
|---|---|
| `api/main.py` | routes, error mapping, SSE, app factory (`create_app`) |
| `api/service.py` | `TrustService`: engine + database + events; scoring, step-up, review, queries, KPIs |
| `api/lab.py` | `Lab`: simulated world, scenarios, auto-resolution, background runner |
| `api/models.py`, `db.py` | SQLAlchemy schema (riders, sessions, decisions, stepup_events, rider_profiles, audit_log) |
| `api/bus.py` | thread-safe pub/sub behind `/stream` |
| `api/schemas.py`, `settings.py`, `errors.py` | request/response models, env config, domain errors |

* **One writer.** The engine keeps rider state in memory and is not thread-safe, so `TrustService` serialises scoring with a lock; run **one uvicorn worker**. At about 30,000 sessions per second of engine time, the database is the limit (a few hundred commits per second on SQLite).
* **Persistence.** Each decision is stored with its reasons; rider baselines are snapshotted to `rider_profiles` (on any escalation or outcome, otherwise every 5th session). With `TJ_RESET_ON_START=false` the engine is rebuilt from those snapshots at start-up, including the shared-device map. Redis is not needed.
* **Lab rows** carry `gt_actor` / `gt_label` columns (simulation only).

## Tested, and not

Tested: all of the above against SQLite (in memory and file) and against a real PostgreSQL 16 server, including restart/restore, a real uvicorn server with `curl` on `/stream`, and concurrent scoring from several threads.

Untested: `docker build` / `docker compose up` (no Docker daemon in the build environment; `docker compose config` validates). No authentication: put the API behind your own gateway before exposing it. Timestamps are treated as rider-local time.

## Delivery partner portal (endpoints and tables)

Partner pages: Recent Activity `/rider`, Account & Verification `/rider/account`, Help & Review `/rider/help`, Settings `/rider/settings`. All partner endpoints act only on the signed-in rider's own record (the rider id comes from the session, never from the request).

| Endpoint | Who | Purpose |
|---|---|---|
| `GET /me/rider/activity` | rider | recorded sign-ins, new phones, verification events, requests and replies (`origin`: recorded or demo) |
| `GET /me/rider/account` | rider | profile (phone masked), status, phones, outstanding verification, check-up |
| `POST /me/rider/device-change` | rider | "This is my phone" note; changes nothing in the engine, 409 if already reported |
| `GET/POST /me/rider/requests` | rider | help and review requests (message 10–1000 chars, max 5 open) |
| `GET /me/rider/export` | rider | download own data as JSON (no secrets) |
| `GET /me/sessions`, `POST /me/sessions/sign-out-others`, `POST /me/password` | any user | settings |
| `GET /review-requests`, `POST /review-requests/{id}/respond` | company | rider requests in Needs review; reply required to resolve/close |

New tables `sign_in_events` and `review_requests` are created automatically by `create_all` on start-up (no change to existing tables) and are not cleared by the demo reset.

The end-to-end check (`e2e/smoke.cjs`) should be run against a freshly started backend.
