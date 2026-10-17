import { SessionRecord, KpiSummary, DecisionLevel, DecisionMeta, ChartDataPoint, LiveAlert } from '@/types'

export const DECISION_METADATA: Record<DecisionLevel, DecisionMeta> = {
  L0: {
    code: 'L0',
    label: 'Allow',
    action: 'Allow Session',
    description: 'Normal behavior or benign context change. Baseline learning active.',
    color: '#10B981',
    badgeVariant: 'success',
  },
  L1: {
    code: 'L1',
    label: 'Watch',
    action: 'Passive Watch',
    description: 'Slight habit drift or mild novelty. Accumulator incremented without worker friction.',
    color: '#3B82F6',
    badgeVariant: 'info',
  },
  L2: {
    code: 'L2',
    label: 'Step-up',
    action: 'Step-up Verify',
    description: 'Elevated habit deviation. Silent in-app biometric/selfie challenge recommended.',
    color: '#F59E0B',
    badgeVariant: 'warning',
  },
  L3: {
    code: 'L3',
    label: 'Manual Review',
    action: 'Queue Analyst',
    description: 'Persistent multi-session deviation. Routed to operations fraud review team.',
    color: '#EF4444',
    badgeVariant: 'destructive',
  },
  L4: {
    code: 'L4',
    label: 'Suspend',
    action: 'Temporary Hold',
    description: 'Acute confidence of unauthorized account handoff. Dispatch paused pending verification.',
    color: '#7F1D1D',
    badgeVariant: 'critical',
  },
}

export const INITIAL_KPI_SUMMARY: KpiSummary = {
  sessionsProcessed: 48924,
  sessionsChange24h: 12.4,
  activeAlerts: 19,
  alertsChange24h: -4.2,
  accountsUnderWatch: 168,
  watchChange24h: 3.1,
  stepUpRatePercent: 2.84,
  stepUpChange24h: -0.6,
  simulationStatus: 'ACTIVE_SIMULATION',
  lastSyncTime: new Date().toISOString(),
}

// Generate human-readable, calibrated explanation based on decoupled context vs habit
export function buildExplanation(
  contextNovelty: number,
  habitDeviation: number,
  evidenceScore: number,
  contextFactors: string[],
  habitFactors: string[]
): { explanation: string; recommendedAction: string } {
  // Scenario 1: Same phone/city, changed habit -> CLASSIC HANDOFF
  if (contextNovelty < 0.25 && habitDeviation >= 0.55) {
    return {
      explanation: `Device, carrier, and zone are unchanged, but acceptance latency (${habitFactors[0] || 'timing'}) and interaction cadence have shifted sharply across recent deliveries. Typical signature of a rented profile or secondary rider.`,
      recommendedAction: evidenceScore > 0.65 ? 'Escalate to L3 Manual Review; require live facial verification before next payout' : 'Issue L2 Step-up biometric check upon next delivery acceptance'
    }
  }

  // Scenario 2: New phone or city, but habits match -> LIFE EVENT (benign)
  if (contextNovelty >= 0.5 && habitDeviation < 0.3) {
    return {
      explanation: `New hardware device and IP range detected (${contextFactors.join(', ') || 'device migration'}), yet rider motor habits, tap cadence, and route choices remain consistent with historical baseline. Benign equipment update inferred.`,
      recommendedAction: 'Allow session (L0) and update rider device baseline; do not disrupt worker.'
    }
  }

  // Scenario 3: Elevated context and elevated habit -> ACUTE ANOMALY
  if (contextNovelty >= 0.5 && habitDeviation >= 0.5) {
    return {
      explanation: `Both environment (${contextFactors.join(', ') || 'unfamiliar zone/IP'}) and operational habits (${habitFactors.join(', ') || 'acceptance pace'}) have simultaneously diverged from established patterns.`,
      recommendedAction: 'Trigger L3 investigation and enforce mid-shift verification challenge.'
    }
  }

  // Scenario 4: Minor drift under watch
  if (habitDeviation >= 0.35 || evidenceScore >= 0.35) {
    return {
      explanation: `Subtle variance in dispatch response latency and order cancellation pattern. Insufficient certainty for friction, evidence accumulator tracking.`,
      recommendedAction: 'Maintain L1 passive watch mode; monitor next 3 consecutive deliveries.'
    }
  }

  // Default normal
  return {
    explanation: 'Rider context and behavioral metrics align closely with historical 30-day baseline distributions.',
    recommendedAction: 'Standard allow (L0); regular dispatch flow.'
  }
}

