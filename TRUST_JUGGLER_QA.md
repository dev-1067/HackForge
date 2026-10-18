# Trust Juggler: 25 questions judges may ask (with honest answers)

Split as **8 easy, 9 moderate, 8 difficult**. Numbers come from this project's own simulation (`docs/sample/compare.json` and the live dashboard), so say "in our simulation" when you quote them.

| Level | Questions | Topics |
|---|---|---|
| Easy | 1 to 8 | what it is, who uses it, tech stack, demo basics, database, data |
| Moderate | 9 to 17 | how the engine decides, false alarms, privacy, explainability, testing, simulation, security |
| Difficult | 18 to 25 | attacks, scaling, fairness, real-world gaps, honest limits, future scope, business |

---

## EASY

### 1. What is Trust Juggler, in one sentence?
A real-time identity engine for delivery platforms that notices when a rider's account is probably being used by someone else (rented, handed off, stolen) **without** treating an honest rider's new phone or new city as suspicious.

### 2. What problem does it solve?
Platforms verify a rider once and then trust every later login. Strict re-verification on every change (new phone, new network, new city) annoys honest riders; never re-verifying lets rented accounts go unnoticed. We sit between the two by looking at **how** the account is used, not just **where** it is used from.

### 3. Who are the users, and what does each see?
- **Operations team** (company portal): dashboard with a rider map, a review queue (clear or suspend an account), rider search, session lookup, history, and a simulation lab.
- **Delivery partners** (rider portal): their own activity, notifications, a work summary, account and verification, help and review requests, security and settings. They see plain language only, never scores.

### 4. What technology did you use, and why?
Python 3.13 with FastAPI and SQLAlchemy 2 for the API and database (SQLite by default, PostgreSQL supported); React 19, Vite, TypeScript, Tailwind, Recharts and Leaflet for the front end. The scoring engine uses only the Python standard library, so it is easy to read, test and run anywhere. Live updates use Server-Sent Events. Why: quick to build in 24 hours, easy to demo with zero setup, and the same SQLAlchemy code runs on SQLite or PostgreSQL.

### 5. How is the database used, and where can I see it?
Every scored session, decision, extra check, review, request and account is stored. Main tables: `riders`, `sessions`, `decisions`, `stepup_events`, `rider_profiles`, `audit_log`, `users`, `review_requests`, `sign_in_events`, `notification_reads`. Open `data/trustjuggler.db` in DB Browser for SQLite (`open_database.bat`) to show it; `DATABASE_AND_CREDENTIALS.md` has ready-made queries. The audit log is append-only.

### 6. Is the data real?
No. The problem statement allowed us to generate our own data, so a simulator (`sim/`) creates sixty riders with different working patterns, plus life events (new phone, moving city, illness, schedule change) and attacks (hard handoff, gradual sharing, credential theft, fleet farming). The engine never reads the simulator's ground-truth labels; they are used only to measure accuracy.

### 7. What are the different outcomes for an account?
Normal, Watching, Extra check ("Was this you?"), On hold (payouts held until a person reviews), Suspended. Internally these are levels L0 to L4, but the interface never shows those codes.

### 8. Can you show it working in one minute?
Open the Demo lab, run **New phone** for a rider: nothing escalates (the phone changed, the habits did not). Run **Hard handoff** for another: within a few sessions it becomes a case. Open **Needs review**, read the plain-language reasons, press Clear or Suspend, then show the decision in **History**.

---

## MODERATE

### 9. How does the engine actually decide?
For each session it computes two things against that rider's own baseline: how **unfamiliar the context** is (device, city, area, network) and how far the **habits** are (order-acceptance time, tapping rhythm, swipe speed, riding speed, route deviation, idle gaps, cancel and accept rates, orders per hour). Evidence accumulates over several sessions, and only a **sustained** change crosses a calibrated threshold. A new context with matching habits stays Normal; a changed habit with a known context raises evidence slowly; both together raise it quickly.

