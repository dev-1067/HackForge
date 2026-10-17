import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ops } from '@/api/endpoints'
import { useOps } from '@/components/app/OpsContext'
import { DecisionTable } from '@/components/app/DecisionTable'
import { ActiveFilters, SearchInput, SelectFilter, useDebounced, type ActiveFilter } from '@/components/app/FilterBar'
import { Panel } from '@/components/app/Panel'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { downloadCsv } from '@/lib/csv'
import { LEVEL_LABEL, describeFlags, explain } from '@/lib/plain'
import { RANGES, rangeSince, type RangeKey } from '@/lib/ranges'
import type { Decision, FilterOptions, Level } from '@/types/api'

const PAGE = 40
const RESULTS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Any result' },
  ...(['L0', 'L1', 'L2', 'L3', 'L4'] as Level[]).map((l) => ({ value: l, label: LEVEL_LABEL[l] })),
]

const Lookup: React.FC = () => {
  const navigate = useNavigate()
  const [kind, setKind] = useState<'session' | 'decision'>('session')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const id = value.trim()
    if (!id) { setError(kind === 'session' ? 'Enter a session ID.' : 'Enter a decision number.'); return }
    if (kind === 'decision' && !/^\d+$/.test(id)) { setError('A decision number is digits only, for example 128.'); return }
    setError('')
    navigate(`/sessions/${kind}/${encodeURIComponent(id)}`)
  }

  return (
    <Panel title="Find a session or decision" note="Session IDs and decision numbers are different. Choose which one you have.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <SelectFilter label="Type of ID" value={kind} onChange={(v) => { setKind(v as 'session' | 'decision'); setError('') }}
          options={[{ value: 'session', label: 'Session ID' }, { value: 'decision', label: 'Decision number' }]} />
        <div className="min-w-0 flex-1">
          <input value={value} onChange={(e) => { setValue(e.target.value); setError('') }} aria-label="ID to find" maxLength={96}
            aria-invalid={error ? true : undefined} placeholder={kind === 'session' ? 'Paste a session ID' : 'For example 128'}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-app-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40" />
          {error && <p role="alert" className="mt-1.5 text-app-13 text-rose-700 dark:text-rose-400">{error}</p>}
        </div>
        <Button type="submit">Find</Button>
      </form>
    </Panel>
  )
}

export const SessionsPage: React.FC = () => {
  const { changeTick } = useOps()
  const [rows, setRows] = useState<Decision[] | null>(null)
  const [options, setOptions] = useState<FilterOptions | null>(null)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('')
  const [range, setRange] = useState<RangeKey>('all')
  const [city, setCity] = useState('')
  const [zone, setZone] = useState('')
  const [device, setDevice] = useState('')
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const q = useDebounced(query.trim())
  const dev = useDebounced(device.trim())

  useEffect(() => { ops.filters().then(setOptions).catch(() => setOptions(null)) }, [])

  const params = useMemo(() => ({ q, level: result, city, zone, device: dev, since: rangeSince(range) }), [q, result, city, zone, dev, range])

  const load = useCallback(async () => {
    try {
      const list = await ops.decisions({ ...params, limit: PAGE })
      setRows(list); setMore(list.length === PAGE); setError('')
    } catch (e) { setError((e as Error).message) }
  }, [params])
  useEffect(() => { setRows(null); void load() }, [load])
  useEffect(() => { if (changeTick > 0) void load() }, [changeTick, load])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const list = await ops.decisions({ ...params, limit: PAGE, offset: rows?.length ?? 0 })
      setRows((prev) => [...(prev ?? []), ...list]); setMore(list.length === PAGE)
    } catch (e) { setError((e as Error).message) } finally { setLoadingMore(false) }
  }

  const [exporting, setExporting] = useState(false)
  async function exportCsv() {
    setExporting(true)
    try {
      const list = await ops.decisions({ ...params, limit: 500 })
      downloadCsv('sessions.csv', ['Started (UTC)', 'Rider ID', 'Rider name', 'City', 'Area', 'Result', 'Changes noticed', 'Summary', 'Session ID', 'Decision number'],
        list.map((d) => [d.started_at, d.rider_id, d.rider_name, d.context?.city, d.context?.zone, LEVEL_LABEL[d.level],
          describeFlags(d.context_flags), explain(d).summary, d.session_id, d.decision_id]))
    } catch (e) { setError((e as Error).message) } finally { setExporting(false) }
  }

  const active: ActiveFilter[] = [
    query.trim() && { key: 'q', label: `Search: ${query.trim()}`, clear: () => setQuery('') },
    result && { key: 'r', label: LEVEL_LABEL[result as Level], clear: () => setResult('') },
    range !== 'all' && { key: 'd', label: RANGES.find((r) => r.value === range)!.label, clear: () => setRange('all') },
    city && { key: 'c', label: city, clear: () => setCity('') },
    zone && { key: 'z', label: `Area: ${zone}`, clear: () => setZone('') },
    device.trim() && { key: 'p', label: `Phone: …${device.trim()}`, clear: () => setDevice('') },
  ].filter(Boolean) as ActiveFilter[]
  const clearAll = () => { setQuery(''); setResult(''); setRange('all'); setCity(''); setZone(''); setDevice('') }

  return (
    <div className="space-y-4">
      <Lookup />
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap">
        <SearchInput value={query} onChange={setQuery} label="Search sessions" placeholder="Search by rider name or ID" className="lg:w-72" />
        <SelectFilter label="Date range" value={range} onChange={(v) => setRange(v as RangeKey)} options={RANGES} />
        <SelectFilter label="Result" value={result} onChange={setResult} options={RESULTS} />
        <SelectFilter label="City" value={city} onChange={setCity} options={[{ value: '', label: 'All cities' }, ...(options?.cities ?? []).map((c) => ({ value: c, label: c }))]} />
        <SelectFilter label="Area" value={zone} onChange={setZone} options={[{ value: '', label: 'All areas' }, ...(options?.zones ?? []).map((z) => ({ value: z, label: z }))]} />
        <input value={device} onChange={(e) => setDevice(e.target.value)} aria-label="Phone ending" placeholder="Phone ending in…" maxLength={20}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-app-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40 lg:w-44" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ActiveFilters filters={active} onClearAll={clearAll} />
        <Button variant="secondary" size="sm" loading={exporting} disabled={!rows?.length} onClick={() => void exportCsv()}>Download CSV</Button>
      </div>
      <p className="text-app-13 text-muted-foreground">Seeing a new phone or place is common and is not proof that an account is shared.</p>
      {error && <Alert tone="error">{error} <button className="underline" onClick={() => void load()}>Try again</button></Alert>}
      {rows === null && !error ? <Spinner label="Loading sessions" /> : (
        <Panel flush>
          <DecisionTable decisions={rows ?? []} emptyText={active.length ? 'No sessions match these filters. Try a wider date range or clear a filter.' : 'No sessions in this period.'} />
        </Panel>
      )}
      {more && <div className="text-center"><Button variant="secondary" loading={loadingMore} onClick={() => void loadMore()}>Show more</Button></div>}
    </div>
  )
}
