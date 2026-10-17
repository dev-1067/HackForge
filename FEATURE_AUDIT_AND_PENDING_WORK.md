# Trust Juggler: feature audit, completion status and handover

This file records what the original brief (`README.md`, sections 1 to 18) required, what was found incomplete,
what was implemented, and exactly how each item was verified. The original requirements in `README.md` are unchanged.
(No earlier version of this audit file existed in the repository; the gaps below come from reading the code against the brief.)

Last verified: see the test log at the end. Nothing is marked complete unless a check listed there exercised it.

## 1. What was missing when the audit started

| # | Gap | Status |
|---|---|---|
| A | Rider search matched the rider ID only | Done |
| B | Review queue had no search or filters; completed cases were not shown | Done |
| C | History had no search, filters, date range, reviewer filter or paging | Done |
| D | No way to look up a session or decision by its identifier | Done |
| E | No date ranges (24 hours, 7 days, 30 days, all time) on dashboard, rider history, history views | Done |
| F | No city, area or phone filters on sessions | Done |
| G | No session detail view | Done (new page; nothing existed to reuse) |
| H | Times from the server were read in the browser's local zone instead of UTC | Fixed (`parseUtc`) |

## 2. How each feature works

**Rider search** (`GET /riders?q=&status=&city=`): case-insensitive partial match on rider ID, rider name (from the linked account) and, when the
text is digits, the phone number. One outer join on the account table (one account per rider, so no duplicate rows), `LIKE` wildcards escaped,
runs in the database over every rider, exact ID matches sorted first, paged with `limit`/`offset`. The phone number is searchable but never returned.

**Review queue** (`/review-queue`): search by rider name or ID, status (Pending, Completed, Pending and completed), severity (Extra check, On hold,
Suspended), city, date range, all combined and sent to `GET /decisions` (`q`, `case_status`, `level`, `city`, `since`). "Pending" means a raised case
with no verdict; "Completed" means a verdict exists (cleared, suspended, or the rider confirmed it). Notes, Clear/Suspend with confirmation and audit
logging are unchanged.

**History** (`/audit`, `GET /audit?q=&action=&reviewer=&since=&until=&limit=&offset=`): search rider ID, name, action or actor; filter by action,
reviewer and date range; newest first, "Show more" paging. Read-only: no endpoint can edit or delete audit rows (a test asserts filters change nothing).

**Sessions** (`/sessions`) and **session detail** (`/sessions/decision/:n`, `/sessions/session/:id`): explorer over the stored sessions with search, date
range, result, city, area and phone-ending filters, plus a lookup box where you choose *Session ID* or *Decision number* (they are different keys:
`GET /sessions/{session_id}` and `GET /decisions/{decision_id}`; a test asserts one cannot be used for the other). The detail page shows the
plain-English explanation, rider link, times, place, phone, changes noticed, review state and a table of this session's habits next to the rider's usual
pattern. It states that a new phone or place is not proof of sharing.

**Date ranges**: `since` / `until` accept an ISO date or time; with no zone they are read as UTC, with an offset they are converted. Applied to
`started_at` (sessions) or `at` (history). Invalid text or a start after the end returns 422. Dashboard "Recent sessions" has Live plus the four ranges;
non-live ranges query the stored data, not the live stream. Rider page filters its sessions and chart by range, city and phone.

**City, area, phone filters**: use the existing stored `context` fields. No new data is collected and no fingerprinting was added.
`GET /filters` lists the cities, areas, history actions and reviewers present in the data for the drop-downs.

## 3. Look and feel changes requested with this work

- **Dark mode** is now neutral graphite (about `#202124` page, `#292A2D` cards, `#E8EAED` text, `#3C4043` borders), the same family Chrome uses. The old
  forest-green tint (which looked brownish) is gone; green remains only as the accent.
- **Selected text** has one clear colour pair in both themes (a blue highlight with dark text in light mode, white text in dark mode). A stale global
  `selection:` class that produced pale blue on pale blue was removed from `index.html`.
