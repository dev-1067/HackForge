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
  review_verdict: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  context?: { device_id?: string; city?: string; zone?: string; network_type?: string } | null
  source?: string | null
  ground_truth?: { actor: 'owner' | 'other'; label: string } | null
  resolution?: { stepup?: string; review?: string; blocked?: boolean } | null
  session?: { context: Record<string, string>; habit: Record<string, number> } | null
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

export interface RiderOverview {
  rider: { name: string; rider_id: string }
  account: { state: 'ok' | 'verification_needed' | 'on_hold' | 'suspended'; headline: string; detail: string; action_required: boolean }
  notices: string[]
  recent_activity: Array<{ when: string; city: string | null; phone: string; note: string; tone: 'normal' | 'noted' | 'check' }>
}
