# Trust Juggler: the complete A to Z guide

A real-time identity engine for delivery platforms. It notices when a rider's account is probably being used by someone else (rented, handed off, stolen) **without** treating an honest rider's new phone or new city as proof of anything.

This file is the one place that explains the whole project: the idea, how it works, every screen, every endpoint, the database, how to run it, how to demo it, what was tested, and what is simulated. Numbers and names in it were checked against the code on the day it was written.

---

## A. At a glance

| | |
|---|---|
| Problem | Problem Statement 1, "The Rented Account Problem" (a rider is verified once, then the account can be passed to someone else) |
| Core idea | Separate **context** (phone, city, network: cheap to change legitimately) from **habit** (how orders are accepted, tapping rhythm, riding style: hard to fake). A context change alone is never proof. A context change **plus** a changed habit is. |
| Who uses it | **Operations team** (company portal) and **delivery partners** (riders) |
| Stack | Python 3.13, FastAPI, SQLAlchemy 2, SQLite (default) or PostgreSQL; React 19, Vite 8, TypeScript, Tailwind 3, react-router 7, Recharts, Leaflet |
| Data | 100% simulated (sixty simulated riders, about 3,000 sessions after a fresh start) |
| Tests | 253 backend tests, 76 browser checks, type check, production build, lint (all passing at the last run) |

---

## B. Background: the problem

A platform checks a rider once (ID, background check) and then trusts every later login. Two bad outcomes follow:

| Approach | What goes wrong |
|---|---|
| **Strict gate** (re-verify on any change) | Honest riders are interrupted whenever they buy a phone, change network or move city. |
| **Open gate** (never re-verify) | A rented or handed-off account is never noticed. |

Trust Juggler sits between them: it learns each rider's own pattern and only escalates when the **way the account is used** changes, not just where it is used from.

---

## C. How the engine works (plain version)

1. **Two kinds of signal per session**
   - *Context*: device id, OS, city, area (zone), network type, network provider, app version.
   - *Habit*: time to accept an order, tap interval, swipe speed, riding speed, route deviation, idle gaps, cancel rate, accept rate, orders per hour.
2. **A personal baseline** is learned for every rider (what is usual for *them*).
3. **Two scores per session**: how unfamiliar the context is, and how far the habits are from the rider's usual.
4. **Evidence accumulates** over several sessions. One odd session is not enough; a *sustained* change is.
5. **A calibrated threshold** decides when evidence is enough. Calibration is tuned so honest riders are rarely bothered.
6. **A graduated ladder** (internal names L0 to L4) turns that into actions:

| Internal | Shown to staff as | Meaning |
|---|---|---|
| L0 | Normal | Nothing to do. A new phone with matching habits is a normal life event. |
| L1 | Watching | Small changes; a quiet eye is kept. |
| L2 | Extra check | The rider is asked "Was this you?" |
| L3 | On hold | Payouts held until a person reviews. |
| L4 | Suspended | Account paused until reviewed. |

The internal codes are never shown in the interface. Riders are never shown scores, thresholds or model terms.

**Principle kept everywhere:** *a context change is not proof of sharing.* Every screen that mentions a new phone or place says so.

Code: `engine/` (features, profile, evidence, calibration, explanations). Simulator: `sim/` (riders, life events such as a new phone or moving city, and attacks such as a hard handoff or credential theft). The engine never reads the simulator's ground-truth labels.

---

## D. What each person sees

### D1. Operations team (company portal)

Sign in at `/company/login`. Sidebar: **Dashboard, Needs review, Riders, Sessions, History, Demo lab, How it compares, Settings**.

| Page | What it does |
|---|---|
| **Dashboard** | Headline numbers (counted up), a **map of riders** by city and area (zoom into a city, click a rider), the **Needs review** list (open cases from the database, with a count), a "fair to honest riders, firm on takeovers" panel (simulation figures, labelled as simulated), how sessions ended up, activity compared with usual, and **Recent sessions** with Live / 24 h / 7 d / 30 d / All time and a Needs attention filter that reads stored data. |
| **Needs review** | Open cases (one card per rider) with the reasons in plain words, a note box, **Clear account** / **Suspend account** (with confirmation), search, status (Pending / Completed / both), severity, city, date range, "Completed cases" list, and **Rider requests** from delivery partners with a reply box (a reply is required to resolve or close). Cases waiting on an unanswered check say so. |
| **Riders** | Search by **name, rider ID or phone** (partial, case-insensitive), filter by status and city, show more. Opens a rider page: activity chart, usual pattern, recent sessions (filter by range, city, phone), requests, history. |
| **Sessions** | Look up a **session ID** or a **decision number** (they are different keys), or explore sessions with search, date range, result, city, area and phone filters, plus **Download CSV**. A session opens a detail page: explanation, times, place, phone, changes noticed, review state, and this session's habits next to the rider's usual. |
| **History** | The append-only record of reviews, checks and request replies. Search by rider, name, action; filter by action, reviewer and date range; **Download CSV**. |
| **Demo lab** | Triggers life events and attacks for a chosen rider, steps sessions, starts **background activity** (with "Leave unusual cases for me to review"), resets the demo. |
| **How it compares** | Strict gate vs open gate vs naive vs Trust Juggler, with the trade-off curve. |
| **Settings** | Light/dark theme, text size, password, where you are signed in. |

