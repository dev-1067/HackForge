import type { Decision, Level, Reason } from '@/types/api'

/** Everyday names for the engine's outcomes. The internal level codes are never shown. */
export const LEVEL_LABEL: Record<Level, string> = {
  L0: 'Normal',
  L1: 'Watching',
  L2: 'Extra check',
  L3: 'On hold',
  L4: 'Suspended',
}

export type Tone = 'ok' | 'watch' | 'attention' | 'serious'

export const LEVEL_TONE: Record<Level, Tone> = { L0: 'ok', L1: 'watch', L2: 'attention', L3: 'serious', L4: 'serious' }

export const STATUS_LABEL: Record<string, string> = {
  active: 'Normal',
  watch: 'Watching',
  pending_stepup: 'Extra check pending',
  held: 'On hold',
  suspended: 'Suspended',
}

export const STATUS_TONE: Record<string, Tone> = {
  active: 'ok', watch: 'watch', pending_stepup: 'attention', held: 'serious', suspended: 'serious',
}

const FEATURE_NAME: Record<string, string> = {
  accept_latency_ms: 'Time to accept orders',
  idle_gap_min: 'Break length',
  cancel_rate: 'Cancellations',
  accept_rate: 'Orders accepted',
  login_hour: 'Working hours',
  avg_speed_kmh: 'Riding speed',
  route_deviation: 'Route choices',
  orders_per_hour: 'Delivery pace',
  tap_interval_ms: 'Tapping rhythm',
  swipe_speed: 'Swipe speed',
}

export const featureName = (feature: string) => FEATURE_NAME[feature] ?? feature

/** Baseline values with units, for the "usual pattern" list. */
export function formatBaseline(feature: string, value: number): string {
  switch (feature) {
    case 'accept_latency_ms': return `${(value / 1000).toFixed(1)} s`
    case 'tap_interval_ms': return `${Math.round(value)} ms`
    case 'idle_gap_min': return `${value.toFixed(0)} min`
    case 'cancel_rate':
    case 'accept_rate': return `${Math.round(value * 100)}%`
    case 'avg_speed_kmh': return `${value.toFixed(0)} km/h`
    case 'orders_per_hour': return `${value.toFixed(1)} per hour`
    case 'route_deviation': return value < 0.1 ? 'Close to suggested' : value < 0.2 ? 'Some detours' : 'Many detours'
    case 'swipe_speed': return value.toFixed(2)
    case 'login_hour': {
      const h = Math.floor(value) % 24
      return `around ${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'am' : 'pm'}`
    }
    default: return String(value)
  }
}

const FLAG_TEXT: Record<string, string> = {
  new_device: 'a new phone',
  new_city: 'a new city',
  new_zone: 'a new area',
  new_network_provider: 'a new network',
  new_network_type: 'a different connection',
  new_os: 'a new phone software version',
  shared_device: 'a phone used by several rider accounts',
}