const NOW = Date.now()

export const SEED_SESSIONS: SessionRecord[] = [
  {
    id: 'rec_01',
    sessionId: 'sess_9941a8',
    riderId: 'RDR-8021',
    riderName: 'Marcus Chen',
    timestamp: new Date(NOW - 1000 * 42).toISOString(),
    contextNoveltyScore: 0.12,
    habitDeviationScore: 0.84,
    evidenceScore: 0.78,
    decision: 'L3',
    riskLevel: 'high',
    context: {
      deviceModel: 'iPhone 13 Pro',
      osVersion: 'iOS 17.4',
      city: 'London',
      zone: 'Soho / Central',
      ipRange: '82.165.x.x (EE Mobile)',
      carrier: 'EE Mobile',
      hourOfDay: 14,
      isNewDevice: false,
      isNewCity: false,
      isNewZone: false,
      isVpnOrProxy: false,
    },
    habits: {
      acceptanceLatencySec: 14.8, // normal is 3.2s
      tapSwipeCadenceMs: 142,      // normal is 380ms
      speedProfileZScore: 2.8,
      routeDeviationScore: 0.74,
      breakRhythmDeltaMin: 45,
      cancellationRate: 18.5,
      acceptanceRate: 64.0,
      orderPacePerHour: 3.8,
    },
    explanation: 'Device, carrier, and zone are unchanged, but acceptance latency (14.8s vs 3.2s norm) and swipe cadence have shifted sharply. Possible physical handoff of verified device to secondary rider.',
    evidenceFactors: [
      'Acceptance latency +360% vs baseline',
      'Swipe cadence variance > 3.2 std deviations',
      'Route deviation score 0.74 in familiar zone',
      'Repeated anomaly across last 4 consecutive orders'
    ],
    recommendedAction: 'Queue for L3 Analyst Review; prompt biometric selfie verification before order dispatch',
    status: 'under_review'
  },
  {
    id: 'rec_02',
    sessionId: 'sess_9941a7',
    riderId: 'RDR-4109',
    riderName: 'Elena Rostova',
    timestamp: new Date(NOW - 1000 * 95).toISOString(),
    contextNoveltyScore: 0.88,
    habitDeviationScore: 0.16,
    evidenceScore: 0.18,
    decision: 'L0',
    riskLevel: 'low',
    context: {
      deviceModel: 'Samsung Galaxy S24 Ultra',
      osVersion: 'Android 14',
      city: 'London',
      zone: 'Camden Town',
      ipRange: '148.252.x.x (Vodafone)',
      carrier: 'Vodafone UK',
      hourOfDay: 14,
      isNewDevice: true,
      isNewCity: false,
      isNewZone: true,
      isVpnOrProxy: false,
    },
    habits: {
      acceptanceLatencySec: 4.1,
      tapSwipeCadenceMs: 295,
      speedProfileZScore: 0.4,
      routeDeviationScore: 0.18,
      breakRhythmDeltaMin: 5,
      cancellationRate: 2.1,
      acceptanceRate: 94.0,
      orderPacePerHour: 2.6,
    },
    explanation: 'Brand-new device model detected in Camden zone, yet physical interaction speed, acceptance cadence, and navigation profile match historical baseline. Inferred benign hardware upgrade.',
    evidenceFactors: [
      'First session on Galaxy S24 Ultra',
      'Habit deviation remains minimal (0.16)',
      'Consistent touch interaction rhythm'
    ],
    recommendedAction: 'Allow session (L0) and safely update baseline device fingerprint without worker friction.',
    status: 'cleared'
  },
  {
    id: 'rec_03',
    sessionId: 'sess_9941a6',
    riderId: 'RDR-6394',
    riderName: 'Devon Vance',
    timestamp: new Date(NOW - 1000 * 160).toISOString(),
    contextNoveltyScore: 0.15,
    habitDeviationScore: 0.69,
    evidenceScore: 0.62,
    decision: 'L2',
    riskLevel: 'elevated',
    context: {
      deviceModel: 'Pixel 7a',
      osVersion: 'Android 14',
      city: 'Birmingham',
      zone: 'Digbeth Hub',
      ipRange: '92.40.x.x (Three UK)',
      carrier: 'Three UK',
      hourOfDay: 13,
      isNewDevice: false,
      isNewCity: false,
      isNewZone: false,
      isVpnOrProxy: false,
    },
    habits: {
      acceptanceLatencySec: 11.2,
      tapSwipeCadenceMs: 190,
      speedProfileZScore: 1.9,
      routeDeviationScore: 0.58,
      breakRhythmDeltaMin: 32,
      cancellationRate: 11.0,
      acceptanceRate: 72.0,
      orderPacePerHour: 3.1,
    },
    explanation: 'Device matches authorized account, but delivery transit profile and dispatch acknowledgement delays indicate an unfamiliar operator holding the handset.',
    evidenceFactors: [
      'Unusual order hesitation: 11.2s avg acceptance',
      'Transit velocity variance outside 95th percentile',
      'Accumulated evidence rising over last 2 hours'
    ],
    recommendedAction: 'Issue in-app L2 selfie verification gate prior to next batch assignment.',
    status: 'challenged'
  },
  {
    id: 'rec_04',
    sessionId: 'sess_9941a5',
    riderId: 'RDR-1182',
    riderName: 'Tariq Al-Mansoor',
    timestamp: new Date(NOW - 1000 * 240).toISOString(),
    contextNoveltyScore: 0.08,
    habitDeviationScore: 0.12,
    evidenceScore: 0.06,
    decision: 'L0',
    riskLevel: 'low',
    context: {
      deviceModel: 'iPhone 12',
      osVersion: 'iOS 16.6',
      city: 'Manchester',
      zone: 'Northern Quarter',
      ipRange: '86.130.x.x (Virgin Media)',
      carrier: 'O2 UK',
      hourOfDay: 13,
      isNewDevice: false,
      isNewCity: false,
      isNewZone: false,
      isVpnOrProxy: false,
    },
    habits: {
      acceptanceLatencySec: 3.0,
      tapSwipeCadenceMs: 340,
      speedProfileZScore: 0.2,
      routeDeviationScore: 0.10,
      breakRhythmDeltaMin: 4,
      cancellationRate: 1.5,
      acceptanceRate: 98.0,
      orderPacePerHour: 2.9,
    },
    explanation: 'Standard verified session. Context parameters and kinetic behavioral profiles match regular rider pattern.',
    evidenceFactors: ['Zero context novelty', 'Zero habit deviation', 'Trusted device'],
    recommendedAction: 'Allow (L0) - Standard operational dispatch.',
    status: 'cleared'
  },
  {
    id: 'rec_05',
    sessionId: 'sess_9941a4',
    riderId: 'RDR-9510',
    riderName: 'Priya Sharma',
    timestamp: new Date(NOW - 1000 * 310).toISOString(),
    contextNoveltyScore: 0.35,
    habitDeviationScore: 0.38,
    evidenceScore: 0.34,
    decision: 'L1',
    riskLevel: 'moderate',
    context: {
      deviceModel: 'Xiaomi Redmi Note 12',
      osVersion: 'Android 13',
      city: 'London',
      zone: 'Stratford West',
      ipRange: '80.4.x.x (Vodafone)',
      carrier: 'Vodafone UK',
      hourOfDay: 12,
      isNewDevice: false,
      isNewCity: false,
      isNewZone: true,
      isVpnOrProxy: false,
    },
    habits: {
      acceptanceLatencySec: 5.8,
      tapSwipeCadenceMs: 270,
      speedProfileZScore: 1.1,
      routeDeviationScore: 0.35,
      breakRhythmDeltaMin: 18,
      cancellationRate: 4.5,
      acceptanceRate: 88.0,
      orderPacePerHour: 2.4,
    },
    explanation: 'Delivery zone change combined with mild navigation uncertainty. Likely rider operating in unfamiliar territory; no evidence of handoff.',
    evidenceFactors: [
      'First shift in Stratford West zone',
      'Slight navigation pauses (route deviation 0.35)',
      'Baseline habit metrics within acceptable threshold'
    ],
    recommendedAction: 'Maintain L1 passive watch mode; do not prompt friction.',
    status: 'active'
  },
  {
    id: 'rec_06',
    sessionId: 'sess_9941a3',
    riderId: 'RDR-3042',
    riderName: 'Kasper Lindqvist',
    timestamp: new Date(NOW - 1000 * 420).toISOString(),
    contextNoveltyScore: 0.94,
    habitDeviationScore: 0.92,
    evidenceScore: 0.91,
    decision: 'L4',
    riskLevel: 'critical',
    context: {
      deviceModel: 'Motorola Moto G Power',
      osVersion: 'Android 11',
      city: 'Leeds',
      zone: 'City Centre Outer',
      ipRange: '194.38.x.x (Datacenter VPN)',
      carrier: 'Unknown Proxy',
      hourOfDay: 12,
      isNewDevice: true,
      isNewCity: true,
      isNewZone: true,
      isVpnOrProxy: true,
    },
    habits: {
      acceptanceLatencySec: 28.5,
      tapSwipeCadenceMs: 85,
      speedProfileZScore: 4.2,
      routeDeviationScore: 0.89,
      breakRhythmDeltaMin: 95,
      cancellationRate: 42.0,
      acceptanceRate: 38.0,
      orderPacePerHour: 0.8,
    },
    explanation: 'Acute divergence across both environmental context (datacenter proxy, unfamiliar Leeds IP) and motor habit metrics (unnatural automated swipe speed, erratic transit speed). High confidence of rented account abuse.',
    evidenceFactors: [
      'Commercial datacenter IP address detected',
      'Impossible velocity jump between login cities',
      'Swipe cadence reflects script/bot injection',
      'Multi-session evidence accumulator saturated at 0.91'
    ],
    recommendedAction: 'Immediate L4 dispatch suspension; require full ID & face re-verification before reactivation.',
    status: 'active'
  },
  {
    id: 'rec_07',
    sessionId: 'sess_9941a2',
    riderId: 'RDR-7215',
    riderName: 'Chloe Dupont',
    timestamp: new Date(NOW - 1000 * 530).toISOString(),
    contextNoveltyScore: 0.18,
    habitDeviationScore: 0.22,
    evidenceScore: 0.14,
    decision: 'L0',
    riskLevel: 'low',
    context: {
      deviceModel: 'iPhone 14',
      osVersion: 'iOS 17.2',
      city: 'Bristol',
      zone: 'Harbourside',
      ipRange: '31.52.x.x (Sky Broadband)',
      carrier: 'Sky Mobile',
      hourOfDay: 11,
      isNewDevice: false,
      isNewCity: false,
      isNewZone: false,
      isVpnOrProxy: false,
    },
    habits: {
      acceptanceLatencySec: 3.5,
      tapSwipeCadenceMs: 310,
      speedProfileZScore: 0.5,
      routeDeviationScore: 0.15,
      breakRhythmDeltaMin: 8,
      cancellationRate: 3.0,
      acceptanceRate: 91.0,
      orderPacePerHour: 2.7,
    },
    explanation: 'Nominal session. Normal operational cadence and verified personal smartphone.',
    evidenceFactors: ['Matches 60-day habitual profile', 'Verified SIM and device telemetry'],
    recommendedAction: 'Allow (L0).',
    status: 'cleared'
  },
  {
    id: 'rec_08',
    sessionId: 'sess_9941a1',
    riderId: 'RDR-5034',
    riderName: 'Mateo Morales',
    timestamp: new Date(NOW - 1000 * 680).toISOString(),
    contextNoveltyScore: 0.22,
    habitDeviationScore: 0.72,
    evidenceScore: 0.68,
    decision: 'L2',
    riskLevel: 'elevated',
    context: {
      deviceModel: 'OnePlus Nord CE 3',
      osVersion: 'Android 13',
      city: 'London',
      zone: 'Brixton Market',
      ipRange: '81.109.x.x (EE Mobile)',
      carrier: 'EE Mobile',
      hourOfDay: 10,
      isNewDevice: false,
      isNewCity: false,
      isNewZone: false,
      isVpnOrProxy: false,
    },
    habits: {
      acceptanceLatencySec: 13.4,
      tapSwipeCadenceMs: 165,
      speedProfileZScore: 2.1,
      routeDeviationScore: 0.62,
      breakRhythmDeltaMin: 40,
      cancellationRate: 14.0,
      acceptanceRate: 68.0,
      orderPacePerHour: 3.4,
    },
    explanation: 'Rider phone matches registered handset, but response latency is 4x slower than baseline, accompanied by elevated navigation rerouting in standard delivery corridors.',
    evidenceFactors: [
      'Average accept delay 13.4s (baseline 2.9s)',
      'Sub-optimal route choice with frequent dead-ends',
      'Evidence accumulator trend upward for 3 shifts'
    ],
    recommendedAction: 'Dispatch active L2 Step-Up verification request.',
    status: 'challenged'
  }
]