Also: a bar appears when a new case arrives while you are on another page; a skip-to-content link; keyboard-friendly controls.

### D2. Delivery partners (rider portal)

Sign in at `/rider/login` (or register at `/rider/register`). Sidebar: **Recent Activity, Notifications, Work Summary, Account & Verification, Help & Review**, then **Security, Settings**.

| Page | What it does |
|---|---|
| **Recent Activity** | Status ("good standing", "please confirm", "payouts on hold", "paused"). When not fine, a **"why" panel**: what was noticed, the sessions that stood out (date, city, phone), what it means, what you can do, when and by whom it was decided, and an **Ask for a review** button that opens Help & Review pre-filled. A timeline of sign-ins, new phones, checks, requests and team replies. Simulated events are tagged "Demo data" and can be hidden. |
| **Notifications** | Team replies, checks asked or finished, new phones and browsers, and the pinned account status. Unread count in the sidebar; **Mark all as read** (saved in the database). |
| **Work Summary** | Your own sessions for 7/30/90 days: totals, sessions per day, usual hours (your time zone), cities, phones. It is not a score and does not affect the account. |
| **Account & Verification** | Profile (phone masked), status, an outstanding check with **Yes, it was me / No, that was not me**, an account check-up, your phones with **"This is my phone"** (a note for the team; nothing is erased and no risk is reset), verification history. |
| **Help & Review** | Report an unfamiliar sign-in, ask for help with a verification, explain a legitimate change, ask a person to review. Validated form, your past requests with status and the team's reply, short FAQ. No response times are promised. |
| **Security** | Sign-in history, where you are signed in, sign out other sessions, change password, warning when a new browser signed in. |
| **Settings** | Theme, text size, privacy note, **Download my data** (JSON, no secrets), sign out. |

---

## E. The data model (database)

Default: SQLite file `data/trustjuggler.db` (WAL mode). PostgreSQL via `DATABASE_URL`. Tables are created automatically at start (`create_all`); there is no migration tool, and existing tables are never altered by the app.

| Table | Purpose | Cleared by demo reset? |
|---|---|---|
| `riders` | One row per rider: status, home city, last decision | yes |
| `sessions` | Every scored session: `context` and `habit` as JSON, source, ground-truth columns (for measuring accuracy only) | yes |
| `decisions` | The engine's decision per session: level, scores, reasons (JSON), review verdict, reviewer | yes |
| `stepup_events` | Extra checks asked and how they ended (pending / passed / failed / expired) | yes |
| `rider_profiles` | Each rider's learned baseline snapshot (JSON) | yes |
| `audit_log` | Append-only record of reviews, checks, replies | yes |
| `companies`, `users` | Accounts (rider or company); passwords are scrypt hashes | no |
| `auth_sessions` | Signed-in sessions (only a digest of the token is stored) | no |
| `login_attempts` | Used for lockout (5 failures in 15 minutes) | no |
| `sign_in_events` | Each successful sign-in with a short browser label | no |
| `review_requests` | Help and review requests and the team's replies | no |
| `notification_reads` | When each rider last opened notifications | no |

Relations: a rider has many sessions; each session has exactly one decision; a user may be linked to a rider by `rider_id`.

**Looking at it:** the team uses **DB Browser for SQLite** (`open_database.bat` on Windows, or open `data/trustjuggler.db`), or `sqlite3 data/trustjuggler.db ".tables"`. With PostgreSQL use psql, pgAdmin or DBeaver. The backend also has read-only endpoints `GET /db/overview` and `GET /db/tables/{name}` for operations users (password hashes and tokens are never returned; phones and e-mails are masked; there is no page for them in the app).

