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
2. **Evidence accumulation across sessions** (CUSUM / sequential test). A quiet, slow handoff that stays under every single-session threshold still gets caught as drift builds up.
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
| Cache / live state | **Redis** (optional; fallback in-process dict) | Millisecond rider-profile lookup, shows the real-time/scale story |
| Live updates | **Server-Sent Events** (or WebSocket) | Dashboard feed with no polling |
| Frontend | **React + Vite + TypeScript + Tailwind + Recharts** | Fast to build, good charts, easy deploy |
| Packaging | **Docker Compose** | One command for Postgres + Redis + API + UI |
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

**Honest life events (must NOT be blocked)**
- new phone, new OS version
- moved to another city
- new delivery zone
- vacation gap, then return
- injury or illness (temporary slowdown)
- seasonal schedule change
- different network (new SIM, public Wi-Fi)

**Takeover and rental attacks (must be caught)**
- **Hard handoff:** same phone, same city, a different person from session N onward (the headline case)
- **Gradual sharing:** two people alternate sessions on the account
- **Time-share rental:** the renter uses the account during the owner's off-hours
- **Credential theft:** new device, new city, different habits
- **Fleet farming:** one person running many accounts with near-identical habits (cross-account similarity)
- **Slow drift handoff:** habits shift just under per-session thresholds, to test evidence accumulation

Output: ~2,000 to 10,000 riders and ~1M sessions (scalable by flag), written to the DB / Parquet / CSV in one command: `python -m sim.generate --riders 5000 --days 60`.

---

## 6. The scoring engine in detail

### 6.1 Per-rider profile (online, updated incrementally)
- Robust center and spread per habit feature (median / MAD or EWMA mean and variance).
- A small covariance matrix across habit features, so correlated changes are scored jointly.
- **Cold start:** a new rider borrows a prior from their archetype cohort (hierarchical shrinkage) and the prior fades as sessions accumulate.
- Known-context memory: set of devices, cities and zones seen, with first-seen and last-seen times.

### 6.2 Two scores per session
- **Context novelty `C` in [0, 1]:** how unfamiliar the context is (new device and new city score high, a previously seen device scores low).
- **Habit deviation `H`:** Mahalanobis-style distance of this session's habit vector from the rider's profile, converted to a calibrated probability / p-value.

### 6.3 Evidence accumulation
A CUSUM-style statistic `E` over recent sessions per rider:
`E_t = max(0, E_{t-1} + (z_t − k))` where `z_t` is the habit deviation and `k` is a slack parameter. A single odd session barely moves it, while a persistent shift grows quickly. A reset occurs after a verified step-up check.

### 6.4 Decision matrix

| `C` | `H`/`E` | Decision |
|---|---|---|
| low | low | **L0 Allow** |
| high | low | **L0 Allow + learn context** (life event) |
| low | medium | **L1 Allow + watch** (silent monitoring) |
| low | high | **L2 Step-up** (selfie / liveness check) |
| high | high | **L2/L3 Step-up, hold payout changes** |
| any | very high and sustained | **L3 Manual review / L4 suspend** (human in the loop) |

### 6.5 Calibration (the "never needlessly block" part)
- Hold out each rider's honest sessions (and cohort-level honest sessions for new riders).
- Use conformal-style thresholds so that the share of honest sessions reaching L2+ is bounded by a target `α` (default 0.5%).
- Report the realized false-alert rate, per life-event type, as a headline number.

### 6.6 Profile-poisoning protection
Baselines update only from sessions decided L0/L1. Sessions that triggered a step-up are excluded until verified.