export const INITIAL_ALERTS: LiveAlert[] = [
  {
    id: 'alt_01',
    sessionId: 'sess_9941a8',
    riderId: 'RDR-8021',
    riderName: 'Marcus Chen',
    timestamp: new Date(NOW - 1000 * 42).toISOString(),
    decision: 'L3',
    riskLevel: 'high',
    title: 'Suspected Handset Handoff (Same Phone, Unfamiliar Rider)',
    summary: 'Device, carrier, and zone are unchanged, but acceptance latency and motor cadence have shifted by +360%. Evidence accumulator reached 0.78.',
    reasons: [
      'Acceptance latency: 14.8s (baseline: 3.2s)',
      'Touch rhythm variance > 3.2 std deviations',
      '4 consecutive anomalous dispatches'
    ],
    habitDeviation: 0.84,
    contextNovelty: 0.12,
    evidenceScore: 0.78,
  },
  {
    id: 'alt_02',
    sessionId: 'sess_9941a3',
    riderId: 'RDR-3042',
    riderName: 'Kasper Lindqvist',
    timestamp: new Date(NOW - 1000 * 420).toISOString(),
    decision: 'L4',
    riskLevel: 'critical',
    title: 'Acute Takeover & Proxy Abuse',
    summary: 'Datacenter IP connection with impossible geographical shift and automated swipe rhythm. Instant dispatch pause applied.',
    reasons: [
      'Commercial datacenter IP proxy flagged',
      'Motorola Moto G Power not on rider account file',
      'Swipe cadence mimics scripted injector'
    ],
    habitDeviation: 0.92,
    contextNovelty: 0.94,
    evidenceScore: 0.91,
  },
  {
    id: 'alt_03',
    sessionId: 'sess_9941a6',
    riderId: 'RDR-6394',
    riderName: 'Devon Vance',
    timestamp: new Date(NOW - 1000 * 160).toISOString(),
    decision: 'L2',
    riskLevel: 'elevated',
    title: 'Graduated Step-Up Challenge Triggered',
    summary: 'Persistent dispatch hesitation across two consecutive shifts. Silent biometric selfie required on next pickup.',
    reasons: [
      'Acceptance delay 11.2s vs 3.4s baseline',
      'Velocity profile variance in Digbeth Hub',
      'Evidence accumulation at 0.62'
    ],
    habitDeviation: 0.69,
    contextNovelty: 0.15,
    evidenceScore: 0.62,
  }
]

