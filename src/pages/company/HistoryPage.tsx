import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ops } from '@/api/endpoints'
import { useOps } from '@/components/app/OpsContext'
import { Panel } from '@/components/app/Panel'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { actorLabel, auditSentence, whenText } from '@/lib/plain'
import type { AuditEntry } from '@/types/api'

export const HistoryPage: React.FC = () => {
  const { changeTick } = useOps()
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try { setEntries(await ops.audit(200)); setError('') } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { void load() }, [load, changeTick])

  if (entries === null && !error) return <Spinner label="Loading history" />
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-app-sm text-muted-foreground">Every extra check and every decision made by the team, newest first.</p>
      {error && <Alert tone="error">{error}</Alert>}
      <Panel flush>
        {entries && entries.length === 0 ? (
          <EmptyState title="Nothing has happened yet.">Checks and decisions are listed here once they take place.</EmptyState>
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
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{whenText(a.at)}</td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {a.rider_id ? <Link to={`/riders/${encodeURIComponent(a.rider_id)}`} className="font-medium text-foreground hover:underline">{a.rider_id}</Link> : '—'}
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
    </div>
  )
}
