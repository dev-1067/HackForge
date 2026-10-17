# Dev B hand-off: API, database, live stream, lab

FastAPI service around the Dev A engine. Interactive docs: **http://localhost:8000/docs**.

```bash
pip install -r requirements.txt
uvicorn api.asgi:app --port 8000            # SQLite in data/trustjuggler.db, lab on, ~5 s to start
python -m pytest -q                         # 112 tests including the API
docker compose up --build                   # API + PostgreSQL (see "Untested" below)
```

Start-up drops and re-seeds the demo data (`TJ_RESET_ON_START=true`): it creates 60 simulated riders, scores their 30-day history so every baseline is warm, and leaves the lab ready. Configuration is in `.env.example`.

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
| `POST` | `/lab/reset` | Drop everything and rebuild the world (about 5 s) |
| `GET` | `/health` | Liveness: `{status, model_version, riders, sessions_scored, lab}` |

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