// Seed timeline data for the compact Habit Deviation vs Evidence Accumulation chart
export const SEED_CHART_TIMELINE: ChartDataPoint[] = [
  { time: '13:00', timestamp: NOW - 3600000, habitDeviation: 0.18, evidenceAccumulated: 0.12, baseline: 0.20, decisionLevel: 'L0', sessionId: 'sess_994110' },
  { time: '13:10', timestamp: NOW - 3000000, habitDeviation: 0.22, evidenceAccumulated: 0.15, baseline: 0.20, decisionLevel: 'L0', sessionId: 'sess_994111' },
  { time: '13:20', timestamp: NOW - 2400000, habitDeviation: 0.35, evidenceAccumulated: 0.22, baseline: 0.20, decisionLevel: 'L1', sessionId: 'sess_994112' },
  { time: '13:30', timestamp: NOW - 1800000, habitDeviation: 0.64, evidenceAccumulated: 0.44, baseline: 0.20, decisionLevel: 'L2', sessionId: 'sess_994113' },
  { time: '13:40', timestamp: NOW - 1200000, habitDeviation: 0.71, evidenceAccumulated: 0.58, baseline: 0.20, decisionLevel: 'L2', sessionId: 'sess_994114' },
  { time: '13:50', timestamp: NOW - 600000, habitDeviation: 0.85, evidenceAccumulated: 0.74, baseline: 0.20, decisionLevel: 'L3', sessionId: 'sess_994115' },
  { time: '14:00', timestamp: NOW - 200000, habitDeviation: 0.48, evidenceAccumulated: 0.65, baseline: 0.20, decisionLevel: 'L2', sessionId: 'sess_994116' },
  { time: '14:10', timestamp: NOW, habitDeviation: 0.84, evidenceAccumulated: 0.78, baseline: 0.20, decisionLevel: 'L3', sessionId: 'sess_9941a8' },
]

