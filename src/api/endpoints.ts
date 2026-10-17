import { API_BASE, request } from './http'
import type {
  AccountOverview, ActiveSession, ActivityEvent, HelpRequest, TeamRequest,
  AuditEntry, CompareData, Decision, FilterOptions, LabState, MetricsSummary, RiderDetail, RiderListItem, RiderOverview,
  Scenario, Session, TimelineItem,
} from '@/types/api'

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') query.set(key, String(value))
  return query.toString()
}

export const auth = {
  me: () => request<Session>('/auth/me', { quiet401: true }),
  riderLogin: (phone: string, password: string) =>
    request<Session>('/auth/rider/login', { method: 'POST', body: { phone, password }, quiet401: true }),
  riderRegister: (name: string, phone: string, password: string) =>
    request<Session>('/auth/rider/register', { method: 'POST', body: { name, phone, password }, quiet401: true }),
  companyLogin: (email: string, password: string) =>
    request<Session>('/auth/company/login', { method: 'POST', body: { email, password }, quiet401: true }),
  companyRegister: (name: string, email: string, password: string, invite_code: string) =>
    request<Session>('/auth/company/register', { method: 'POST', body: { name, email, password, invite_code }, quiet401: true }),
  logout: () => request<{ status: string }>('/auth/logout', { method: 'POST', quiet401: true }),
}

export const rider = {
  overview: () => request<RiderOverview>('/me/rider'),
  verify: (confirmed: boolean) => request<RiderOverview>('/me/rider/verification', { method: 'POST', body: { confirmed } }),
  activity: (limit = 60) => request<ActivityEvent[]>(`/me/rider/activity?limit=${limit}`),
  account: () => request<AccountOverview>('/me/rider/account'),
  reportDevice: (device_id: string, note?: string) =>
    request<HelpRequest>('/me/rider/device-change', { method: 'POST', body: { device_id, note: note || undefined } }),
  requests: () => request<HelpRequest[]>('/me/rider/requests'),
  sendRequest: (kind: string, message: string, device_id?: string) =>
    request<HelpRequest>('/me/rider/requests', { method: 'POST', body: { kind, message, device_id: device_id || undefined } }),
  exportData: () => request<Record<string, unknown>>('/me/rider/export'),
}

export const account = {
  sessions: () => request<ActiveSession[]>('/me/sessions'),
  signOutOthers: () => request<{ signed_out: number }>('/me/sessions/sign-out-others', { method: 'POST' }),
  changePassword: (current_password: string, new_password: string) =>
    request<{ signed_out_elsewhere: number }>('/me/password', { method: 'POST', body: { current_password, new_password } }),
}

export const ops = {
  summary: () => request<MetricsSummary>('/metrics/summary'),
  compare: () => request<CompareData>('/metrics/compare'),
  decisions: (params: Record<string, string | number | boolean | undefined> = {}) =>
    request<Decision[]>(`/decisions?${qs(params)}`),
  decision: (id: number) => request<Decision>(`/decisions/${id}`),
  review: (id: number, takeover_confirmed: boolean, note?: string) =>
    request<{ status: string; verdict: string }>(`/decisions/${id}/review`, {
      method: 'POST', body: { takeover_confirmed, note: note || undefined },
    }),
  riders: (params: { status?: string; q?: string; city?: string; limit?: number; offset?: number } = {}) =>
    request<RiderListItem[]>(`/riders?${qs(params)}`),
  rider: (id: string) => request<RiderDetail>(`/riders/${encodeURIComponent(id)}`),
  timeline: (id: string, limit = 120, params: { since?: string; until?: string; city?: string; device?: string } = {}) =>
    request<TimelineItem[]>(`/riders/${encodeURIComponent(id)}/timeline?${qs({ limit, ...params })}`),
  riderAudit: (id: string) => request<AuditEntry[]>(`/riders/${encodeURIComponent(id)}/audit`),
  audit: (params: Record<string, string | number | undefined> = {}) => request<AuditEntry[]>(`/audit?${qs(params)}`),
  sessionLookup: (sessionId: string) => request<Decision>(`/sessions/${encodeURIComponent(sessionId)}`),
  filters: () => request<FilterOptions>('/filters'),
  requests: (params: { status?: string; rider_id?: string } = {}) =>
    request<TeamRequest[]>(`/review-requests?${qs(params)}`),
  respond: (id: number, action: 'start_review' | 'resolve' | 'decline', note?: string) =>
    request<HelpRequest>(`/review-requests/${id}/respond`, { method: 'POST', body: { action, note: note || undefined } }),
}

export const lab = {
  scenarios: () => request<Scenario[]>('/lab/scenarios'),
  state: () => request<LabState>('/lab/state'),
  trigger: (rider_id: string, scenario: string, steps: number, auto_resolve = true) =>
    request<{ triggered: { title: string; scenario: string }; decisions: Decision[] }>('/lab/scenario', {
      method: 'POST', body: { rider_id, scenario, steps, auto_resolve },
    }),
  step: (rider_id: string | undefined, count: number, auto_resolve = true) =>
    request<Decision[]>('/lab/step', { method: 'POST', body: { rider_id, count, auto_resolve } }),
  run: (action: 'start' | 'stop', rate = 2, leaveForReview = false) =>
    request<LabState>('/lab/run', { method: 'POST', body: { action, rate, auto_resolve: !leaveForReview, incidents: leaveForReview } }),
  reset: () => request<LabState>('/lab/reset', { method: 'POST' }),
}

/** Live decisions as they happen. Returns a function that closes the connection. */
export function openStream(handlers: {
  onDecision: (d: Decision) => void
  onEvent?: (event: string) => void
  onStatus: (connected: boolean) => void
}): () => void {
  const source = new EventSource(`${API_BASE}/stream`, { withCredentials: true })
  source.onopen = () => handlers.onStatus(true)
  source.onerror = () => handlers.onStatus(false)
  source.addEventListener('decision', (event) => {
    try {
      handlers.onDecision(JSON.parse((event as MessageEvent).data) as Decision)
    } catch {
      /* ignore a malformed event */
    }
  })
  for (const name of ['stepup', 'review', 'lab', 'request']) {
    source.addEventListener(name, () => handlers.onEvent?.(name))
  }
  return () => source.close()
}
