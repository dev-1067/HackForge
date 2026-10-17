import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { rider } from '@/api/endpoints'
import { DemoTag } from '@/components/app/DemoTag'
import { Panel } from '@/components/app/Panel'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/StatusPill'
import { whenText, type Tone } from '@/lib/plain'
import { cn } from '@/lib/utils'
import type { ActivityEvent } from '@/types/api'
import { useRider } from './RiderContext'
import { StatusStory } from './StatusStory'
import { VerificationPrompt } from './VerificationPrompt'

const DOT: Record<ActivityEvent['tone'], string> = { normal: 'bg-emerald-500', noted: 'bg-slate-400', check: 'bg-amber-500' }
const STATE_TONE: Record<string, Tone> = { ok: 'ok', verification_needed: 'attention', on_hold: 'serious', suspended: 'serious' }
const STATE_WORD: Record<string, string> = { ok: 'All good', verification_needed: 'Action needed', on_hold: 'On hold', suspended: 'Paused' }

export const RecentActivityPage: React.FC = () => {
  const { overview, version } = useRider()
  const [events, setEvents] = useState<ActivityEvent[] | null>(null)
  const [error, setError] = useState('')
  const [showDemo, setShowDemo] = useState(true)

  const load = useCallback(async () => {
    try { setEvents(await rider.activity(60)); setError('') } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { void load() }, [load, version])

  const visible = useMemo(() => (events ?? []).filter((e) => showDemo || e.origin === 'recorded'), [events, showDemo])
  const hasDemo = (events ?? []).some((e) => e.origin === 'demo')

  if (!overview && !error) return <Spinner label="Loading your account" />

  return (
    <div className="space-y-4">
      {overview && (
        <Panel>
          <StatusPill tone={STATE_TONE[overview.account.state]}>{STATE_WORD[overview.account.state]}</StatusPill>
          <h2 className="mt-1.5 text-app-lg font-semibold text-foreground">{overview.account.headline}</h2>
          <p className="mt-0.5 text-app-sm text-muted-foreground">{overview.account.detail}</p>
          {overview.account.action_required && <div className="mt-4"><VerificationPrompt /></div>}
          {overview.notices.map((notice) => (
            <p key={notice} className="mt-3 text-app-sm text-muted-foreground">
              {notice} <Link to="/rider/account" className="font-medium text-foreground underline underline-offset-2">Review your phones</Link>
            </p>
          ))}
        </Panel>
      )}

      {overview?.explanation && <StatusStory story={overview.explanation} />}

      {error && <Alert tone="error">{error}</Alert>}

      <Panel
        title="Recent activity"
        flush
        action={hasDemo ? (
          <label className="flex items-center gap-2 text-app-13 text-muted-foreground">
            <input type="checkbox" checked={showDemo} onChange={(e) => setShowDemo(e.target.checked)} className="h-4 w-4 accent-[#0F3B2C]" />
            Show demo data
          </label>
        ) : undefined}
      >
        {events === null ? (
          <div className="p-5"><Spinner label="Loading activity" /></div>
        ) : visible.length === 0 ? (
          <EmptyState title="Nothing yet.">Sign-ins, new phones and checks on your account will show up here.</EmptyState>
        ) : (
          <ol className="divide-y divide-border">
            {visible.map((event) => (
              <li key={event.id} className="flex gap-3 px-4 py-3">
                <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', DOT[event.tone])} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-app-sm font-medium text-foreground">{event.title}{event.origin === 'demo' && <DemoTag />}</p>
                    <time dateTime={event.at ?? undefined} className="text-app-13 text-muted-foreground">{whenText(event.at)}</time>
                  </div>
                  {event.detail && <p className="text-app-13 text-muted-foreground">{event.detail}</p>}
                  {event.action === 'verify' && (
                    <Link to="/rider/account" className="mt-1 inline-block text-app-13 font-medium text-foreground underline underline-offset-2">Answer now</Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
      <p className="text-app-13 text-muted-foreground">
        We look at how your account is used, such as how you accept orders and ride. Getting a new phone or moving to a new city does not cause a problem on its own.
      </p>
    </div>
  )
}