// Generator for live simulated stream ticks
const RIDER_POOL = [
  { id: 'RDR-8021', name: 'Marcus Chen', device: 'iPhone 13 Pro', city: 'London', zone: 'Soho' },
  { id: 'RDR-4109', name: 'Elena Rostova', device: 'Galaxy S24 Ultra', city: 'London', zone: 'Camden' },
  { id: 'RDR-6394', name: 'Devon Vance', device: 'Pixel 7a', city: 'Birmingham', zone: 'Digbeth' },
  { id: 'RDR-9510', name: 'Priya Sharma', device: 'Xiaomi Note 12', city: 'London', zone: 'Stratford' },
  { id: 'RDR-5034', name: 'Mateo Morales', device: 'OnePlus Nord', city: 'London', zone: 'Brixton' },
  { id: 'RDR-2201', name: 'Liam O’Connor', device: 'iPhone 15', city: 'Manchester', zone: 'Deansgate' },
  { id: 'RDR-1784', name: 'Amina Diallo', device: 'Galaxy A54', city: 'Bristol', zone: 'Clifton' },
]

export function generateSimulatedSession(): SessionRecord {
  const rider = RIDER_POOL[Math.floor(Math.random() * RIDER_POOL.length)]
  const randType = Math.random()
  const now = new Date()

  let contextNovelty: number
  let habitDeviation: number
  let evidenceScore: number
  let decision: DecisionLevel
  let riskLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'critical'
  let contextFactors: string[] = []
  let habitFactors: string[] = []

  if (randType < 0.55) {
    // 55% normal allow
    contextNovelty = +(Math.random() * 0.2).toFixed(2)
    habitDeviation = +(Math.random() * 0.25).toFixed(2)
    evidenceScore = +(Math.random() * 0.2).toFixed(2)
    decision = 'L0'
    riskLevel = 'low'
  } else if (randType < 0.75) {
    // 20% benign life event (new phone/city, habit unchanged)
    contextNovelty = +(0.65 + Math.random() * 0.3).toFixed(2)
    habitDeviation = +(Math.random() * 0.22).toFixed(2)
    evidenceScore = +(Math.random() * 0.25).toFixed(2)
    decision = 'L0'
    riskLevel = 'low'
    contextFactors = ['New device ID observed', 'New IP gateway']
  } else if (randType < 0.88) {
    // 13% suspicious handoff (context unchanged, habit deviated!)
    contextNovelty = +(Math.random() * 0.2).toFixed(2)
    habitDeviation = +(0.6 + Math.random() * 0.3).toFixed(2)
    evidenceScore = +(0.55 + Math.random() * 0.25).toFixed(2)
    decision = evidenceScore > 0.7 ? 'L3' : 'L2'
    riskLevel = decision === 'L3' ? 'high' : 'elevated'
    habitFactors = ['Acceptance latency shifted +280%', 'Atypical swipe velocity']
  } else if (randType < 0.96) {
    // 8% passive watch / minor drift
    contextNovelty = +(0.2 + Math.random() * 0.3).toFixed(2)
    habitDeviation = +(0.32 + Math.random() * 0.25).toFixed(2)
    evidenceScore = +(0.3 + Math.random() * 0.2).toFixed(2)
    decision = 'L1'
    riskLevel = 'moderate'
    habitFactors = ['Slight delay in dispatch acceptance']
  } else {
    // 4% acute collision/takeover
    contextNovelty = +(0.8 + Math.random() * 0.18).toFixed(2)
    habitDeviation = +(0.85 + Math.random() * 0.14).toFixed(2)
    evidenceScore = +(0.85 + Math.random() * 0.12).toFixed(2)
    decision = 'L4'
    riskLevel = 'critical'
    contextFactors = ['High-risk VPN proxy', 'Unknown hardware signature']
    habitFactors = ['Machine automated swipe rate', 'Transit route inversion']
  }

  const { explanation, recommendedAction } = buildExplanation(
    contextNovelty,
    habitDeviation,
    evidenceScore,
    contextFactors,
    habitFactors
  )

  const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')

  return {
    id: `rec_${Date.now()}_${randomHex.slice(0, 3)}`,
    sessionId: `sess_${randomHex}`,
    riderId: rider.id,
    riderName: rider.name,
    timestamp: now.toISOString(),
    contextNoveltyScore: contextNovelty,
    habitDeviationScore: habitDeviation,
    evidenceScore,
    decision,
    riskLevel,
    context: {
      deviceModel: contextNovelty > 0.6 ? 'New Device (Unmapped)' : rider.device,
      osVersion: 'Android 14',
      city: rider.city,
      zone: rider.zone,
      ipRange: '88.102.x.x',
      carrier: 'Cellular LTE',
      hourOfDay: now.getHours(),
      isNewDevice: contextNovelty > 0.6,
      isNewCity: false,
      isNewZone: contextNovelty > 0.4,
      isVpnOrProxy: decision === 'L4',
    },
    habits: {
      acceptanceLatencySec: +(2.5 + habitDeviation * 14).toFixed(1),
      tapSwipeCadenceMs: Math.round(350 - habitDeviation * 220),
      speedProfileZScore: +(habitDeviation * 3.2).toFixed(1),
      routeDeviationScore: +(habitDeviation * 0.85).toFixed(2),
      breakRhythmDeltaMin: Math.round(habitDeviation * 60),
      cancellationRate: +(habitDeviation * 24).toFixed(1),
      acceptanceRate: +(98 - habitDeviation * 40).toFixed(1),
      orderPacePerHour: +(3.2 - habitDeviation * 1.8).toFixed(1),
    },
    explanation,
    evidenceFactors: [
      ...contextFactors,
      ...habitFactors,
      `Calculated habit deviation: ${Math.round(habitDeviation * 100)}%`,
    ],
    recommendedAction,
    status: decision === 'L3' ? 'under_review' : decision === 'L2' ? 'challenged' : 'active',
  }
}
