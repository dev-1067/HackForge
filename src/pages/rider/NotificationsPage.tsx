import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { rider } from '@/api/endpoints'
import { DemoTag } from '@/components/app/DemoTag'
import { Panel } from '@/components/app/Panel'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { whenText } from '@/lib/plain'
import { cn } from '@/lib/utils'
import type { NotificationItem } from '@/types/api'
import { useRider } from './RiderContext'

const DOT: Record<NotificationItem['tone'], string> = { normal: 'bg-emerald-500', noted: 'bg-sky-500', check: 'bg-amber-500' }

export const NotificationsPage: React.FC = () => {
  const { refresh, version } = useRider()
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { const r = await rider.notifications(); setItems(r.items); setUnread(r.unread); setError('') } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { void load() }, [load, version])

  async function markAll() {
    setBusy(true)
    try { const r = await rider.markNotificationsRead(); setItems(r.items); setUnread(r.unread); await refresh() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  if (items === null && !error) return <Spinner label="Loading notifications" />
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-app-sm text-muted-foreground">Things worth knowing: replies from our team, checks we asked for, new phones and browsers, and your account status.</p>
      {error && <Alert tone="error">{error} <button className="underline" onClick={() => void load()}>Try again</button></Alert>}
      <Panel
        title={unread ? `${unread} unread` : 'All caught up'}
        flush
        action={<Button variant="secondary" size="sm" loading={busy} disabled={unread === 0} onClick={() => void markAll()}>Mark all as read</Button>}
      >
        {items && items.length === 0 ? (
          <EmptyState title="Nothing new.">Replies to your requests and anything we need from you will show up here.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {items?.map((n) => (
              <li key={n.id}>
                <Link to={n.link} className={cn('flex items-start gap-3 px-4 py-3 hover:bg-secondary/40 focus:outline-none focus-visible:bg-secondary/40', n.unread && 'bg-secondary/30')}>
                  <span className={cn('mt-2 h-2.5 w-2.5 shrink-0 rounded-full', DOT[n.tone])} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className={cn('text-app-sm text-foreground', n.unread ? 'font-semibold' : 'font-medium')}>
                        {n.title}{n.origin === 'demo' && <DemoTag />}{n.unread && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-app-xs font-medium text-primary-foreground">New</span>}
                      </span>
                      <span className="text-app-13 text-muted-foreground">{n.sticky ? 'Right now' : whenText(n.at)}</span>
                    </span>
                    {n.detail && <span className="mt-0.5 block text-app-sm text-muted-foreground">{n.detail}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