Useful queries and the full list of demo accounts: `DATABASE_AND_CREDENTIALS.md`.

---

## F. Accounts and security

- **Two roles**: `rider` and `company`. A rider cannot reach any company page or endpoint (403), and a rider can only ever read or change their own data (the rider id always comes from the session, never from the request).
- **Passwords**: scrypt with a random salt. Minimum 8 characters, letters and numbers.
- **Sessions**: `HttpOnly`, `SameSite=Lax` cookie `tj_session`. Only a digest of the token is stored.
- **CSRF**: login and `GET /auth/me` return a token; every change (POST) must send it as `X-CSRF-Token`.
- **Lockout**: 5 failed sign-ins in 15 minutes per account.
- **Company sign-up** needs the invite code (`TJ_COMPANY_INVITE_CODE`). Optional `X-Ingest-Key` protects `POST /sessions/score` for machine clients.
- **Privacy**: phones masked in rider and database views; riders can download their own data; the database view hides secrets.
- **Not built**: password reset by e-mail (no mail service). An administrator uses `python -m api.manage set-password`.

### Demo sign-ins (development only, from `.env`)

| Role | Where | Identifier | Password |
|---|---|---|---|
| Operations | `/company/login` | `ops@trustjuggler.demo` | `demo-pass-123` |
| Riders | `/rider/login` | `9000000001` to `9000000059`, and `9000000000` (one account per simulated rider R00000 to R00059; the login page has quick buttons for riders 1 to 3) | `demo-pass-123` |

Change `TJ_DEMO_PASSWORD` or turn off `TJ_SEED_DEMO_ACCOUNTS` for anything real.

---

## G. API reference

Interactive docs while running: `http://localhost:8000/docs`. All unsafe methods need the CSRF header. Company = operations user; Rider = delivery partner.

**Accounts**
`POST /auth/rider/register`, `POST /auth/rider/login`, `POST /auth/company/register`, `POST /auth/company/login`, `POST /auth/logout`, `GET /auth/me`, `GET /me/sessions`, `POST /me/sessions/sign-out-others`, `GET /me/sign-ins`, `POST /me/password`

**Scoring**
`POST /sessions/score` (company session or `X-Ingest-Key`), `POST /stepup/{rider_id}/result`, `POST /decisions/{id}/review`

**Operations (company only)**
| Endpoint | Notes |
|---|---|
| `GET /riders?q=&status=&city=&limit=&offset=` | search by name, id, phone |
| `GET /riders/{id}`, `/timeline?since=&until=&city=&device=`, `/audit` | rider detail |
| `GET /decisions?q=&case_status=pending\|completed&level=&city=&zone=&device=&since=&until=&reviewer=` | review queue and session lists |
| `GET /decisions/{id}`, `GET /sessions/{session_id}` | detail by decision number or session id |
| `GET /audit?q=&action=&reviewer=&since=&until=&limit=&offset=` | history |
| `GET /filters`, `GET /map/riders?city=` | filter values, rider locations |
| `GET /review-requests`, `POST /review-requests/{id}/respond` | rider requests |
| `GET /metrics/summary`, `GET /metrics/compare` | numbers, comparison data |
| `GET /stream` | Server-Sent Events: `decision`, `stepup`, `review`, `lab` |
| `GET /db/overview`, `GET /db/tables/{name}` | read-only database view |
| `GET /lab/scenarios`, `GET /lab/state`, `POST /lab/scenario`, `POST /lab/restore/{rider_id}`, `POST /lab/step`, `POST /lab/run`, `POST /lab/reset` | simulation lab |

**Rider portal (rider only)**
`GET /me/rider`, `POST /me/rider/verification`, `GET /me/rider/activity`, `GET /me/rider/account`, `POST /me/rider/device-change`, `GET/POST /me/rider/requests`, `GET /me/rider/notifications`, `POST /me/rider/notifications/read`, `GET /me/rider/summary?days=7..90`, `GET /me/rider/export`

Dates in query strings are ISO dates or times, read as UTC unless an offset is given; bad input returns 422.

---

## H. Rules about how cases and checks behave

