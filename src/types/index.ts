export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'critical'

export type DecisionLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4'

export interface DecisionMeta {
  code: DecisionLevel
  label: string
  action: string
  description: string
  color: string
  badgeVariant: 'success' | 'info' | 'warning' | 'destructive' | 'critical'
}

export interface ContextSignals {
  deviceModel: string
  osVersion: string
  city: string
  zone: string
  ipRange: string
  carrier: string
  hourOfDay: number
  isNewDevice: boolean
  isNewCity: boolean
  isNewZone: boolean
  isVpnOrProxy: boolean
}

export interface HabitSignals {
  acceptanceLatencySec: number // baseline vs current
  tapSwipeCadenceMs: number     // touch interaction interval
  speedProfileZScore: number    // transit speed variance
  routeDeviationScore: number   // 0.0 to 1.0
  breakRhythmDeltaMin: number   // typical rest break diff
  cancellationRate: number      // recent window cancellation %
  acceptanceRate: number        // recent window acceptance %
  orderPacePerHour: number      // orders completed per hour
}

export interface SessionRecord {
  id: string
  sessionId: string
  riderId: string
  riderName: string
  timestamp: string
  
  // Decoupled Scores
  contextNoveltyScore: number // 0.0 - 1.0 (how novel is the environment)
  habitDeviationScore: number // 0.0 - 1.0 (how much habit deviates from baseline)
  evidenceScore: number       // 0.0 - 1.0 (accumulated multi-session evidence)
  
  // Categorical outcomes
  decision: DecisionLevel
  riskLevel: RiskLevel
  
  // Signals breakdown
  context: ContextSignals
  habits: HabitSignals
  
  // Explainability
  explanation: string
  evidenceFactors: string[]
  recommendedAction: string
  
  // State
  status: 'active' | 'cleared' | 'under_review' | 'challenged'
}

export interface LiveAlert {
  id: string
  sessionId: string
  riderId: string
  riderName: string
  timestamp: string
  decision: DecisionLevel
  riskLevel: RiskLevel
  title: string
  summary: string
  reasons: string[]
  habitDeviation: number
  contextNovelty: number
  evidenceScore: number
}

export interface KpiSummary {
  sessionsProcessed: number
  sessionsChange24h: number
  activeAlerts: number
  alertsChange24h: number
  accountsUnderWatch: number
  watchChange24h: number
  stepUpRatePercent: number
  stepUpChange24h: number
  simulationStatus: 'ACTIVE_SIMULATION' | 'CONNECTING' | 'LIVE_STREAM'
  lastSyncTime: string
}

export interface ChartDataPoint {
  time: string
  timestamp: number
  habitDeviation: number
  evidenceAccumulated: number
  baseline: number
  decisionLevel: DecisionLevel
  sessionId: string
}
