import { Link } from 'react-router-dom'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { lab, ops } from '@/api/endpoints'
import { useOps } from '@/components/app/OpsContext'
import { Panel } from '@/components/app/Panel'
import { DecisionTable } from '@/components/app/DecisionTable'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { pct } from '@/lib/plain'
import type { Decision, LabState, RiderListItem, Scenario } from '@/types/api'

const STEP_OPTIONS = [3, 6, 10]

export const DemoLabPage: React.FC = () => {
  const { summary, refresh } = useOps()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [riders, setRiders] = useState<RiderListItem[]>([])
  const [state, setState] = useState<LabState | null>(null)
  const [riderId, setRiderId] = useState('')
  const [scenario, setScenario] = useState('')
  const [steps, setSteps] = useState(6)
  const [autoAnswer, setAutoAnswer] = useState(true)
  const [results, setResults] = useState<Decision[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [rate, setRate] = useState(2)
  const [leaveForReview, setLeaveForReview] = useState(true)
  const [confirmReset, setConfirmReset] = useState(false)

  const load = useCallback(async () => {
    try {
      const [sc, ri, st] = await Promise.all([lab.scenarios(), ops.riders({ limit: 500 }), lab.state()])
      setScenarios(sc); setRiders(ri); setState(st); setRate(st.rate)
      setRiderId((prev) => prev || ri[0]?.rider_id || '')
      setScenario((prev) => prev || sc[0]?.name || '')
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const selected = useMemo(() => scenarios.find((s) => s.name === scenario), [scenarios, scenario])

  async function run<T>(key: string, action: () => Promise<T>, onOk: (value: T) => string) {
    setBusy(key); setError(''); setMessage('')
    try {
      const value = await action()
      setMessage(onOk(value))
      setState(await lab.state())
      refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy('')
    }
  }

  if (!state && !error) return <Spinner label="Loading the demo lab" />
  const sim = summary?.simulation
  const blocked = riderId && state?.blocked.includes(riderId)

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-app-sm text-muted-foreground">
        A sandbox of simulated riders. Pick a rider and something that could happen to them, then watch how the system responds.
        Nothing here touches real accounts.
      </p>
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Try a scenario" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="text-app-sm">
              <label htmlFor="lab-rider" className="mb-1.5 block font-medium text-foreground">Rider</label>
              <select id="lab-rider" value={riderId} onChange={(e) => setRiderId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-app-sm focus:outline-none focus:ring-2 focus:ring-ring/40">
                {riders.map((r) => <option key={r.rider_id} value={r.rider_id}>{r.name ?? `Rider ${r.rider_id}`}{state?.blocked.includes(r.rider_id) ? ' (blocked)' : ''}</option>)}
              </select>
            </div>
            <div className="text-app-sm">
              <label htmlFor="lab-scenario" className="mb-1.5 block font-medium text-foreground">What happens</label>
              <select id="lab-scenario" value={scenario} onChange={(e) => setScenario(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-app-sm focus:outline-none focus:ring-2 focus:ring-ring/40">
                <optgroup label="Everyday changes (should be fine)">
                  {scenarios.filter((s) => s.kind === 'life_event').map((s) => <option key={s.name} value={s.name}>{s.title}</option>)}
                </optgroup>
                <optgroup label="Someone else takes over (should be caught)">
                  {scenarios.filter((s) => s.kind === 'attack').map((s) => <option key={s.name} value={s.name}>{s.title}</option>)}
                </optgroup>
              </select>
            </div>
          </div>
          {selected && <p className="mt-2 text-app-13 text-muted-foreground">{selected.description}</p>}
          {blocked && <p className="mt-2 text-app-13 text-amber-700 dark:text-amber-400">This rider is blocked. Starting a new scenario unblocks them.</p>}

          <label className="mt-3 flex items-start gap-2 text-app-sm">
            <input type="checkbox" checked={autoAnswer} onChange={(e) => setAutoAnswer(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0F3B2C]" />
            <span>
              <span className="font-medium text-foreground">Answer extra checks automatically</span>
              <span className="block text-app-13 text-muted-foreground">Turn this off to deal with them yourself on the Needs review page, or as the rider.</span>
            </span>
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-app-sm text-muted-foreground">
              Show the next
              <select value={steps} onChange={(e) => setSteps(Number(e.target.value))} aria-label="Number of sessions"
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-app-sm">
                {STEP_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              sessions
            </label>
            <Button loading={busy === 'trigger'} disabled={!riderId || !scenario}
              onClick={() => void run('trigger', () => lab.trigger(riderId, scenario, steps, autoAnswer), (r) => { setResults(r.decisions); return `${r.triggered.title}: ${r.decisions.length} sessions scored.` })}>
              Run scenario
            </Button>
            <Button variant="secondary" loading={busy === 'step'} disabled={!riderId}
              onClick={() => void run('step', () => lab.step(riderId, 1, autoAnswer), (r) => { setResults((prev) => [...r, ...prev].slice(0, 30)); return 'One more session scored.' })}>
              Next session
            </Button>
          </div>
        </Panel>

        <Panel title="Background activity">
          <p className="text-app-sm text-muted-foreground">Keep simulated riders working so the dashboard fills up on its own.</p>
          <label className="mt-3 flex items-center gap-2 text-app-sm text-muted-foreground">
            Sessions per second
            <input type="number" min={0.5} max={50} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))}
              aria-label="Sessions per second" className="w-20 rounded-lg border border-border bg-card px-2 py-1.5 text-app-sm" />
          </label>
          <label className="mt-3 flex items-start gap-2 text-app-sm">
            <input type="checkbox" checked={leaveForReview} onChange={(e) => setLeaveForReview(e.target.checked)} disabled={state?.running}
              className="mt-0.5 h-4 w-4 accent-[#0F3B2C]" />
            <span>
              <span className="font-medium text-foreground">Leave unusual cases for me to review</span>
              <span className="block text-app-13 text-muted-foreground">About one takeover every half minute is staged for a rider (never more than 4 waiting). Each waits in Needs review until you clear or suspend the account. After you decide, nothing new is staged for 30 seconds.</span>
            </span>
          </label>
          <div className="mt-3 flex items-center gap-2">
            {state?.running ? (
              <Button variant="secondary" loading={busy === 'stop'} onClick={() => void run('stop', () => lab.run('stop'), () => 'Background activity stopped.')}>Stop</Button>
            ) : (
              <Button loading={busy === 'start'} onClick={() => void run('start', () => lab.run('start', rate, leaveForReview), () => leaveForReview ? 'Background activity started. Cases will wait in Needs review.' : 'Background activity started.')}>Start</Button>
            )}
            <span className="text-app-13 text-muted-foreground">{state?.running ? (state.waiting_for_review ? 'Paused, waiting for you' : 'Running') : 'Stopped'} · {state?.generated ?? 0} sessions so far</span>
          </div>
          {state?.running && state.waiting_for_review && (
            <p className="mt-2 text-app-13 text-amber-700 dark:text-amber-400">
              Four cases are waiting. New sessions are on hold until you <Link to="/review-queue" className="font-medium underline">review them</Link>.
            </p>
          )}
          <div className="mt-4 border-t border-border pt-3">
            {confirmReset ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-app-sm text-muted-foreground">Clear all demo data?</span>
                <Button variant="danger" size="sm" loading={busy === 'reset'}
                  onClick={() => void run('reset', async () => { await lab.reset(); setResults([]); setConfirmReset(false) }, () => 'The demo was reset.')}>Yes, reset</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setConfirmReset(true)}>Reset the demo</Button>
            )}
          </div>
        </Panel>
      </div>

      {sim && (
        <Panel title="How the system is doing in this demo">
          <dl className="grid grid-cols-2 gap-4 text-app-sm lg:grid-cols-4">
            <div><dt className="text-muted-foreground">Genuine riders asked for a check</dt><dd className="text-app-lg font-semibold">{pct(sim.false_stepup_rate, 2)}</dd></div>
            <div><dt className="text-muted-foreground">Genuine riders put on hold</dt><dd className="text-app-lg font-semibold">{pct(sim.false_lockout_rate, 2)}</dd></div>
            <div><dt className="text-muted-foreground">Account sharing caught</dt><dd className="text-app-lg font-semibold">{sim.impostor_accounts_flagged} of {sim.impostor_accounts}</dd></div>
            <div><dt className="text-muted-foreground">Sessions until it was noticed</dt><dd className="text-app-lg font-semibold">{sim.median_sessions_to_detect ?? '—'}</dd></div>
          </dl>
        </Panel>
      )}

      <Panel title="What just happened" flush>
        <DecisionTable decisions={results} emptyText="Run a scenario to see how each session was judged." />
      </Panel>
    </div>
  )
}