export function describeFlags(flags: string[]): string {
  const parts = flags.map((f) => FLAG_TEXT[f] ?? f)
  if (parts.length === 0) return ''
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

function reasonSentence(reason: Reason): string | null {
  if (reason.feature && reason.z !== undefined) {
    const strength = Math.abs(reason.z) >= 3 ? 'much' : 'clearly'
    const dir = reason.direction === 'higher' ? 'higher' : 'lower'
    return `${featureName(reason.feature)} is ${strength} ${dir} than usual`
  }
  const note = reason.note ?? ''
  if (note.startsWith('unfamiliar context:')) return null // covered by the summary
  if (note === 'known device and location') return 'Same phone and area as usual'
  if (note.startsWith('habits match')) return 'Works the way this rider usually does, so the change looks like a normal life event'
  if (note === "consistent with this rider's usual pattern") return "Matches this rider's usual pattern"
  if (note.startsWith('learning this rider')) return "Still learning this rider's pattern"
  const streak = note.match(/^(\d+) consecutive/)
  if (streak) {
    if (streak[1] === '0') return null
    return `The change has shown up in the last ${streak[1]} session${streak[1] === '1' ? '' : 's'}`
  }
  if (note.startsWith('payouts held')) return 'Payouts are held until someone reviews the account'
  if (note.startsWith('account suspended')) return 'Account is suspended until someone reviews it'
  if (note.startsWith('evidence ')) return null

  // Retain descriptive narrative notes
  if (note && note.length > 5) return note
  return null
}

/** One sentence for the table, plus a short bullet list for the detail view. */
export function explain(d: Pick<Decision, 'level' | 'context_flags' | 'reasons'>): { summary: string; bullets: string[] } {
  const flags = describeFlags(d.context_flags)
  const bullets = d.reasons.map(reasonSentence).filter((s): s is string => Boolean(s))
  let summary: string
  switch (d.level) {
    case 'L0':
      summary = flags ? `Saw ${flags}, but the riding habits match, so no action is needed.` : "Matches this rider's usual pattern."
      break
    case 'L1':
      summary = 'Small changes in activity. Keeping a quiet eye on it.'
      break
    case 'L2':
      if (d.context_flags.includes('shared_device')) {
        summary = 'Phone hardware is linked to multiple rider accounts. Rapid account switching detected.'
      } else if (d.context_flags.includes('new_network_provider') && d.context_flags.includes('new_city')) {
        summary = 'Saw an unfamiliar datacenter proxy connection and rapid transit across city zones.'
      } else if (d.context_flags.includes('new_network_provider')) {
        summary = 'Saw a new connection provider, and activity has also changed. Asked the rider to confirm.'
      } else if (d.context_flags.includes('new_zone')) {
        summary = 'Operating in an unfamiliar delivery sector with motion and order handling diverging from baseline.'
      } else if (d.context_flags.includes('new_device') && d.context_flags.includes('new_os')) {
        summary = 'First session recorded on a newly seen phone model with prolonged pauses between orders.'
      } else if (flags) {
        summary = `Saw ${flags}, and activity has also changed. Asked the rider to confirm it is them.`
      } else {
        summary = 'Same phone and area, but activity has changed over several sessions. Asked the rider to confirm it is them.'
      }
      break
    default:
      summary = 'Activity has stayed different from this rider’s usual pattern. Someone should take a closer look.'
  }
  return { summary, bullets }
}

/** The server stores UTC times without a zone marker; read them as UTC so every viewer sees the right local time. */
export function parseUtc(iso: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z')
}

export function whenText(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = parseUtc(iso)
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000)
  if (diffMin >= 0 && diffMin < 1) return 'just now'
  if (diffMin >= 0 && diffMin < 60) return `${diffMin} min ago`
  return date.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function fullTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return parseUtc(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`

export function auditSentence(entry: { action: string; actor: string; details: Record<string, unknown> }): string {
  const note = typeof entry.details?.note === 'string' && entry.details.note ? ` Note: ${entry.details.note}` : ''
  switch (entry.action) {
    case 'review_dismissed': return `Cleared the account after review.${note}`
    case 'review_confirmed_takeover': return `Suspended the account after review.${note}`
    case 'stepup_passed': return 'The rider passed the extra check.'
    case 'stepup_failed': return 'The rider did not pass the extra check; payouts were held.'
    case 'request_start_review': return 'Started reviewing a rider request.'
    case 'request_resolve': return `Resolved a rider request.${note}`
    case 'request_decline': return `Closed a rider request without changes.${note}`
    case 'request_device_change': return 'The rider said a phone is theirs.'
    default:
      if (entry.action.startsWith('request_')) return 'The rider sent a request.'
      return entry.action.replace(/_/g, ' ')
  }
}

export function actionLabel(action: string): string {
  switch (action) {
    case 'review_dismissed': return 'Account cleared'
    case 'review_confirmed_takeover': return 'Account suspended'
    case 'stepup_passed': return 'Extra check passed'
    case 'stepup_failed': return 'Extra check not passed'
    case 'request_start_review': return 'Request review started'
    case 'request_resolve': return 'Request resolved'
    case 'request_decline': return 'Request closed'
    case 'request_device_change': return 'Phone reported by rider'
    default: return action.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  }
}

export function actorLabel(actor: string): string {
  if (actor.startsWith('reviewer:')) return actor.slice('reviewer:'.length)
  if (actor.startsWith('rider:')) return 'Rider'
  if (actor === 'lab') return 'Demo lab'
  return 'System'
}
