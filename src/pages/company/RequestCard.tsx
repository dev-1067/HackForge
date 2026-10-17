import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ops } from '@/api/endpoints'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { StatusPill } from '@/components/ui/StatusPill'
import { STATUS_LABEL, whenText } from '@/lib/plain'
import type { TeamRequest } from '@/types/api'

/** A help or review request from a rider, with the three things a reviewer can do about it. */
export const RequestCard: React.FC<{ request: TeamRequest; onChanged: (message: string) => void }> = ({ request, onChanged }) => {
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [replyError, setReplyError] = useState('')
  const name = request.rider_name ?? `Rider ${request.rider_id}`

  async function act(action: 'start_review' | 'resolve' | 'decline') {
    setError(''); setReplyError('')
    if (action !== 'start_review' && reply.trim().length < 3) {
      setReplyError('Write a short reply. The rider will see it.')
      return
    }
    setBusy(action)
    try {
      await ops.respond(request.id, action, reply.trim())
      onChanged(action === 'start_review' ? `You are reviewing ${name}'s request.` : action === 'resolve' ? `${name}'s request was resolved.` : `${name}'s request was closed.`)
    } catch (e) {
      setError((e as Error).message)
    } finally { setBusy('') }
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <Link to={`/riders/${encodeURIComponent(request.rider_id)}`} className="text-app-15 font-semibold text-foreground hover:underline">{name}</Link>
          <span className="text-app-13 text-muted-foreground">{request.rider_id}</span>
          <StatusPill tone={request.status === 'open' ? 'attention' : 'watch'}>{request.status === 'open' ? 'New' : 'Being reviewed'}</StatusPill>
        </div>
        <span className="text-app-13 text-muted-foreground">{whenText(request.created_at)}</span>
      </div>
      <p className="mt-1 text-app-sm font-medium text-foreground">{request.kind_label}{request.device_label ? ` · ${request.device_label}` : ''}</p>
      <p className="mt-1 whitespace-pre-line text-app-sm text-foreground">{request.message}</p>
      <p className="mt-1 text-app-13 text-muted-foreground">
        Account status: {STATUS_LABEL[request.rider_status] ?? request.rider_status}.
        {request.kind === 'device_change' && ' Reporting a phone does not change any check on the account.'}
      </p>

      {error && <Alert tone="error" className="mt-3">{error}</Alert>}
      <div className="mt-3 space-y-2 border-t border-border pt-3">
        <label htmlFor={`reply-${request.id}`} className="block text-app-sm font-medium text-foreground">Reply to the rider</label>
        <textarea id={`reply-${request.id}`} value={reply} onChange={(e) => { setReply(e.target.value); setReplyError('') }} rows={2} maxLength={900}
          aria-invalid={replyError ? true : undefined} placeholder="Needed to resolve or close the request."
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-app-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40" />
        {replyError && <p role="alert" className="text-app-13 text-rose-700 dark:text-rose-400">{replyError}</p>}
        <div className="flex flex-wrap gap-2">
          {request.status === 'open' && (
            <Button variant="secondary" size="sm" loading={busy === 'start_review'} disabled={busy !== ''} onClick={() => void act('start_review')}>Start review</Button>
          )}
          <Button size="sm" loading={busy === 'resolve'} disabled={busy !== ''} onClick={() => void act('resolve')}>Resolve</Button>
          <Button variant="secondary" size="sm" loading={busy === 'decline'} disabled={busy !== ''} onClick={() => void act('decline')}>Close without changes</Button>
        </div>
      </div>
    </li>
  )
}
