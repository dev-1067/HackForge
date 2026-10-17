# Trust Juggler: continuous identity engine for gig platforms

> Problem Statement 1, "The Rented Account Problem". 24-hour hackathon build plan for a team of three.
> This document is the single source of truth: problem, idea, architecture, stack, data, API, work split, timeline, demo and pitch.

---

## 1. The problem

A delivery platform verifies a rider once (background check, ID) and then trusts that identity at every login, for as long as the account exists. That creates two failure modes:

| Gate | What it does | How it fails |
|---|---|---|
| **Strict Gate** | Re-verify on every login | Flags every routine change (new phone, new city, new zone) and locks out honest workers, who then churn |
| **Open Gate** | Trust the first check forever | A rented or handed-off account runs for weeks under someone else's approved identity |

**The task:** build a real-time identity engine that
1. scores every login and session against the rider's own behavioral pattern,
2. holds enough certainty that honest workers are never needlessly blocked,
3. escalates only sessions that genuinely look like someone else took over.

Scale to design for: tens of thousands of riders, millions of sessions.

---

## 2. Our idea: Context vs. Habit decoupling

Most systems treat any change as suspicious. We separate two kinds of signals:

- **Context signals** are things a real person changes in normal life: device, OS, city, IP range, delivery zone, working hours. They are **cheap to change legitimately**, so a change alone is weak evidence.
- **Habit signals** are things a person cannot easily fake or hand over: acceptance latency, tap/swipe cadence, delivery speed profile, route choices, break rhythm, cancellation style, earnings pace. They are **hard to copy**, so a change is strong evidence.

The decision logic comes straight from this split:

| Context | Habit | Meaning | Action |
|---|---|---|---|
| unchanged | unchanged | normal | allow |
| **changed** | unchanged | life event (new phone, moved) | allow, learn the new context |
| unchanged | **changed** | **the "same phone, different person" handoff** | escalate |
| changed | changed | possible takeover or credential theft | escalate harder |

This is the exact case in the problem statement ("same city, same old phone, just a different person behind the wheel") and the case a naive anomaly detector misses.

### What makes this different from a basic anomaly detector

1. **Context/Habit decoupling** (above), so life events never look like fraud.
2. **Evidence accumulation across sessions** (multivariate EWMA of per-feature z-scores). A rented account differs from its owner in the *same direction* every session, so that shift adds up while ordinary noise cancels. A quiet, slow handoff that stays under every single-session threshold still gets caught.
3. **Calibrated honest-worker guarantee.** Alert thresholds are set by conformal calibration on each rider's own history and cohort, so we can state the false-alert rate we are targeting (for example ≤ 0.5% of honest sessions) and measure it.
4. **Graduated response ladder.** Almost nobody sees friction. Hard blocks need strong evidence and a human.
5. **Explainable by default.** Every flag carries the reasons ("same device, but tap cadence +4.1σ and accept-latency +3.6σ for 6 sessions").
6. **Built-in simulation lab.** Replay life events and attacks live. This is both our dataset and our demo.
7. **Honest-worker shield metric.** We report false lockouts per life-event type and show Strict Gate vs. Open Gate vs. Trust Juggler on one curve.

---

## 3. System architecture

```
                        ┌────────────────────────────────────────────┐
                        │              Simulation Lab                │
                        │ riders · life events · attacks · labels    │
                        └──────────────┬─────────────────────────────┘
                                       │ session events (JSON)
                                       ▼
 ┌──────────────┐     ┌────────────────────────────────────────────────────┐
 │  Rider app   │────▶│                   API (FastAPI)                    │
 │ (simulated)  │     │  POST /sessions/score   GET /riders/{id}  ...      │
 └──────────────┘     └───────┬───────────────────────────┬────────────────┘
                              │                           │
                              ▼                           ▼
                ┌──────────────────────────┐   ┌──────────────────────────┐
                │      Scoring Engine      │   │   Stream (SSE/WebSocket) │
                │ 1 feature extraction     │   └────────────┬─────────────┘
                │ 2 context-novelty score  │                │
                │ 3 habit-deviation score  │                ▼
                │ 4 evidence accumulation  │   ┌──────────────────────────┐
                │ 5 calibrated decision    │   │   Ops Dashboard (React)  │
                │ 6 explanation builder    │   │ live feed · rider detail │
                └──────┬───────────────────┘   │ lab controls · metrics   │
                       │                       └──────────────────────────┘
          ┌────────────┴─────────────┐
          ▼                          ▼
  ┌───────────────┐         ┌──────────────────┐
  │  Rider state  │         │    PostgreSQL    │
  │ Redis (or in- │         │ riders, sessions,│
  │ memory/SQLite)│         │ decisions, audit │
  └───────────────┘         └──────────────────┘
```

