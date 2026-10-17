import React from 'react'
import { Link } from 'react-router-dom'
import { Panel } from '@/components/app/Panel'
import { fullTime } from '@/lib/plain'
import type { StatusExplanation } from '@/types/api'

const TITLE: Record<StatusExplanation['state'], string> = {
  verification_needed: 'Why we asked you to confirm',
  on_hold: 'Why your payouts are on hold',
  suspended: 'Why your account is paused',
}

const PREFILL: Record<StatusExplanation['state'], string> = {
  verification_needed: 'I need help with the confirmation. ',
  on_hold: 'Please review my account. Here is what changed: ',
  suspended: 'Please review my account again. Here is what happened: ',
}

/** The reasons behind a hold or a pause, in the rider's own terms, with a working way to ask for help. */
export const StatusStory: React.FC<{ story: StatusExplanation }> = ({ story }) => {
  const helpTo = `/rider/help?kind=${story.help.kind}&msg=${encodeURIComponent(PREFILL[story.state])}`
  return (
    <Panel title={TITLE[story.state]} note={story.since ? `${story.outcome} · ${fullTime(story.since)} · decided by ${story.decided_by}` : story.outcome}>
      <div className="space-y-4 text-app-sm">
        <section>
          <h3 className="font-medium text-foreground">What we noticed</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            {story.noticed.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>

        {story.evidence.length > 0 && (
          <section>
            <h3 className="font-medium text-foreground">Sessions that stood out</h3>
            <div className="mt-1 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[420px] text-left text-app-13">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 py-1.5 font-medium">When</th><th className="px-3 py-1.5 font-medium">Where</th>
                  <th className="px-3 py-1.5 font-medium">Phone</th><th className="px-3 py-1.5 font-medium">What was different</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {story.evidence.map((e) => (
                    <tr key={e.at}>
                      <td className="whitespace-nowrap px-3 py-1.5 text-foreground">{fullTime(e.at)}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{e.city ?? '—'}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{e.phone}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{e.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <h3 className="font-medium text-foreground">What this means</h3>
          <p className="mt-1 text-muted-foreground">{story.what_it_means}</p>
        </section>

        <section>
          <h3 className="font-medium text-foreground">What you can do</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            {story.what_you_can_do.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link to={helpTo} className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-app-sm font-medium text-primary-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              {story.state === 'verification_needed' ? 'Get help with this' : 'Ask for a review'}
            </Link>
            <Link to="/rider/account" className="text-app-13 text-muted-foreground underline underline-offset-2">See your phones</Link>
          </div>
        </section>
        <p className="text-app-13 text-muted-foreground">{story.note}</p>
      </div>
    </Panel>
  )
}
