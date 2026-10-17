# Dev A hand-off: engine, simulator, evaluation

Everything here is Python standard library only (Python 3.10+). Tests need `pytest`.

```bash
pip install -r requirements.txt
python -m pytest -q                                      # 76 tests, about 35 s
python -m sim.generate --riders 5000 --days 60 --out data   # labelled dataset (CSV)
python -m sim.evaluate --riders 2000 --out data/eval        # metrics.json, compare.json, model.json
python -m sim.quickstart --out model/model.json             # train + save a model
```

A trained model is already committed at `engine/models/default.json`.

## For Dev B: using the engine

```python
from engine import Session, load_default_engine

engine = load_default_engine()                      # once, at startup

# POST /sessions/score
session = Session.from_dict(request_json)           # raises ValueError -> return 422
decision = engine.score(session)                    # registers unknown riders automatically
return decision.to_dict()

# POST /stepup/{rider_id}/result
engine.report_stepup(rider_id, passed=True)         # returns the new rider status

# POST /decisions/{id}/review
engine.report_review(rider_id, takeover_confirmed=False)

# GET /riders/{id}
engine.rider_summary(rider_id)                      # dict, or None for an unknown rider
```

Things to know:

* **Levels:** `L0` allow, `L1` allow and watch, `L2` ask for a selfie / liveness check, `L3` hold payouts and send to a reviewer, `L4` suspend. `decision.action` is the matching machine-readable string (`allow`, `allow_learn_context`, `allow_monitor`, `step_up_selfie`, `hold_payouts_review`, `suspend_pending_review`).
* **Status** (`active`, `watch`, `pending_stepup`, `held`, `suspended`) lives on the rider. At `L2` the rider stays `pending_stepup`, and every further session stays `L2`, until you call `report_stepup`. A failed check moves the rider to `held` (`L3`), a second failure to `suspended` (`L4`). A reviewer clearing the account (`report_review(..., False)`) resets it.
* **Persistence:** `engine.export_state(rider_id)` returns a JSON-serialisable dict (put it in Redis or the DB); `engine.load_state(dict)` restores it. Note the engine also keeps a device-to-riders map in memory (`engine.device_riders`) for the shared-device signal; rebuild it from stored sessions after a restart if you need it.
* **Concurrency:** the engine is not thread-safe. Use one worker, or guard `score` / `report_*` with a lock per rider.
* **Timestamps:** `started_at` is read as the rider's local time (`hour` and `minute` are used as sent). Send local timestamps.
* **Ground truth** (`gt_*`) exists only in the simulator's records. Never send it to the engine; `SessionRecord.to_payload()` already strips it.

### Lab endpoints (`/lab/scenario`, `/lab/run`)

```python
from engine import load_default_engine
from sim.live import LiveWorld
from sim.quickstart import warm_engine

engine = load_default_engine()
world = LiveWorld(n_riders=60, seed=11, history_days=30)
warm_engine(engine, world)                  # enroll every rider's 30-day history

record = world.next_session("R00007")       # SessionRecord for that rider's next session
decision = engine.score(record.to_engine_session())    # or POST record.to_payload() to your own API
world.trigger("R00007", "hard_handoff")     # from the next session on, someone else is driving
LiveWorld.catalog()                         # [{name, kind, title, description}, ...] for the buttons
```

`record.gt_actor` is `"owner"` or `"other"`; use it in the demo to show whether the engine was right (and to decide whether the simulated rider passes the step-up). The catalog has 8 life events and 6 attacks.

`record.to_payload()` is the JSON body for `POST /sessions/score`:

```json
{"session_id": "R00007-00031", "rider_id": "R00007", "started_at": "2026-02-09T14:12:03.511000",
 "context": {"device_id": "d_6a0d0d2c", "os": "Android 15", "app_version": "5.2.1", "ip_asn": "AS9829",
             "city": "Bengaluru", "zone": "Z18", "network_type": "4g"},
 "habit": {"accept_latency_ms": 1781.168, "idle_gap_min": 2.787, "cancel_rate": 0.0401, "accept_rate": 0.9261,
           "avg_speed_kmh": 12.106, "route_deviation": 0.1259, "orders_per_hour": 3.5588,
           "tap_interval_ms": 226.2138, "swipe_speed": 0.4083}}
```

## For Dev C: what the engine returns

`decision.to_dict()`:

```json
{"session_id": "R00245-00036", "rider_id": "R00245", "level": "L2", "action": "step_up_selfie",
 "status": "pending_stepup", "context_score": 0.0, "habit_score": 0.61, "evidence_score": 4.12,
 "threshold": 3.21, "habit_deviation": 3.03,
 "reasons": [
   {"feature": "swipe_speed", "group": "device", "z": -2.84, "direction": "lower"},
   {"feature": "route_deviation", "group": "environment", "z": -2.45, "direction": "lower"},
   {"note": "known device and location"},
   {"note": "3 consecutive session(s) above normal; evidence 4.1 (step-up at 3.2)"}],
 "model_version": "tj-1.0"}
```

* `evidence_score` against `threshold` is the "evidence meter": full at `threshold` (step-up). Honest riders sit near 1.
* `context_score` (0 to 1) is how unfamiliar the device / city / network is. `habit_score` (0 to 1) is a display-friendly version of `habit_deviation`.
* `reasons` entries are either a feature (`feature`, `group`, `z`, `direction`) or a plain-English `note`.

`engine.rider_summary(id)` gives `status`, `sessions_seen`, `evidence`, `streak`, `failed_stepups`, `known_devices`, `known_cities`, `baseline` (typical value of each habit signal in raw units) and `last_seen`.

Sample outputs for building charts without running anything: `docs/sample/compare.json` (systems and `tradeoff_curve`), `docs/sample/metrics.json` (everything, including per life event and per attack) and `docs/sample/summary.txt`.

## How the pieces fit

| File | Role |
|---|---|
| `engine/engine.py` | `TrustEngine`: context novelty, habit deviation, evidence, decision, learning |
| `engine/profile.py`, `stats.py` | per-rider baselines (per city and per device where they should be) |
| `engine/priors.py` | cohort priors for new riders |
| `engine/evidence.py` | multivariate EWMA evidence |
| `engine/calibrate.py`, `train.py` | choose the step-up threshold from honest riders; save/load a model |
| `sim/archetypes.py`, `rider.py`, `effects.py` | rider population, life events, attacks |
| `sim/generate.py`, `live.py` | CSV dataset, live demo world |
| `sim/baselines.py`, `evaluate.py` | strict / open / naive comparison systems and the metrics |

Tuning knobs are in `engine/config.py` (`alpha` is the step-up budget; `h2` is set by calibration). To retrain after changing anything: `python -m sim.evaluate --riders 2000 --seed 7 --out docs/sample` and copy the printed `model.json` to `engine/models/default.json`.

## Honest limits

* All data is synthetic. Habit signals such as tap cadence and accept latency are simulated; a real deployment would take them from the app, and the cohort priors would be fitted on real history.
* The comparison with the naive detector depends on how different two people are in the simulator (`BETWEEN_RATIO` in `sim/archetypes.py`, kept modest on purpose). Change it and the numbers move; the ordering of the systems should not.
* Honest riders whose *habits* change (illness, new working hours) are asked for one selfie check about half the time. That is by design: it looks the same as a handoff until the owner verifies.