- **Text size**: landing page small print raised (about 0.125 to 0.19 rem per step) through a `.landing-scale` wrapper that changes font sizes only; app
  screens default to the new "Comfortable" size (Settings > Appearance still offers Standard, Comfortable, Large).
- **Motion**: pages and panels ease in, buttons shrink slightly and show a ripple when pressed, dashboard numbers count up, the new "How sessions ended
  up" bar fills smoothly. All of it is off when the browser asks for reduced motion.
- Content area widened from 1024 px to 1152 px so wide screens look less empty.

## 4. API additions (all company-only, backward compatible)

`GET /riders` (+`city`, name/phone search), `GET /riders/{id}/timeline` (+`since`, `until`, `city`, `device`), `GET /decisions` (+`q`, `city`, `zone`,
`device`, `since`, `until`, `case_status`, `reviewer`), `GET /sessions/{session_id}`, `GET /filters`, `GET /audit` (+`q`, `action`, `reviewer`, `since`,
`until`, `offset`). `GET /decisions/{id}` and the session lookup also return a `rider` block (status, home city, usual pattern). Riders get 403 and
anonymous callers 401 on every one of these. No tables or columns were added in this work.

## 5. Limits and honest notes

- The demo data is generated. Its session times are simulated and older than today, so the dashboard's *Last 24 hours / 7 days / 30 days* ranges can be
  empty until the lab runs (sessions made by the lab use their simulated start times). Sessions and the review queue default to *All time* for that reason.
- Search is plain partial matching (`LIKE`). It is not full-text, fuzzy or phonetic. Fine for thousands of riders; use indexes or a search service before millions.
- The explorer filters city and area on JSON fields without an index (acceptable at demo size).
- The "extra check" is a button, not a real selfie or liveness check (as documented in README section 19).
- Docker image build was not run (no Docker daemon in the build environment). PostgreSQL was verified earlier for the schema and scoring, and the new
  queries only use portable SQLAlchemy constructs, but the new search tests were run on SQLite only.
- No password reset by email (no mail service); use `python -m api.manage set-password`.
- Core engine, calibration, thresholds and the simulation lab were not touched.

## 6. Roles

| Role | Can | Cannot |
|---|---|---|
| Operations (company) | everything on the dashboard, riders, sessions, review, history, lab, settings | read a rider's password or secrets (none are stored in readable form) |
| Delivery rider | own Recent Activity, Account & Verification, Help & Review, Settings, own data export | any company page or endpoint (403), another rider's data |

## 7. Setup and demo

See `README.md` section 19. Demo path for a client: sign in as `ops@trustjuggler.demo` (password from `.env`), open **Demo lab** and run *Hard handoff*,
then **Needs review** (filter, open "View the session", clear or suspend), **Sessions** (look up the session ID you just saw), **History** (search the
rider, filter by reviewer and date), then sign in as rider `9000000001` to see the rider side and send a help request that appears under *Rider requests*.

## 8. Test log

Run on SQLite (the default), Python 3.13, Node 22, Chromium via Playwright:

| Check | Result |
|---|---|
| `python -m pytest -q` (whole suite, incl. 15 new search/filter/lookup tests) | 224 passed |
| `python -m pyflakes api engine sim conftest.py` | clean |
| `npx tsc -b` | no errors |
| `npm run build` | succeeds |
| `npm run lint` | 0 errors (warnings about state set in effects remain, as in the existing pages) |
| `node e2e/smoke.cjs` against a freshly started backend (real Chromium; 63 checks: sign-in, dashboard, lab, search, filters, lookup, partner portal, dark mode, selection colour, landing text size, ripple, phone layouts, role isolation) | 63/63 passed |
| Landing page on a 390 px phone | no sideways scroll (was 15 px before this work) |

Not run: Docker build; the new search tests on PostgreSQL.
