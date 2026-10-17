import React, { useCallback, useEffect, useState } from 'react'
import { ops } from '@/api/endpoints'
import { SearchInput, useDebounced } from '@/components/app/FilterBar'
import { Panel } from '@/components/app/Panel'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import type { DbOverview, DbRows, DbTableInfo } from '@/types/api'

const PAGE = 25

const show = (value: unknown): string => (value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value))

/** A read-only look at the real database: which one is connected, every table, its columns and its rows. */
export const DatabasePage: React.FC = () => {
  const [overview, setOverview] = useState<DbOverview | null>(null)
  const [selected, setSelected] = useState('riders')
  const [data, setData] = useState<DbRows | null>(null)
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const q = useDebounced(query.trim())

  const loadOverview = useCallback(async () => {
    try { setOverview(await ops.dbOverview()); setError('') } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { void loadOverview() }, [loadOverview])

  useEffect(() => { setOffset(0) }, [selected, q])
  useEffect(() => {
    let live = true
    setData(null)
    ops.dbTable(selected, { limit: PAGE, offset, q }).then((d) => { if (live) setData(d) }).catch((e) => { if (live) setError((e as Error).message) })
    return () => { live = false }
  }, [selected, offset, q])

  const info: DbTableInfo | undefined = overview?.tables.find((t) => t.name === selected)
  const conn = overview?.connection

  if (!overview && !error) return <Spinner label="Reading the database" />
  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error} <button className="underline" onClick={() => void loadOverview()}>Try again</button></Alert>}
      {conn && (
        <Panel title="Connected database" note="Read-only. Password hashes, session tokens and CSRF tokens are never shown, and phone numbers and e-mails are masked.">
          <dl className="grid gap-x-8 gap-y-2 text-app-sm sm:grid-cols-3">
            <div><dt className="text-app-13 text-muted-foreground">Type</dt><dd className="font-medium text-foreground">{conn.engine === 'sqlite' ? 'SQLite' : conn.engine === 'postgresql' ? 'PostgreSQL' : conn.engine}</dd></div>
            <div><dt className="text-app-13 text-muted-foreground">{conn.engine === 'sqlite' ? 'File' : 'Database'}</dt><dd className="break-all font-medium text-foreground">{conn.name}{conn.host ? ` on ${conn.host}${conn.port ? `:${conn.port}` : ''}` : ''}</dd></div>
            <div><dt className="text-app-13 text-muted-foreground">Tables / size</dt><dd className="font-medium text-foreground">{overview?.tables.length} tables{conn.size_kb !== undefined ? ` · ${conn.size_kb.toLocaleString()} KB` : ''}</dd></div>
          </dl>
          <p className="mt-3 text-app-13 text-muted-foreground">{conn.how_to_open}</p>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <Panel title="Tables" flush>
          <ul className="divide-y divide-border" aria-label="Tables">
            {overview?.tables.map((t) => (
              <li key={t.name}>
                <button type="button" onClick={() => setSelected(t.name)} aria-current={selected === t.name ? 'true' : undefined}
                  className={cn('flex w-full items-baseline justify-between gap-2 px-4 py-2 text-left text-app-sm focus:outline-none focus-visible:bg-secondary',
                    selected === t.name ? 'bg-secondary font-semibold text-foreground' : 'text-muted-foreground hover:bg-secondary/50')}>
                  <span className="truncate">{t.name}</span>
                  <span className="text-app-13">{t.rows.toLocaleString()}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="min-w-0 space-y-4">
          {info && (
            <Panel title={info.name} note={info.note}>
              <div className="flex flex-wrap gap-1.5">
                {info.columns.map((c) => (
                  <span key={c.name} className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-app-13" title={c.foreign_key ? `Links to ${c.foreign_key}` : undefined}>
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="text-muted-foreground">{c.type.toLowerCase()}</span>
                    {c.primary_key && <span className="font-semibold text-foreground">key</span>}
                    {c.foreign_key && <span className="text-muted-foreground">→ {c.foreign_key.split('.')[0]}</span>}
                    {(c.hidden || c.masked) && <span className="text-amber-700 dark:text-amber-400">{c.hidden ? 'hidden' : 'masked'}</span>}
                  </span>
                ))}
              </div>
              {info.demo && <p className="mt-2 text-app-13 text-muted-foreground">Demo data: rebuilt when the demo is reset. Accounts and requests are kept.</p>}
            </Panel>
          )}

          <Panel
            title={data ? `${data.total.toLocaleString()} row${data.total === 1 ? '' : 's'}` : 'Rows'}
            flush
            action={<SearchInput value={query} onChange={setQuery} label="Search this table" placeholder="Search this table" className="w-56" />}
          >
            {data === null && !error ? <div className="p-6"><Spinner label="Loading rows" /></div>
              : data && data.rows.length === 0 ? <EmptyState title="No rows.">{q ? 'Nothing in this table matches your search.' : 'This table is empty.'}</EmptyState> : data && (
              <div className="max-h-[28rem] overflow-auto">
                <table className="w-full text-left text-app-13">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-muted-foreground">
                      {data.columns.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">{c}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.rows.map((row, i) => (
                      <tr key={i} className="align-top hover:bg-secondary/40">
                        {data.columns.map((c) => (
                          <td key={c} className={cn('max-w-xs truncate px-3 py-1.5', row[c] === 'hidden' ? 'italic text-amber-700 dark:text-amber-400' : 'text-foreground')} title={show(row[c])}>{show(row[c])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data && data.total > PAGE && (
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-app-13 text-muted-foreground">
                <span>{offset + 1} to {Math.min(offset + PAGE, data.total)} of {data.total.toLocaleString()}</span>
                <span className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</Button>
                  <Button variant="secondary" size="sm" disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}>Next</Button>
                </span>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
