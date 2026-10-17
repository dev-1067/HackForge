import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ops } from '@/api/endpoints'
import { useOps } from '@/components/app/OpsContext'
import { ActiveFilters, DateField, SearchInput, SelectFilter, useDebounced, type ActiveFilter } from '@/components/app/FilterBar'
import { Panel } from '@/components/app/Panel'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { actionLabel, actorLabel, auditSentence, fullTime, whenText } from '@/lib/plain'
import { dayEnd, dayStart } from '@/lib/ranges'
import type { AuditEntry, FilterOptions } from '@/types/api'

const PAGE = 50

export const HistoryPage: React.FC = () => {
  const { changeTick } = useOps()
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [options, setOptions] = useState<FilterOptions | null>(null)
  const [query, setQuery] = useState('')
  const [action, setAction] = useState('')
  const [reviewer, setReviewer] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const q = useDebounced(query.trim())

  const rangeError = from && to && from > to ? 'The start date is after the end date.' : ''
  const params = useMemo(() => ({ q, action, reviewer, since: dayStart(from), until: dayEnd(to) }), [q, action, reviewer, from, to])

  useEffect(() => { ops.filters().then(setOptions).catch(() => setOptions(null)) }, [changeTick])

  const load = useCallback(async () => {
    if (rangeError) { setEntries([]); setMore(false); return }
    try {
      const rows = await ops.audit({ ...params, limit: PAGE })
      setEntries(rows); setMore(rows.length === PAGE); setError('')
    } catch (e) { setError((e as Error).message) }
  }, [params, rangeError])
  useEffect(() => { void load() }, [load, changeTick])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const rows = await ops.audit({ ...params, limit: PAGE, offset: entries?.length ?? 0 })
      setEntries((prev) => [...(prev ?? []), ...rows]); setMore(rows.length === PAGE)
    } catch (e) { setError((e as Error).message) } finally { setLoadingMore(false) }
  }

  const active: ActiveFilter[] = [
    query.trim() && { key: 'q', label: `Search: ${query.trim()}`, clear: () => setQuery('') },
    action && { key: 'a', label: actionLabel(action), clear: () => setAction('') },
    reviewer && { key: 'r', label: `By ${reviewer}`, clear: () => setReviewer('') },
    from && { key: 'f', label: `From ${from}`, clear: () => setFrom('') },
    to && { key: 't', label: `Until ${to}`, clear: () => setTo('') },
  ].filter(Boolean) as ActiveFilter[]
  const clearAll = () => { setQuery(''); setAction(''); setReviewer(''); setFrom(''); setTo('') }

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-app-sm text-muted-foreground">Every extra check and every decision made by the team, newest first. Nothing here can be changed or removed.</p>

      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <SearchInput value={query} onChange={setQuery} label="Search history" placeholder="Search rider, ID or action" className="lg:w-80" />
        <SelectFilter label="What happened" value={action} onChange={setAction}
          options={[{ value: '', label: 'Anything that happened' }, ...(options?.audit_actions ?? []).map((a) => ({ value: a, label: actionLabel(a) }))]} />
        <SelectFilter label="Reviewer" value={reviewer} onChange={setReviewer}
          options={[{ value: '', label: 'Any reviewer' }, ...(options?.reviewers ?? []).map((r) => ({ value: r, label: r }))]} />
        <DateField label="From" value={from} onChange={setFrom} max={to || undefined} />
        <DateField label="Until" value={to} onChange={setTo} min={from || undefined} />
      </div>
      <ActiveFilters filters={active} onClearAll={clearAll} />

      {rangeError && <Alert tone="warning">{rangeError}</Alert>}
      {error && <Alert tone="error">{error} <button className="underline" onClick={() => void load()}>Try again</button></Alert>}
      {entries === null && !error ? <Spinner label="Loading history" /> : (
        <Panel flush>
          {entries && entries.length === 0 ? (
            active.length > 0
              ? <EmptyState title="Nothing matches these filters.">Try a wider date range or fewer filters. <button onClick={clearAll} className="font-medium underline">Clear all filters</button></EmptyState>
              : <EmptyState title="Nothing has happened yet.">Checks and decisions are listed here once they take place.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-app-sm">
                <thead>
                  <tr className="border-b border-border text-app-13 text-muted-foreground">
                    <th className="px-4 py-2 font-medium">When</th><th className="px-4 py-2 font-medium">Rider</th>
                    <th className="px-4 py-2 font-medium">What happened</th><th className="px-4 py-2 font-medium">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries?.map((a) => (
                    <tr key={a.id}>
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground" title={fullTime(a.at)}>{whenText(a.at)}</td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {a.rider_id ? (
                          <Link to={`/riders/${encodeURIComponent(a.rider_id)}`} className="font-medium text-foreground hover:underline">{a.rider_name ?? a.rider_id}</Link>
                        ) : '—'}
                        {a.rider_id && a.rider_name && <span className="ml-2 text-app-13 text-muted-foreground">{a.rider_id}</span>}
                      </td>
                      <td className="px-4 py-2 text-foreground">{auditSentence(a)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{actorLabel(a.actor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
      {more && <div className="text-center"><Button variant="secondary" loading={loadingMore} onClick={() => void loadMore()}>Show more</Button></div>}
    </div>
  )
}