**Request path (target: < 50 ms per scored session)**
1. A session event arrives with context fields and habit fields.
2. Load the rider's profile (baseline + current evidence state) from cache.
3. Score context novelty and habit deviation separately.
4. Update the evidence accumulator and apply the decision matrix against calibrated thresholds.
5. Write the decision and its reasons to the DB, push to the live stream.
6. Update the rider's baseline **only if** the session was accepted as the owner (prevents the profile being poisoned by an attacker).

---

## 4. Tech stack and why

| Layer | Choice | Why |
|---|---|---|
| Language (engine/API) | **Python 3.11** | Fastest path for ML/statistics, one language for the simulator, engine and API |
| API | **FastAPI** + Pydantic | Async, typed schemas double as the contract between the three devs, auto docs at `/docs` |
| Math / ML | **NumPy, SciPy, scikit-learn** | Robust statistics, covariance, isotonic/conformal calibration, evaluation metrics. No deep learning needed, so it is explainable and fast |
| DB | **PostgreSQL** (start on **SQLite**) | Relational data (rider → sessions → decisions), easy aggregations for the metrics screens. SQLAlchemy makes SQLite → Postgres a one-line change |
| ORM | **SQLAlchemy 2.x** | One data layer, swap DB with a connection string |
| Live state | **In-process** (snapshotted to the DB) | The engine scores in about 0.03 ms from memory; Redis was not needed for one worker |
| Live updates | **Server-Sent Events** (or WebSocket) | Dashboard feed with no polling |
| Frontend | **React + Vite + TypeScript + Tailwind + Recharts** | Fast to build, good charts, easy deploy |
| Packaging | **Docker Compose** | One command for Postgres + API (+ UI) |
| Tests | **pytest** | Engine correctness and the evaluation harness |
| Deploy (optional) | Render / Railway / Fly + Vercel | Public demo link for judges |

DB viewing: DBeaver, an Antigravity/VS Code SQL extension or `psql` / `sqlite3`. MySQL Workbench is not needed.

---

## 5. Data: we generate our own (confirmed by organizers)

The organizers said to bring our own dataset, so the **simulator is a core deliverable**.

