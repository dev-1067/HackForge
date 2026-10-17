export type Level = 'L0' | 'L1' | 'L2' | 'L3' | 'L4'
export type Role = 'rider' | 'company'

export interface User {
  user_id: number
  role: Role
  name: string
  rider_id: string | null
}

export interface Session {
  user: User
  csrf_token: string
  home: string
}

export interface Reason {
  feature?: string
  group?: string
  z?: number
  direction?: 'higher' | 'lower'
  note?: string
}

export interface Decision {
  decision_id: number
  session_id: string
  rider_id: string
  rider_name: string | null
  decided_at: string
  started_at: string | null
  level: Level
  action: string
  status: string
  context_score: number
  habit_score: number
  evidence_score: number
  threshold: number
  habit_deviation: number
  context_flags: string[]
  reasons: Reason[]
  model_version: string
  awaiting_rider_since?: string | null
  review_verdict: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  context?: { device_id?: string; city?: string; zone?: string; network_type?: string } | null
  source?: string | null
  ground_truth?: { actor: 'owner' | 'other'; label: string } | null
  resolution?: { stepup?: string; review?: string; blocked?: boolean } | null
  session?: { context: Record<string, string>; habit: Record<string, number> } | null
  rider?: { rider_id: string; home_city: string | null; status: string | null; baseline: Record<string, number>; known_cities: string[] } | null
}

export interface FilterOptions {
  cities: string[]
  zones: string[]
  audit_actions: string[]
  reviewers: string[]
}

export interface MetricsSummary {
  sessions_scored: number
  riders: number
  level_counts: Record<Level, number>
  rider_status_counts: Record<string, number>
  stepup_rate: number
  accounts_under_watch: number
  pending_reviews: number
  open_cases: number
  open_requests: number
  open_stepups: number
  model_version: string
  simulation: {
    honest_sessions: number
    false_stepup_rate: number
    false_lockout_rate: number
    impostor_accounts: number
    impostor_accounts_flagged: number
    impostor_sessions: number
    median_sessions_to_detect: number | null
  }
}

export interface RiderListItem {
  rider_id: string
  name: string | null
  archetype: string
  home_city: string | null
  status: string
  sessions_seen: number
  last_level: Level
  last_evidence: number
  last_seen_at: string | null
}

export interface RiderDetail extends RiderListItem {
  evidence: number
  streak: number
  failed_stepups: number
  known_devices: number
  known_cities: string[]
  baseline: Record<string, number>
  level_counts: Record<Level, number>
}

export interface TimelineItem {
  session_id: string
  decision_id: number
  started_at: string
  city: string | null
  zone: string | null
  device_id: string | null
  level: Level
  action: string
  context_score: number
  habit_score: number
  habit_deviation: number
  evidence_score: number
  threshold: number
  context_flags: string[]
  review_verdict: string | null
  actor: 'owner' | 'other' | null
  label: string | null
}

export interface AuditEntry {
  id: number
  rider_id: string | null
  rider_name?: string | null
  actor: string
  action: string
  details: Record<string, unknown>
  at: string
}

export interface Scenario {
  name: string
  kind: 'life_event' | 'attack'
  title: string
  description: string
}

export interface LabState {
  running: boolean
  rate: number
  auto_resolve: boolean
  incidents?: boolean
  waiting_for_review?: boolean
  riders: number
  blocked: string[]
  generated: number
  active_scenarios: Record<string, { kind: string; scenario: string }>
}

export interface CompareSystem {
  false_stepup_rate: number
  false_lockout_rate: number
  takeover_recall_14d: number
  detection_latency_sessions: { median: number | null; p90: number | null }
  detection_latency_hours: { median: number | null; p90: number | null }
}

export interface CompareData {
  systems: Record<'trust_juggler' | 'naive_anomaly' | 'strict_gate' | 'open_gate', CompareSystem>
  tradeoff_curve: Array<{
    threshold_multiplier: number
    false_stepup_rate: number
    false_lockout_rate: number
    takeover_recall_14d: number
    median_sessions_to_detect: number | null
  }>
}