### 10. Why not just flag every new device?
That is the "strict gate" we compare against. In our simulation it asks honest riders for a check in 0.71% of sessions and catches only 34% of takeovers within 14 days. Trust Juggler asks in 0.42% of sessions and catches 97%. A device is cheap for a legitimate rider to change; a person's habits are not.

### 11. What numbers did you get, and how were they measured?
On held-out simulated riders (calibration riders and test riders are disjoint), within 14 days of a takeover:

| System | Honest riders asked for a check | Takeovers caught | Typical sessions to detect |
|---|---|---|---|
| Open gate (never re-verify) | 0% | 0% | never |
| Strict gate | 0.71% | 34% | 1 |
| Naive anomaly detector | 0.49% | 84% | 1 |
| **Trust Juggler** | **0.42%** | **97%** | **3 (about 26 hours)** |

No honest rider was put on hold in the test. These are simulation results, not production results.

### 12. How do you avoid false alarms? What is "calibration"?
We replay riders known to be honest (including riders with life events) through the real engine, each passing every check, and choose the smallest threshold where no more than about 0.5% of sessions reach "Extra check". Calibration riders are separate from test riders so the reported rates are honest. The dashboard shows live accuracy against the simulator's known truth.

### 13. Can a person see why a rider was flagged?
Yes. Each decision stores its top reasons and the review screen shows them in plain words (for example "Saw a new phone, and activity has also changed"). Staff always see this reminder: a new phone or place is a reason to look closer, **not proof** of sharing. The rider sees what was noticed, which sessions stood out, what it means and what they can do, without scores or model terms.

### 14. What happens if the rider doesn't answer the extra check?
It does not wait forever. After a configurable time (default 60 minutes) the check is closed as expired and the account goes **On hold** so a person must decide. We deliberately do **not** count that as a failed check, because not answering proves nothing. Staff can still clear or suspend at any time.

### 15. How do you protect rider privacy?
We look at how the app is used (timing, rhythm, speed), not continuous location or identity documents. Phone numbers are masked, riders can download all their data, the database view hides secrets and masks contact details, and a rider can only ever read their own records (the rider id comes from the session, never the request). Riders are told that a new phone or city is normal.

### 16. How did you test it?
250 automated backend tests (engine, simulator, API, accounts, search, live cases, notifications), plus a real-browser run of 76 checks that clicks through both portals: sign-in, search and filters, session lookup, clearing and suspending cases, the map, notifications, downloads, dark mode, phone layouts and role isolation. The type check, production build and lint are clean. The suite runs on SQLite; PostgreSQL 16 was checked separately with a script. Not run: the Docker image build.

### 17. How is the app secured?
Passwords use scrypt with a random salt; sessions use an HttpOnly, SameSite cookie and only a digest of the token is stored; every change needs a CSRF token; five failed sign-ins lock an account for 15 minutes; company sign-up needs an invite code; the two roles are strictly separated (a rider gets 403 on every company endpoint). Not built: password reset by e-mail (no mail service).

---

## DIFFICULT

### 18. How could a smart attacker beat this?
Three ideas, and what stops them:
- **Slowly retrain the profile** ("poisoning"): learning fades as evidence approaches the threshold and stops while a check is pending; flagged sessions are only learned from after a verified check or a reviewer clears them.
- **Copy the owner's habits**: possible in principle; the engine then sees only a context change, which is by design not enough. This is a real limit: a perfect mimic is not detectable from behaviour alone, so the answer is layered controls (the selfie check, payout holds, review).
- **Share one phone across many accounts**: a shared-device signal is tracked and raised as context novelty.
Honest answer: we measure against our simulator's attacks; real attackers will adapt, so the system needs continuous retraining and real fraud labels.

### 19. Your data is simulated. Why should we trust the results?
We should not treat 97% as a production claim, and we say so. What the simulation does show is the **relative** behaviour of the four approaches under identical conditions, with calibration and test riders kept separate and the ground truth hidden from the engine. The honest next step is a pilot on a real platform's historical logs, comparing against known confirmed takeovers.