### 6.7 Explanations
Each decision stores top contributing features with direction and magnitude, for example:
`habit: tap_interval_ms +4.1σ, accept_latency_ms +3.6σ · context: device unchanged · evidence: 6 consecutive deviating sessions`.

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
| **False lockout rate** | Honest sessions reaching L2+ / all honest sessions | ≤ 0.5% |
| **Life-event pass rate** | Honest life-event sessions allowed without friction | ≥ 98% |
| **Takeover detection latency** | Sessions (and hours) from true handoff to first L2+ | median ≤ 5 sessions |
| **Takeover recall** | Attacked accounts flagged within 14 days | ≥ 90% |
| **Step-up rate** | Share of all sessions seeing any friction | < 1% |
| **Scoring latency** | p95 per session | < 50 ms |
| **Throughput** | Sessions scored per second on one machine | ≥ 1,000/s |

Plots to ship: precision/recall by attack type, lockout rate by life-event type, detection-latency distribution, and the Pareto curve against the three baselines.

---

## 11. Repository layout

```
HackForge/
├── README.md                  # this file
├── docker-compose.yml
├── .env.example
├── engine/                    # Dev A
│   ├── features.py
│   ├── profile.py             # per-rider baseline + cold start
│   ├── scoring.py             # context + habit scores
│   ├── evidence.py            # CUSUM accumulator
│   ├── decision.py            # matrix + ladder
│   ├── calibrate.py           # conformal thresholds
│   ├── explain.py
│   └── tests/
├── sim/                       # Dev A
│   ├── archetypes.py
│   ├── scenarios.py           # life events + attacks
│   ├── generate.py            # dataset builder
│   └── evaluate.py            # metrics + baseline comparison
├── api/                       # Dev B
│   ├── main.py
│   ├── schemas.py             # Pydantic = the contract
│   ├── db.py, models.py       # SQLAlchemy
│   ├── routes/
│   ├── stream.py              # SSE
│   └── lab.py                 # live simulation runner
├── web/                       # Dev C
│   ├── src/pages/ (Live, Rider, Lab, Tradeoff, Review)
│   ├── src/components/
│   └── src/api/ (client + mocks)
└── docs/
    ├── pitch.md
    ├── demo-script.md
    └── images/
```

---

## 12. Work split for three developers

Keep the contract (sections 7 and 8) frozen after hour 2, so each person can work against mocks.

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
| Technical depth | Online profiles, hierarchical prior, CUSUM evidence, conformal calibration |
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
| Model too complex to finish | Ship the matrix with robust z-scores first (hour 12). CUSUM and conformal are upgrades |
| Integration slips | Mocks and frozen contract from hour 2, checkpoint at hour 12 |
| Live demo fails | Pre-recorded video, seeded deterministic scenarios, local Docker copy |
| Redis/Postgres trouble | Fallback to in-process state and SQLite behind the same SQLAlchemy layer |
| Overfitting our own simulator | Hold out unseen attack types in evaluation and say so |

---

## 18. Definition of done

- [ ] Dataset generator runs in one command
- [ ] `/sessions/score` returns a decision with reasons in < 50 ms
- [ ] Live feed, Rider detail, Lab and Trade-off pages work against the real API
- [ ] All six attack scenarios and seven life events can be triggered live
- [ ] Metrics table from section 10 filled with real numbers
- [ ] Docker Compose brings everything up with one command
- [ ] Pitch deck and 5-minute demo rehearsed three times
- [ ] Backup demo video recorded

---

## 19. Quick start (fill in as you build)

```bash
cp .env.example .env
docker compose up -d                       # postgres + redis
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m sim.generate --riders 5000 --days 60
uvicorn api.main:app --reload              # http://localhost:8000/docs
cd web && npm install && npm run dev       # http://localhost:5173
```

## 20. Glossary

- **Step-up:** extra verification (selfie/liveness, OTP) triggered for a risky session.
- **CUSUM:** cumulative-sum test that detects small persistent shifts.
- **Conformal calibration:** thresholding method that bounds the false-alert rate using held-out honest data.
- **Cold start:** scoring a rider with little history, using a cohort prior.
- **Profile poisoning:** an attacker's sessions gradually becoming the rider's "normal"; prevented by not learning from flagged sessions.