export interface StatusExplanation {
  state: 'verification_needed' | 'on_hold' | 'suspended'
  since: string | null
  outcome: string
  decided_by: string
  noticed: string[]
  evidence: Array<{ at: string; city: string | null; phone: string; what: string }>
  what_it_means: string
  what_you_can_do: string[]
  note: string
  help: { kind: string }
}

export interface MapRider {
  rider_id: string
  name: string | null
  status: string
  city: string | null
  zone: string | null
  last_seen_at: string
  decision_level: Level
}

export interface RiderOverview {
  rider: { name: string; rider_id: string }
  account: { state: 'ok' | 'verification_needed' | 'on_hold' | 'suspended'; headline: string; detail: string; action_required: boolean }
  notices: string[]
  explanation: StatusExplanation | null
  unread_notifications?: number
  recent_activity: Array<{ when: string; city: string | null; phone: string; note: string; tone: 'normal' | 'noted' | 'check' }>
}

export type Origin = 'recorded' | 'demo'
export type RequestStatus = 'open' | 'in_review' | 'resolved' | 'declined'
export type RequestKind = 'unfamiliar_signin' | 'verification_help' | 'legitimate_change' | 'human_review' | 'device_change' | 'other'

export interface ActivityEvent {
  id: string
  kind: string
  at: string | null
  origin: Origin
  title: string
  detail: string
  tone: 'normal' | 'noted' | 'check'
  action?: 'verify' | null
}

export interface DeviceInfo {
  device_id: string
  label: string
  os: string | null
  city: string | null
  app_version: string | null
  first_seen: string | null
  last_seen: string | null
  sessions: number
  current: boolean
  origin: Origin
  reported: boolean
}

export interface AccountOverview {
  profile: { name: string; rider_id: string; phone_hint: string | null; member_since: string | null; last_sign_in: string | null }
  status: { state: RiderOverview['account']['state']; headline: string; detail: string; action_required: boolean }
  explanation: StatusExplanation | null
  verification: {
    outstanding: { requested_at: string | null; message: string; origin: Origin } | null
    history: Array<{ requested_at: string | null; resolved_at: string | null; result: 'pending' | 'passed' | 'failed'; origin: Origin }>
    latest_event_at: string | null
  }
  devices: DeviceInfo[]
  recent_device_changes: Array<{ at: string | null; label: string; city: string | null; origin: Origin; reported: boolean }>
  checkup: Array<{ key: string; ok: boolean; text: string }>
}

export interface HelpRequest {
  id: number
  kind: RequestKind
  kind_label: string
  message: string
  device_id: string | null
  device_label: string | null
  status: RequestStatus
  status_label: string
  created_at: string | null
  updated_at: string | null
  response_note: string | null
  responded_at: string | null
}

export interface TeamRequest extends HelpRequest {
  rider_id: string
  rider_name: string | null
  responded_by: string | null
  rider_status: string
}

export interface ActiveSession {
  signed_in_at: string
  last_active: string
  browser: string
  is_new_browser: boolean
  current: boolean
}

export interface NotificationItem {
  id: string
  kind: string
  at: string | null
  origin: Origin
  tone: 'normal' | 'noted' | 'check'
  title: string
  detail: string
  link: string
  sticky: boolean
  unread: boolean
}

export interface WorkSummary {
  days: number
  period: { from: string | null; to: string | null }
  sessions: Array<{ at: string; city: string | null; origin: Origin }>
  totals: { sessions: number; active_days: number; phones: number; cities: Array<{ city: string; sessions: number }> }
  all_time: { sessions: number; first_seen: string | null; last_seen: string | null }
  includes_demo: boolean
}

export interface SignInRow { at: string; browser: string; new_browser: boolean; current: boolean }

export interface DbColumn { name: string; type: string; primary_key: boolean; foreign_key: string | null; hidden: boolean; masked: boolean }
export interface DbTableInfo { name: string; rows: number; note: string; demo: boolean; columns: DbColumn[] }
export interface DbOverview {
  connection: { engine: string; name: string | null; size_kb?: number; host?: string | null; port?: number | null; how_to_open: string }
  tables: DbTableInfo[]
}
export interface DbRows { table: string; total: number; limit: number; offset: number; columns: string[]; rows: Array<Record<string, unknown>> }
