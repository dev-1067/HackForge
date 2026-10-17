import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ops } from '@/api/endpoints'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/StatusPill'
import { Panel } from '@/components/app/Panel'
import { STATUS_LABEL, STATUS_TONE, whenText } from '@/lib/plain'
import type { RiderListItem } from '@/types/api'

const PAGE = 40
const STATUS_OPTIONS = [['', 'All riders'], ['active', 'Normal'], ['watch', 'Watching'], ['pending_stepup', 'Extra check pending'], ['held', 'On hold'], ['suspended', 'Suspended']]

export const RidersPage: React.FC = () => {
  const [riders, setRiders] = useState<RiderListItem[] | null>(null)
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 250)
    return () => window.clearTimeout(id)
  }, [query])

  const load = useCallback(async () => {
    try {
      const rows = await ops.riders({ status, q: debounced, limit: PAGE })
      setRiders(rows)
      setMore(rows.length === PAGE)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [status, debounced])

  useEffect(() => { setRiders(null); void load() }, [load])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const rows = await ops.riders({ status, q: debounced, limit: PAGE, offset: riders?.length ?? 0 })
      setRiders((prev) => [...(prev ?? []), ...rows])
      setMore(rows.length === PAGE)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by rider ID"
          aria-label="Search riders"
          className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40 sm:max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <Panel flush>
        {riders === null && !error ? (
          <div className="p-6"><Spinner label="Loading riders" /></div>
        ) : riders && riders.length === 0 ? (
          <EmptyState title="No riders match.">Try a different search or status.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[13px] text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Rider</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Sessions</th>
                  <th className="px-4 py-2 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {riders?.map((r) => (
                  <tr key={r.rider_id} className="hover:bg-secondary/40">
                    <td className="px-4 py-2">
                      <Link to={`/riders/${encodeURIComponent(r.rider_id)}`} className="font-medium text-foreground hover:underline focus:outline-none focus-visible:underline">
                        {r.name ?? `Rider ${r.rider_id}`}
                      </Link>
                      {r.name && <span className="ml-2 text-[13px] text-muted-foreground">{r.rider_id}</span>}
                    </td>
                    <td className="px-4 py-2"><StatusPill tone={STATUS_TONE[r.status] ?? 'ok'}>{STATUS_LABEL[r.status] ?? r.status}</StatusPill></td>
                    <td className="px-4 py-2 text-muted-foreground">{r.sessions_seen}</td>
                    <td className="px-4 py-2 text-muted-foreground">{whenText(r.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {more && <div className="text-center"><Button variant="secondary" loading={loadingMore} onClick={() => void loadMore()}>Show more</Button></div>}
    </div>
  )
}