### 20. Will it scale to millions of riders?
Not as it stands, and we are upfront about that. The engine is a small stateless-per-session calculation, but the prototype keeps rider state in one process, uses a lock around scoring, and runs a single worker; search is plain partial matching and some filters read JSON columns without an index. To scale: shard rider state by rider id (or hold it in Redis), move to PostgreSQL with indexes on city and zone, put scoring behind a queue, and use a proper search service. The per-session math itself is cheap.

### 21. Could the system be unfair to some riders?
Yes, and it is the reason for several design choices: every rider is compared **to their own** baseline (not to a fleet average); legitimate life events (new phone, new city, illness, schedule change) are simulated and used in calibration; a context change alone can never escalate an account; a human decides on suspension; and unanswered checks lead to a review, not an automatic penalty. Still, riders with very irregular patterns will be harder to model, and real fairness testing across cities, vehicle types and device quality is required before deployment.

### 22. What are the biggest limitations today?
- All data is simulated; the extra check is a button, not a real selfie or liveness check.
- Map positions are derived from city and area code, not GPS.
- No e-mail or SMS, no password reset by e-mail, no payouts or earnings (we refused to invent them).
- Honest riders can still be flagged by chance (about 1% of sessions in our live simulation).
- Single-process prototype (see question 20); Docker image build untested.
- Search is basic partial matching.

### 23. What would you build next (future scope)?
1. **Real verification**: selfie plus liveness through a provider, with the result feeding the same ladder.
2. **Real data pilot** with a partner platform to retrain and recalibrate on confirmed takeovers.
3. **Mobile SDK** to collect the habit signals on-device, with consent and on-device pre-processing for privacy.
4. **Fraud-ring detection** across accounts (shared devices, payment details, referral loops) using graph analysis.
5. **Human-in-the-loop learning**: reviewer verdicts become labels that improve thresholds per city.
6. **Appeals and SLAs** for riders, with measured response times.
7. **Alerts** (push, SMS, e-mail) and a webhook API so the platform's payout system can act on holds automatically.
8. **Scale-out** architecture (queue, sharded state, PostgreSQL indexes) and drift monitoring.
9. **Fairness dashboard** that reports flag rates by city, vehicle type and device class.

### 24. Where else could this be used (applications)?
Anywhere an account can be rented, shared or handed off: ride-hailing and cab drivers, freelance and gig marketplaces, online exam and tutoring platforms, gaming and streaming account sharing, fintech and wallet apps (account takeover), corporate and call-centre agents, and any app with a long-lived login. The idea transfers: separate cheap-to-change context from hard-to-fake behaviour, and escalate only when both change.

### 25. What is the business case, and why will it win over a simple rule?
For a platform the costs are: rented accounts (underage or unvetted riders, safety and liability, fraud payouts) versus the cost of interrupting good riders (churn, support tickets, lost orders). A simple rule trades one for the other: the strict gate gives up 66% of takeovers in our test, the open gate gives up all of them. Our contribution is a better trade-off curve (the dashboard's "How it compares" page shows it), explanations a reviewer can act on, and a design that keeps a person in charge of the heavy decisions. Revenue could come from per-active-rider pricing or per-decision API pricing; the honest caveat is that the real value must be proven on real data.

---

### Quick reference for the stage

- **One-line pitch:** "A new phone shouldn't make an honest rider suspicious, but a new person riding should."
- **Three numbers (simulation):** 0.42% honest riders asked, 97% takeovers caught in 14 days, 3 sessions to notice.
- **Three honest limits:** simulated data, button instead of real selfie check, single-process prototype.
- **Where to look:** `README.md` (plan), `TRUST_JUGGLER_A_TO_Z.md` (everything), `DATABASE_AND_CREDENTIALS.md` (tables and accounts), `FEATURE_AUDIT_AND_PENDING_WORK.md` (what was built and verified).