- **Open case** = a decision of "Extra check" or worse with no verdict yet. One card per rider.
- **Clearing** a case returns the rider to normal. **Suspending** confirms a takeover and pauses the account. Both are written to History.
- **An unanswered extra check does not wait forever.** After `TJ_STEPUP_EXPIRY_MINUTES` (default 60; 0 = never) it is closed as *expired* and the account is put **on hold** for a person to decide. This is not counted as a failed check. A sweep runs once a minute.
- **Reporting a new phone** ("This is my phone") only records a note for the team. It never erases evidence, resets risk or skips a check.
- **Live background activity** (Demo lab): with "Leave unusual cases for me to review" on, it stages an occasional takeover for one rider at a time, at most one every 25 seconds, never more than 4 waiting, and nothing new for 30 seconds after a person decides. While 4 are waiting the run pauses ("Paused, waiting for you"). With the option off, the lab answers every check and review itself (the old automatic mode).

---

## I. Run it

```bash
# 1. configuration (git-ignored; the example enables demo accounts for development only)
cp .env.example .env

# 2. backend: http://localhost:8000
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.asgi:app --port 8000

# 3. front end: http://localhost:5173 (proxies /api to the backend)
npm ci
npm run dev
```

The first start builds the sixty simulated riders (about 5 seconds), creates the accounts, and fills the database. Docker: `docker compose up --build` (API plus PostgreSQL; the image build itself was not run in the test environment).

### Settings (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | SQLite file | `postgresql+psycopg://user:pass@host:5432/db` for PostgreSQL |
| `TJ_RESET_ON_START` | true | Rebuild simulated riders, sessions, decisions at every start. Accounts, requests and sign-ins are never cleared. `false` keeps everything (the lab then has no history to replay) |
| `TJ_SEED_DEMO_ACCOUNTS`, `TJ_DEMO_PASSWORD` | true / set | Demo accounts |
| `TJ_COMPANY_INVITE_CODE`, `TJ_COMPANY_NAME` | | Company self-sign-up |
| `TJ_INGEST_KEY` | empty | Protects `POST /sessions/score` |
| `TJ_RIDER_SESSION_HOURS`, `TJ_COMPANY_SESSION_HOURS`, `TJ_COOKIE_SECURE` | 168, 12, false | Sessions (turn `COOKIE_SECURE` on behind HTTPS) |
| `TJ_LAB_ENABLED`, `TJ_LAB_RIDERS`, `TJ_LAB_HISTORY_DAYS`, `TJ_LAB_SEED` | true, 60, 30, 11 | The simulation |
| `TJ_STEPUP_EXPIRY_MINUTES` | 60 | Unanswered check becomes an on-hold case (0 = never) |
| `TJ_CORS_ORIGINS`, `TJ_MODEL_PATH` | | Allowed origins; custom model file |

### Useful commands

```bash
python -m api.manage create-company-user --name "Asha" --email asha@fleet.example   # asks for a password
python -m api.manage create-rider | set-password | list-users
python scripts/setup_demo_states.py      # backend running: puts some riders in pending / flagged / suspended states through the real pipeline
python -m sim.evaluate --out docs/sample # regenerate the strict/open/naive/Trust Juggler comparison
python -m sim.generate --riders 100 --days 30 --out data   # raw CSV dataset
```

---

## J. Five-minute demo script

1. **Landing page** → *Operations Console*. Say the one-line idea: *a new phone shouldn't make an honest rider suspicious*.
2. **Dashboard** (`ops@trustjuggler.demo`): numbers, the rider map (click a city, then a rider), "Fair to honest riders, firm on takeovers".
3. **Demo lab**: pick a rider, run *New phone* → nothing escalated (context changed, habits did not). Run *Hard handoff* → within a few sessions it is caught.
4. **Needs review**: open the case, read the plain-language reasons, **Clear** one, **Suspend** another. Show **History** recording both, and **Sessions** → look up the session id.
5. Turn on **background activity** with "Leave unusual cases for me to review": cases arrive on their own, wait for you, and the run pauses at 4.
6. **Rider side** (`9000000001`): *Recent Activity* ("Was this you?"), a paused account's "why" panel with the proof, *Ask for a review*, then reply from **Needs review → Rider requests** and watch it arrive in *Notifications*.
7. **Database**: open `data/trustjuggler.db` in DB Browser; show `decisions`, `audit_log`, `review_requests`.
8. **How it compares**: strict gate annoys honest riders, open gate misses takeovers, Trust Juggler does both well (on the simulation).

---

## K. Testing and quality (what was actually run)

