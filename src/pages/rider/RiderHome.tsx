import React, { useCallback, useEffect, useState } from 'react'
import { rider } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthContext'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { TrustJugglerLogo } from '@/components/ui/TrustJugglerLogo'
import { StatusPill } from '@/components/ui/StatusPill'
import { whenText, type Tone } from '@/lib/plain'
import type { RiderOverview } from '@/types/api'

const STATE_TONE: Record<RiderOverview['account']['state'], Tone> = {
  ok: 'ok', verification_needed: 'attention', on_hold: 'serious', suspended: 'serious',
}
const ACTIVITY_TONE: Record<string, Tone> = { normal: 'ok', noted: 'watch', check: 'attention' }

export const RiderHome: React.FC = () => {
  const { user, signOut } = useAuth()
  const [data, setData] = useState<RiderOverview | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'yes' | 'no' | ''>('')
  const [signingOut, setSigningOut] = useState(false)

  const load = useCallback(async () => {
    try { setData(await rider.overview()); setError('') } catch (e) { setError((e as Error).message) }
  }, [])

  useEffect(() => {
    void load()
    const refresh = () => { if (document.visibilityState === 'visible') void load() }
    const timer = window.setInterval(refresh, 30000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [load])

  async function answer(confirmed: boolean) {
    setBusy(confirmed ? 'yes' : 'no')
    try { setData(await rider.verify(confirmed)); setError('') } catch (e) { setError((e as Error).message); void load() } finally { setBusy('') }
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <TrustJugglerLogo size={26} />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.name}</span>
            <Button variant="secondary" size="sm" loading={signingOut} onClick={() => { setSigningOut(true); void signOut().finally(() => setSigningOut(false)) }}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 px-4 py-5">
        <h1 className="text-xl font-semibold">Hello, {user?.name.split(' ')[0]}</h1>
        {error && <Alert tone="error">{error}</Alert>}
        {!data && !error && <Spinner label="Loading your account" />}

        {data && (
          <>
            <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="account-heading">
              <StatusPill tone={STATE_TONE[data.account.state]}>{data.account.state === 'ok' ? 'All good' : data.account.state === 'verification_needed' ? 'Action needed' : data.account.state === 'on_hold' ? 'On hold' : 'Paused'}</StatusPill>
              <h2 id="account-heading" className="mt-2 text-lg font-semibold">{data.account.headline}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{data.account.detail}</p>
              {data.account.action_required && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Was this you?</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button className="flex-1" loading={busy === 'yes'} disabled={busy !== ''} onClick={() => void answer(true)}>Yes, it was me</Button>
                    <Button className="flex-1" variant="secondary" loading={busy === 'no'} disabled={busy !== ''} onClick={() => void answer(false)}>No, that was not me</Button>
                  </div>
                  <p className="text-[13px] text-muted-foreground">If it was not you, we will pause your payouts and a person will look into it.</p>
                </div>
              )}
            </section>

            {data.notices.map((notice) => <Alert key={notice} tone="info">{notice}</Alert>)}

            <section className="rounded-xl border border-border bg-card" aria-labelledby="activity-heading">
              <h2 id="activity-heading" className="border-b border-border px-4 py-3 text-[15px] font-semibold">Your recent activity</h2>
              {data.recent_activity.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing yet. Your activity will show up here after your first deliveries.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.recent_activity.map((a, i) => (
                    <li key={`${a.when}-${i}`} className="px-4 py-2.5">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-medium">{whenText(a.when)}</span>
                        <span className="text-muted-foreground">{a.city ?? ''}</span>
                      </div>
                      <div className="mt-0.5 flex justify-between gap-3 text-[13px] text-muted-foreground">
                        <StatusPill tone={ACTIVITY_TONE[a.tone] ?? 'ok'} className="font-normal text-muted-foreground">{a.note}</StatusPill>
                        <span>{a.phone}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-[13px] text-muted-foreground">
              We look at how your account is used, such as how you accept orders and ride. Getting a new phone or moving to a new city does not cause a problem on its own.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