### 5.1 Rider archetypes
Full-time day rider, part-timer, night rider, bike courier, scooter courier, car courier. Each archetype has habit distributions (the rider's "fingerprint"), for example:

| Habit feature | Meaning |
|---|---|
| `accept_latency_ms` | time to accept an order offer |
| `tap_interval_ms`, `swipe_speed` | interaction cadence |
| `avg_speed_kmh`, `speed_variance` | riding/driving profile |
| `route_deviation` | how closely they follow the suggested route |
| `idle_gap_min` | break rhythm |
| `cancel_rate`, `accept_rate` | order-handling style |
| `orders_per_hour`, `earnings_per_hour` | pace |
| `session_len_min`, `login_hour` | schedule rhythm |

Context features: `device_id`, `os`, `app_version`, `ip_asn`, `city`, `zone`, `network_type`.

### 5.2 Scenarios (all labeled with ground truth)

**Honest life events (must NOT be blocked), 8 types**
- `new_phone`: new device (often new OS); touch behaviour shifts a little
- `os_update`: same phone, new OS and app version
- `moved_city`: new city, zones and traffic; speed, routing and pace shift
- `new_zone`: same city, different zones; mild shift
- `vacation_gap`: 10 to 20 days away, then a few rusty sessions
- `illness_slowdown`: about two weeks of slower, quieter riding
- `schedule_change`: login hours move by 2.5 to 4 hours
- `network_change`: new SIM / ISP, identical behaviour

**Takeover and rental attacks (must be caught)**
- **Hard handoff:** same phone, same city, a different person from session N onward (the headline case)
- **Gradual sharing:** two people alternate sessions on the account
- **Time-share rental:** the renter uses the account during the owner's off-hours
- **Credential theft:** new device, new city, different habits
- **Fleet farming:** one operator runs several accounts on one handset with one set of habits (the engine also notices a device shared across rider accounts)
- **Slow drift handoff:** a substitute takes over gradually over about 15 sessions, to test evidence accumulation

Output: any number of riders (about 85 sessions each over 60 days), written as `riders.csv` and `sessions.csv` in one command: `python -m sim.generate --riders 5000 --days 60 --out data`. Ground truth (`gt_*` columns) is for evaluation only and is never sent to the engine.

---

## 6. The scoring engine in detail

### 6.1 Per-rider profile (online, updated incrementally)
Ten habit signals, grouped by *what is allowed to change them*:

| Group | Signals | Excused when |
|---|---|---|
| **persona** (the person) | accept latency, idle gap, cancel rate, accept rate, login hour (circular) | never |
| **environment** (where they work) | speed, route deviation, orders per hour | a new city is being learned (separate baseline per city, wider at first); mildly in a new zone |
| **device** (the handset) | tap interval, swipe speed | a new device is being learned (separate baseline per device, wider at first) |

- Mean and variance per signal are exponentially weighted, so the profile follows slow natural change.
- **Cold start:** a new rider borrows a prior from their archetype cohort (robust, median / MAD) and the prior fades as sessions accumulate.
- Known-context memory: devices, cities, zones, network providers and OS versions seen.

### 6.2 Two scores per session
- **Context novelty `C` in [0, 1]:** weighted share of unfamiliar context (new device 0.40, new city 0.25, ... plus 0.30 if the device is shared with 3 or more other rider accounts).
- **Habit deviation `H`:** weighted mean of squared z-scores (capped at |z| = 4) against the baselines above.

### 6.3 Evidence accumulation
Each signal's z-score is smoothed over recent sessions (`m = 0.75 m + 0.25 z`) and `E` is the weighted mean of `m^2`, rescaled so an honest rider sits near 1. A single odd session barely moves it, while a persistent shift of `d` sigma drives it towards `7 d^2`. After a verified step-up the evidence resets and the recent sessions are learned as the owner's new normal.

### 6.4 Decision matrix

| `C` | `H`/`E` | Decision |
|---|---|---|
| low | low | **L0 Allow** |
| high | low | **L0 Allow + learn context** (life event) |
| low | medium | **L1 Allow + watch** (silent monitoring) |
| low | high | **L2 Step-up** (selfie / liveness check) |
| high | high | **L2 Step-up** (the unfamiliar context lowers the threshold by up to 25%) |
| any | failed step-up, or evidence above 2.5x threshold | **L3 Hold payouts, manual review** |
| any | second failed step-up, or evidence above 4x threshold | **L4 Suspend pending review** (human in the loop) |

### 6.5 Calibration (the "never needlessly block" part)
- Replay riders known to be honest (including riders with life events) through the real engine, each owner passing every step-up.
- Pick the smallest step-up threshold `h2` for which the share of scored sessions reaching L2 is at most `α` (default 0.5%), with a finite-sample correction `(alerts + 1) / (sessions + 1)`.
- Calibration riders are disjoint from the test riders; the realized rates are reported on the test riders.

### 6.6 Profile-poisoning protection
Learning fades to zero as evidence approaches the threshold and stops once a step-up is pending, so an attacker cannot slowly retrain the rider's profile. Escalated sessions are replayed into the baseline only after a verified step-up or a reviewer clears them.

### 6.7 Explanations
Each decision stores top contributing features with direction and magnitude, for example:
`swipe_speed -3.65σ (device), orders_per_hour -2.58σ (environment) · known device and location · 3 consecutive sessions above normal; evidence 4.1 (step-up at 3.2)`.

### 6.8 Baselines we compare against
1. **Strict Gate:** step-up on any context change.
2. **Open Gate:** never re-verify after onboarding.
3. **Naive anomaly detector:** single-score isolation forest, no context/habit split.
4. **Trust Juggler** (ours).

---

## 7. Database schema (PostgreSQL / SQLite)

```sql
riders(
  rider_id PK, archetype, city_home, created_at,
  verified_at, status            -- active | watch | suspended
)

sessions(
  session_id PK, rider_id FK, started_at, ended_at,
  device_id, os, app_version, ip_asn, city, zone, network_type,
  -- habit features
  accept_latency_ms, tap_interval_ms, swipe_speed, avg_speed_kmh,
  route_deviation, idle_gap_min, cancel_rate, accept_rate, orders_per_hour,
  -- ground truth (simulation only; never used by the engine)
  gt_label,                      -- honest | life_event:<type> | attack:<type>
  gt_attack_start_session
)

decisions(
  decision_id PK, session_id FK, rider_id FK, decided_at,
  context_score, habit_score, evidence_score,
  level,                         -- L0..L4
  reasons JSON,                  -- explanation payload
  model_version
)

stepup_events(
  id PK, rider_id FK, session_id FK, method, issued_at, result  -- passed | failed | pending
)

rider_profiles(                  -- or Redis; persisted snapshot
  rider_id PK, profile_json, updated_at
)

audit_log(
  id PK, rider_id, actor,        -- system | reviewer:<id>
  action, details JSON, at
)
```

Indexes: `sessions(rider_id, started_at)`, `decisions(level, decided_at)`, `decisions(rider_id, decided_at)`.

---

## 8. API contract (agree on this in hour 1, mock it, build in parallel)

All JSON. FastAPI generates `/docs`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/sessions/score` | Score one session, return decision |
| `GET` | `/riders/{id}` | Rider profile summary + current status |
| `GET` | `/riders/{id}/timeline` | Sessions with scores, for the rider detail chart |
| `GET` | `/decisions?level=L2&limit=50` | Recent escalations (review queue) |
| `POST` | `/decisions/{id}/review` | Human reviewer verdict (confirm / dismiss) |
| `POST` | `/stepup/{rider_id}/result` | Report outcome of a step-up check |
| `GET` | `/stream` | SSE live feed of decisions |
| `GET` | `/metrics/summary` | Headline KPIs (see section 10) |
| `GET` | `/metrics/compare` | Strict vs Open vs Trust Juggler numbers |
| `POST` | `/lab/scenario` | Trigger a scenario for a rider (new_phone, handoff, ...) |
| `POST` | `/lab/run` | Start/stop/speed of the live simulation |

Example `POST /sessions/score`

```json
{
  "rider_id": "R10432",
  "started_at": "2026-10-17T18:04:11Z",
  "context": {"device_id":"d_91af","os":"Android 14","app_version":"5.2.1",
              "ip_asn":"AS55836","city":"Pune","zone":"Z7","network_type":"4g"},
  "habit": {"accept_latency_ms":1840,"tap_interval_ms":212,"swipe_speed":0.61,
            "avg_speed_kmh":23.4,"route_deviation":0.18,"idle_gap_min":6.2,
            "cancel_rate":0.04,"accept_rate":0.91,"orders_per_hour":2.1}
}
```

Response

```json
{
  "session_id": "S88123",
  "level": "L2",
  "context_score": 0.08,
  "habit_score": 0.97,
  "evidence_score": 7.4,
  "action": "step_up_selfie",
  "reasons": [
    {"feature":"tap_interval_ms","z":4.1,"direction":"slower"},
    {"feature":"accept_latency_ms","z":3.6,"direction":"slower"},
    {"note":"device and city unchanged; 6 consecutive deviating sessions"}
  ],
  "model_version": "tj-0.3"
}
```

---

## 9. Dashboard (what judges will see)

1. **Live feed:** streaming sessions colored by level, with reasons on hover.
2. **Rider detail:** timeline with context-change markers and habit-deviation line, evidence meter, and a plain-English explanation.
3. **Lab control panel:** buttons to trigger "rider gets new phone", "rider moves city", "hand the account to someone else", "gradual sharing". Watch the engine react live.
4. **Trade-off panel:** Strict Gate vs Open Gate vs Trust Juggler as a lockout-vs-detection curve, with our operating point marked.
5. **Review queue:** escalated accounts with confirm/dismiss actions, which feed back into calibration.
6. **KPI strip:** false-lockout rate, takeover detection latency, step-up rate, accounts under watch.

---

## 10. Evaluation and headline metrics

| Metric | Definition | Target |
|---|---|---|
| **False step-up rate** | Honest-owner sessions reaching L2+ / all honest-owner sessions | ≤ 0.5% |
| **False lockout rate** | Honest-owner sessions reaching L3+ (held or suspended) | ~0% |
| **Ordinary life-event friction** | Share of riders asked for a selfie within 21 days of new phone, OS update, move, new zone, break or new network | close to the no-event background rate |
| **Takeover detection latency** | Attacker sessions (and hours) from first impostor session to first L2+ | median ≤ 5 sessions |
| **Takeover recall** | Attacked accounts flagged within 14 days | ≥ 90% |
| **Scoring latency** | p95 per session | < 50 ms |
| **Throughput** | Sessions scored per second on one machine | ≥ 1,000/s |

**Measured on 1,000 held-out riders (2,000 generated, seed 7; full output in `docs/sample/`):**

| System | False step-up | False lockout | Takeover recall (14 d) | Riders asked for a selfie after an ordinary life event |
|---|---|---|---|---|
| **Trust Juggler** | 0.42% | 0.00% | **96.9%** (median 3 sessions) | **5.4%** (background without any event: 5.3%) |
| Naive anomaly detector (same 0.5% budget) | 0.49% | 0.00% | 84.2% | 15.8% |
| Strict gate (re-verify on any context change) | 0.71% | 0.00% | 34.2% | 65.1% |
| Open gate | 0% | 0% | 0% | 0% |

Median scoring latency is 0.03 ms (p95 0.04 ms), about 30,000 sessions per second on one core. These are results on our *synthetic* population; the simulator and its assumptions are in `sim/`.

Plots to ship: recall by attack type, step-up rate by life-event type, detection-latency distribution, and the trade-off curve (`tradeoff_curve` in `docs/sample/compare.json`) against the baselines.

---

## 11. Repository layout

```
HackForge/
├── README.md                  # this file
├── docker-compose.yml, Dockerfile
├── .env.example
├── engine/                    # Dev A
│   ├── engine.py              # TrustEngine: score_session, step-up / review outcomes
│   ├── features.py            # signal groups: persona / environment / device
│   ├── profile.py             # per-rider baselines, known contexts, status
│   ├── stats.py, priors.py    # online statistics, cohort priors (cold start)
│   ├── evidence.py            # multivariate EWMA accumulator
│   ├── calibrate.py, train.py # threshold calibration, model save/load
│   ├── explain.py
│   ├── models/default.json    # ready-to-use trained model
│   └── tests/
├── sim/                       # Dev A
│   ├── archetypes.py, rider.py
│   ├── effects.py             # 8 life events + 6 attacks
│   ├── generate.py            # dataset builder (CSV)
│   ├── live.py                # LiveWorld for the demo lab
│   ├── baselines.py, evaluate.py   # comparison systems + metrics
│   └── quickstart.py
├── api/                       # Dev B
│   ├── main.py                # routes, SSE, app factory
│   ├── service.py             # engine + DB + events (TrustService)
│   ├── lab.py                 # simulated world, scenarios, background runner
│   ├── models.py, db.py       # SQLAlchemy schema, SQLite / PostgreSQL
│   ├── auth.py, deps.py, security.py   # accounts, role checks, password hashing
│   ├── portal.py, seed.py, manage.py   # rider view, demo accounts, provisioning CLI
│   ├── schemas.py, settings.py, errors.py, bus.py, asgi.py
│   └── tests/
├── src/                       # front end (React + Vite + Tailwind)
│   ├── pages/                 # landing, auth/ (4 forms), rider/, company/ (dashboard, review, riders, history, lab, compare)
│   ├── auth/, api/            # session context, role guard, API client (cookie + CSRF)
│   ├── components/            # layout, ui primitives, landing sections
│   └── lib/plain.ts           # plain-language wording for results and reasons
├── e2e/smoke.cjs              # real-browser end-to-end check (37 steps)
└── docs/
    ├── pitch.md
    ├── demo-script.md
    └── images/
```

---

## 12. Work split for three developers

> **Status:** implemented and tested: the engine and simulator (Dev A, [`docs/dev-a.md`](docs/dev-a.md)), the API, database, accounts and live stream (Dev B, [`docs/dev-b.md`](docs/dev-b.md)), and the app: public landing page, rider and company sign-in, a rider page, and the company dashboard with review, riders, history, demo lab and comparison pages (`src/`, driven end to end by `e2e/smoke.cjs`). How to run it is in section 19.

### Dev A: Engine, simulator and evaluation (the brain)
**Owns:** `engine/`, `sim/`
- Simulator: archetypes, life events, attack scenarios, labeled dataset generator.
- Feature extraction and per-rider profile with cold-start prior.
- Context-novelty and habit-deviation scoring.
- Evidence accumulator, decision matrix, conformal calibration.
- Explanation builder.
- `evaluate.py`: the metrics from section 10 and the comparison against the three baselines.
- Exposes one function the API calls: `score_session(rider_state, session) -> Decision`.

**Deliverables by hour:** simulator + dataset (6) · working scorer (12) · calibration + evaluation numbers (18) · tuned and tested (22).

### Dev B: Backend, data and infrastructure (the spine)
**Owns:** `api/`, `docker-compose.yml`, DB
- Pydantic schemas and SQLAlchemy models from section 7; migrations or `create_all`.
- All endpoints in section 8; start with stub responses so Dev C is unblocked from hour 2.
- Rider-state store (Redis or in-memory) and plug in Dev A's `score_session`.
- SSE stream, review/step-up flow, audit log.
- Live simulation runner (`lab.py`): replays generated sessions at adjustable speed and injects scenarios on demand.
- Bulk-load generated data, add indexes, throughput test, Docker Compose, deployment.

**Deliverables by hour:** schemas + stub API (3) · DB + data load (8) · engine integrated + SSE (14) · lab endpoints + review flow (18) · deploy + load test (22).

### Dev C: Frontend, demo and pitch (the face)
**Owns:** `web/`, `docs/`
- Design system and layout (dark, ops-console look).
- Pages: Live feed, Rider detail, Lab controls, Trade-off, Review queue, KPI strip.
- Build against mock data first, switch to the real API when Dev B's stubs land.
- Charts (timeline, evidence meter, Pareto curve, latency histogram).
- Pitch deck, demo script, rehearsals, README screenshots/GIF, backup video.

**Deliverables by hour:** scaffolding + mocks (4) · Live + Rider pages (10) · Lab + Trade-off (16) · polish + real API (20) · pitch + rehearsal (24).

### Integration points
| Between | Interface | Rule |
|---|---|---|
| A ↔ B | `score_session(state, session) -> Decision` + `Decision` dataclass | agree the dataclass in hour 1 |
| B ↔ C | OpenAPI at `/docs` + sample JSON in `web/src/api/mocks/` | B posts stubs first |
| A ↔ C | `/metrics/compare` payload shape | A writes JSON, B serves, C charts |

---

## 13. 24-hour timeline

| Hour | Milestone |
|---|---|
| 0 to 1 | Read this document together. Freeze schemas and API contract. Create repo, branches, `.env.example` |
| 1 to 4 | A: simulator v0 · B: stub API + DB · C: scaffold + mocked pages |
| 4 to 8 | A: dataset + features + profile · B: data load + store · C: Live feed and Rider pages on mocks |
| 8 to 12 | A: scoring + decision matrix · B: integrate engine · C: connect to real API |
| 12 | **Checkpoint 1:** end-to-end single session flows UI → API → engine → DB → UI |
| 12 to 16 | A: evidence accumulator + calibration · B: SSE, lab runner, review flow · C: Lab panel + Trade-off page |
| 16 to 19 | A: baselines + metrics · B: load test, Docker, deploy · C: polish, empty/error states |
| 19 | **Checkpoint 2:** full demo run-through, all scenarios work live |
| 19 to 22 | Fix bugs, tune thresholds, freeze features at hour 22 |
| 22 to 24 | Pitch deck, rehearse 3x, record a backup demo video, tag release |

Sleep in shifts. Never leave the demo path untested for more than 4 hours.

---

## 14. Git workflow

- `main`: always demo-able. Branches: `feat/engine`, `feat/api`, `feat/web`.
- Small commits, rebase or merge from `main` every 2 to 3 hours, never force-push shared branches.
- One person (Dev B) merges to `main` and owns the deployed build.
- Feature freeze at hour 22. After that, bug fixes only.

---

## 15. Demo script (5 minutes)

1. **Problem (30s):** the Strict/Open gate trade-off, and "same phone, different person".
2. **Honest rider (60s):** in the Lab, give rider *Asha* a new phone, then move her to another city. The feed shows context changed, habits unchanged, **no friction**, and the system learns the new context.
3. **Rented account (90s):** hand a different account to someone else on the same phone in the same city. Watch habit deviation climb, evidence meter fill, then an **L2 step-up** fires with reasons.
4. **Slow drift (30s):** show the gradual-sharing case caught by accumulation, not by any single session.
5. **Numbers (60s):** Trade-off page. Strict Gate locks out X% of honest sessions, Open Gate detects nothing, Trust Juggler hits ≤ 0.5% false lockouts with median detection in N sessions.
6. **Scale + close (30s):** throughput and latency, then the one-line pitch.

**One-line pitch:** *"We stop asking 'did something change?' and start asking 'did the person change?', so honest riders never notice us and rented accounts can't hide."*

---

## 16. How this maps to likely judging criteria

| Criterion | Our answer |
|---|---|
| Solves the stated problem | Context/Habit split directly handles the trade-off and the "same phone, new person" case |
| Technical depth | Online profiles, cohort priors, EWMA evidence accumulation, calibrated thresholds |
| Honest-worker protection | Measured false-lockout rate per life event, ladder with human in the loop |
| Real-time and scale | < 50 ms scoring, SSE, cache-backed state, throughput numbers |
| Originality | Decoupling, drift accumulation, simulation lab, poisoning protection |
| Demo and clarity | Live scenario buttons and a single trade-off chart |
| Responsibility | No raw biometrics stored, only aggregate habit statistics; reasons for every flag; humans decide suspensions |

---

## 17. Risks and fallbacks

| Risk | Mitigation |
|---|---|
| Judges question synthetic data | State it openly, publish the generator and parameters, make the engine accept any CSV in our schema |
| Model too complex to finish | Ship the matrix with robust z-scores first (hour 12). Evidence accumulation and calibration are upgrades (already built in `engine/`) |
| Integration slips | Mocks and frozen contract from hour 2, checkpoint at hour 12 |
| Live demo fails | Pre-recorded video, seeded deterministic scenarios, local Docker copy |
| Redis/Postgres trouble | Fallback to in-process state and SQLite behind the same SQLAlchemy layer |
| Overfitting our own simulator | Hold out unseen attack types in evaluation and say so |

---

## 18. Definition of done

- [ ] Dataset generator runs in one command
- [ ] `/sessions/score` returns a decision with reasons in < 50 ms
- [ ] Live feed, Rider detail, Lab and Trade-off pages work against the real API
- [ ] All six attack scenarios and eight life events can be triggered live
- [ ] Metrics table from section 10 filled with real numbers
- [ ] Docker Compose brings everything up with one command
- [ ] Pitch deck and 5-minute demo rehearsed three times
- [ ] Backup demo video recorded

---

## 19. Run it

Verified on Python 3.13 and Node 22. Everything below was run as written.

```bash
# 1. configuration (the file is git-ignored; the example enables demo accounts for development only)
cp .env.example .env

# 2. backend: http://localhost:8000  (API docs at /docs)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.asgi:app --port 8000

# 3. front end: http://localhost:5173  (the dev server proxies /api to the backend)
npm ci
npm run dev
```

The first start creates the tables (SQLite file `data/trustjuggler.db`), builds the 60 simulated riders and creates the demo accounts. It takes about 5 seconds.

**Sign in** (development accounts from `.env.example`, password `demo-pass-123`):

| Role | Where | Identifier |
|---|---|---|
| Operations team | `/company/login` | `ops@trustjuggler.demo` |
| Delivery rider | `/rider/login` | `9000000001` (linked to simulated rider R00001), `9000000002`, `9000000003` |

Anyone can also create a rider account at `/rider/register`. Company sign-up at `/company/register` needs the invite code in `TJ_COMPANY_INVITE_CODE`.

**Finding things (operations):** *Riders* searches by name, rider ID or phone number; *Sessions* looks a session up by its session ID or decision number and filters by date range, result, city, area and phone; *Needs review* and *History* have search, filters and date ranges. Details and limits: `FEATURE_AUDIT_AND_PENDING_WORK.md`.

**See the database (for judges and reviewers).** Sign in as the operations user and open **Database** in the sidebar (`http://localhost:5173/database`). It shows which database is connected, every table with its columns, keys and row counts, and lets you browse, search and page through the real rows. It is read-only; password hashes, session and CSRF tokens are never shown and phone numbers and e-mails are masked. To look at the file itself: with the default SQLite setup open `data/trustjuggler.db` in DB Browser for SQLite, the `sqlite3` command line (`sqlite3 data/trustjuggler.db ".tables"`) or an editor extension; with PostgreSQL (`docker compose up`) connect psql, pgAdmin or DBeaver using the host, port, database and user in `DATABASE_URL`. A browser link is only available while the app is running on your machine; to show the data without the app, show the file in one of those tools.

**More accounts without the web form:** `python -m api.manage create-company-user --name "Asha" --email asha@fleet.example` (asks for the password), `create-rider`, `set-password`, `list-users`.

**PostgreSQL instead of SQLite:** set `DATABASE_URL=postgresql+psycopg://user:pass@host:5432/db`, or `docker compose up --build` for the API with a PostgreSQL container. Tables are created automatically.

**Checks:**

```bash
python -m pytest -q                                   # engine, simulator, API, accounts (about 3 minutes)
npm run build && npm run lint                         # type check + production build + lint
npm run preview &                                     # serves the build on :4173
NODE_PATH=$(npm root -g) node e2e/smoke.cjs           # drives the real app in Chromium (needs `playwright`)
```

**Data and restarts.** Accounts, the company and sign-in sessions are stored in the database and survive restarts. The simulated riders, sessions and decisions are demo data: with `TJ_RESET_ON_START=true` (default) they are rebuilt at every start, and the **Reset the demo** button does the same. With `TJ_RESET_ON_START=false` nothing is cleared, rider baselines are restored from the database, and the simulation lab is off (there is no simulator to feed it).

**What is simulated.** The riders, their sessions and the habit signals (tap rhythm, time to accept an order, and so on) are generated by `sim/`. The rider's "confirm it is you" step is a button, not a real selfie or liveness check. Password reset by email is not built (there is no mail service); an administrator resets a password with `python -m api.manage set-password`.

## 20. Glossary

- **Step-up:** extra verification (selfie/liveness, OTP) triggered for a risky session.
- **EWMA evidence:** exponentially weighted average of z-scores; a persistent shift adds up while noise cancels.
- **Calibration:** choosing the step-up threshold from honest riders so the false-alert rate stays within a stated budget `α`.
- **Cold start:** scoring a rider with little history, using a cohort prior.
- **Profile poisoning:** an attacker's sessions gradually becoming the rider's "normal"; prevented by not learning from flagged sessions.