| Check | Result at the last run |
|---|---|
| `python -m pytest -q` (engine, simulator, API, accounts, partner portal, search, live cases, notifications, database view) | 253 passed (about 7 minutes) |
| `python -m pyflakes api engine sim conftest.py scripts` | clean |
| `npx tsc -b` | no errors |
| `npm run build` | succeeds |
| `npm run lint` | 0 errors (warnings about setting state inside effects remain) |
| `node e2e/smoke.cjs` (real Chromium, 77 checks: both portals, every sidebar link, search and filters, lookup, live cases cleared and suspended by a person, map, notifications, work summary, security, CSV downloads, dark mode, selection colour, ripple, phone layouts, role isolation) | 77 / 77 |

Run the browser checks against a **freshly started backend** (`NODE_PATH=$(npm root -g) node e2e/smoke.cjs`); leftovers from earlier runs can trip a few steps.

**Not run:** the Docker image build. The test suite runs on SQLite; PostgreSQL 16 was exercised with a separate script covering search, filters, lookup, the map, notifications, review and expiry, and all of it passed.

---

## L. Look and feel

- Landing page: original design, with larger body text (milder on phones). Page, panel and button motion (ripple, count-up, map pulse) is switched off when the browser asks for reduced motion.
- App: Comfortable text size by default (Standard / Comfortable / Large in Settings); light theme and a neutral graphite dark theme; selected text has a clear colour pair in both.
- Times from the server are UTC and shown in the viewer's own time zone.

---

## M. Project layout

```
api/            FastAPI app: main.py (routes), service.py (scoring, queries), auth.py, partner.py, portal.py,
                lab.py (simulation lab), dbview.py (read-only database view), models.py, seed.py, tests/
engine/         the scoring engine and its tests (not changed by the later portal work)
sim/            the simulator: riders, life events, attacks, evaluation
src/            React app: pages/company, pages/rider, pages/auth, pages/shared, components, hooks, lib, api
e2e/smoke.cjs   browser test of the whole product
scripts/        setup_demo_states.py
docs/           dev-a.md (engine and simulator), dev-b.md (API, database, lab), sample/ (comparison data)
README.md       the original plan and the run instructions
FEATURE_AUDIT_AND_PENDING_WORK.md   what was found missing, what was built, how it was verified
DATABASE_AND_CREDENTIALS.md         tables, demo accounts, example SQL
```

---

## N. What is simulated or not built (be upfront with judges)

- All riders, sessions and signals come from the simulator. Ground-truth labels exist only to measure accuracy.
- The extra check is a button ("Was this you?"), not a real selfie or liveness check.
- Rider positions on the map are worked out from city and area code (the data has no GPS). The map background needs internet; markers work without it.
- No e-mail or SMS sending, no password reset by e-mail, no earnings or payout data (it would have to be invented).
- Search is plain partial matching (`LIKE`), fine for thousands of riders. City and area filters read JSON fields without an index, fine at demo size.
- Honest riders can still be flagged by chance (about 1% of sessions in the simulation); that is shown, not hidden.
- Docker image build and PostgreSQL for the newest tables are untested.

---

## O. Things that were found and fixed along the way (so nobody repeats them)

- The Demo lab's *Start* answered every case automatically, so cases vanished before anyone could open them; the dashboard "Needs attention" filter only looked at the last 60 live sessions.
- The review queue refilled itself right after a decision; now paced and capped.
- An unanswered extra check stayed pending forever; now it expires into an on-hold case.
- Demo accounts were created for R00001 to R00060 although the simulated riders are R00000 to R00059 (a phantom rider and one rider without an account).
- Review wording had been changed to claim things the engine never measures (datacenter proxy, impossible transit speed, phone model). It again describes only what was actually detected.
- A demo-setup script wrote decisions and made-up reasons straight into SQLite. It now uses the simulation lab through the normal API.
- Server times were read as local time in the browser.

---

## P. Glossary

| Term | Meaning |
|---|---|
| Context | Phone, city, area, network: where and on what the account is used |
| Habit | How the account is used: order acceptance, tapping, riding style |
| Baseline | A rider's own usual pattern |
| Evidence | Accumulated difference from the baseline over several sessions |
| Extra check / step-up | "Was this you?" confirmation |
| Case | An open decision of Extra check or worse awaiting a verdict |
| Takeover | Someone other than the owner using the account |
| Lab | The simulation tools in the app |

---

## Q. Where to read more

`README.md` (original plan, architecture, evaluation, timeline), `docs/dev-a.md` (engine and simulator in depth), `docs/dev-b.md` (API, database, lab), `FEATURE_AUDIT_AND_PENDING_WORK.md` (what was built after the first version and how each part was verified), `DATABASE_AND_CREDENTIALS.md` (tables, accounts, SQL).
