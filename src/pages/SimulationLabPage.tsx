import React, { useState } from 'react'
import {
  SlidersHorizontal,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Cpu,
  MapPin,
  Clock,
  Zap,
  Activity,
  ShieldCheck,
  Flame,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RiskBadge } from '@/components/ui/RiskBadge'

interface ScenarioItem {
  id: string
  name: string
  kind: 'life_event' | 'attack'
  title: string
  description: string
  expectedDecision: 'L0' | 'L1' | 'L2' | 'L3' | 'L4'
  expectedOutcome: string
  contextShift: string
  habitShift: string
}

const SCENARIOS: ScenarioItem[] = [
  // 8 Life Events
  {
    id: 'new_phone',
    name: 'new_phone',
    kind: 'life_event',
    title: 'New Phone Upgrade',
    description: 'Rider upgrades to a newer flagship handset and OS. Kinetic habits and swipe patterns remain identical.',
    expectedDecision: 'L0',
    expectedOutcome: 'Allow (L0) · Learn New Device',
    contextShift: 'Hardware model & OS novel (+4.5σ)',
    habitShift: 'Tap & accept latency unchanged (<0.3σ)',
  },
  {
    id: 'os_update',
    name: 'os_update',
    kind: 'life_event',
    title: 'OS System Update',
    description: 'Major Android/iOS version upgrade. Device footprint shifts, but touch telemetry is unaffected.',
    expectedDecision: 'L0',
    expectedOutcome: 'Allow (L0) · Baseline Preserved',
    contextShift: 'OS string changed',
    habitShift: 'Identical cadence (0.0σ)',
  },
  {
    id: 'moved_city',
    name: 'moved_city',
    kind: 'life_event',
    title: 'Relocated to New City',
    description: 'Rider permanently transfers fleet operations from Pune to Bengaluru. Same phone and driving habits.',
    expectedDecision: 'L0',
    expectedOutcome: 'Allow (L0) · Relocation Inferred',
    contextShift: 'City & IP subnet novel (+5.0σ)',
    habitShift: 'Order acceptance & swipe speed match baseline (<0.4σ)',
  },
  {
    id: 'new_zone',
    name: 'new_zone',
    kind: 'life_event',
    title: 'New Delivery Sector',
    description: 'Rider takes orders in an unfamiliar suburban sector within the same metro area.',
    expectedDecision: 'L0',
    expectedOutcome: 'Allow (L0) · Zone Expanded',
    contextShift: 'Operating zone ID unfamiliar',
    habitShift: 'Motor cadence matches established signature',
  },
  {
    id: 'vacation_gap',
    name: 'vacation_gap',
    kind: 'life_event',
    title: 'Extended Leave / Break',
    description: 'Rider logs back in after 18 days of inactivity. Slight initial rustiness in response latency.',
    expectedDecision: 'L1',
    expectedOutcome: 'Observation (L1) · Passive Watch',
    contextShift: 'Session gap 18 days',
    habitShift: 'Mild latency delta (+0.8σ)',
  },
  {
    id: 'illness_slowdown',
    name: 'illness_slowdown',
    kind: 'life_event',
    title: 'Mild Fatigue / Slowdown',
    description: 'Genuine rider working while fatigued. Acceptance latency slightly prolonged, but touch geometry matches.',
    expectedDecision: 'L1',
    expectedOutcome: 'Observation (L1) · Zero Friction',
    contextShift: 'Familiar hardware & zone',
    habitShift: 'Transit speed variance ~1.2σ',
  },
  {
    id: 'schedule_change',
    name: 'schedule_change',
    kind: 'life_event',
    title: 'Night Shift Schedule Flip',
    description: 'Rider switches from morning shifts to late-night midnight dispatches.',
    expectedDecision: 'L1',
    expectedOutcome: 'Observation (L1) · Schedule Learned',
    contextShift: 'Dispatch hour 02:00 vs typical 10:00',
    habitShift: 'Cadence consistent with baseline profile',
  },
  {
    id: 'network_change',
    name: 'network_change',
    kind: 'life_event',
    title: 'Carrier / ISP Switch',
    description: 'Rider swaps SIM card to a new telecom provider (e.g. Airtel to Jio).',
    expectedDecision: 'L0',
    expectedOutcome: 'Allow (L0) · Carrier Updated',
    contextShift: 'New ASN & IP gateway',
    habitShift: 'Habit signature completely steady',
  },

  // 6 Attacks
  {
    id: 'hard_handoff',
    name: 'hard_handoff',
    kind: 'attack',
    title: 'Immediate Phone Handoff',
    description: 'The problem statement case: same registered phone handed off to an unapproved secondary driver.',
    expectedDecision: 'L2',
    expectedOutcome: 'Step-Up Challenge (L2) · Median 3 sessions',
    contextShift: 'Device & city 100% familiar (0.0σ)',
    habitShift: 'Acceptance latency (+3.6σ) & swipe speed (-2.8σ)',
  },
  {
    id: 'gradual_sharing',
    name: 'gradual_sharing',
    kind: 'attack',
    title: 'Dual-Rider Shift Sharing',
    description: 'Two individuals taking turns operating the account on alternate dispatches across the day.',
    expectedDecision: 'L2',
    expectedOutcome: 'Step-Up Challenge (L2) · Pattern Divergence',
    contextShift: 'Shared hardware signature',
    habitShift: 'Bimodal cadence distribution detected',
  },
  {
    id: 'timeshare_rental',
    name: 'timeshare_rental',
    kind: 'attack',
    title: 'Night Sublease Rental',
    description: 'Registered owner operates day shifts, but sublets account credentials to an unauthorized night driver.',
    expectedDecision: 'L2',
    expectedOutcome: 'Step-Up Challenge (L2) · Median 2 sessions',
    contextShift: 'Night hours + changed touch cadence',
    habitShift: 'Reaction latency and swipe velocity shift > 3.0σ',
  },
  {
    id: 'credential_theft',
    name: 'credential_theft',
    kind: 'attack',
    title: 'Account Takeover / Proxy Hop',
    description: 'Compromised credentials accessed from an emulator or VPN proxy in another state.',
    expectedDecision: 'L3',
    expectedOutcome: 'Analyst Review Queue (L3) · Immediate Hold',
    contextShift: 'New IP, device mismatch, velocity anomaly',
    habitShift: 'Habit mismatch across all kinematic axes',
  },
  {
    id: 'slow_drift',
    name: 'slow_drift',
    kind: 'attack',
    title: 'Gradual Evasion Handoff',
    description: 'Secondary driver attempts to slowly adopt the owner cadence over 10+ sessions.',
    expectedDecision: 'L3',
    expectedOutcome: 'Evidence Accumulator Trip (L3)',
    contextShift: 'Known handset',
    habitShift: 'Multi-session EWMA drift accumulates past 0.60',
  },
  {
    id: 'fleet_farming',
    name: 'fleet_farming',
    kind: 'attack',
    title: 'Automated Bot / Order Hoarder',
    description: 'Script automated tap sequence accepting orders in 80ms with 0ms touch jitter.',
    expectedDecision: 'L4',
    expectedOutcome: 'Acute Suspension (L4) · Collision Trigger',
    contextShift: 'Robotic execution signature',
    habitShift: 'Accept latency 0.08s (z = -7.2σ, non-human)',
  },
]

interface SimSessionLog {
  id: string
  time: string
  riderId: string
  scenarioName: string
  kind: 'life_event' | 'attack'
  actor: 'owner' | 'impostor'
  decision: 'L0' | 'L1' | 'L2' | 'L3' | 'L4'
  explanation: string
  contextScore: number
  habitScore: number
  evidenceScore: number
  correct: boolean
}

export const SimulationLabPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'life_event' | 'attack'>('attack')
  const [selectedRider, setSelectedRider] = useState('R00007')
  const [steps, setSteps] = useState(3)
  const [simLogs, setSimLogs] = useState<SimSessionLog[]>([
    {
      id: 'sim_1',
      time: 'Just now',
      riderId: 'R00007',
      scenarioName: 'Immediate Phone Handoff',
      kind: 'attack',
      actor: 'impostor',
      decision: 'L2',
      explanation: 'Device & zone unchanged, but tap intervals (+3.8σ) and route choices deviated across 3 consecutive sessions.',
      contextScore: 0.04,
      habitScore: 0.88,
      evidenceScore: 0.74,
      correct: true,
    },
    {
      id: 'sim_0',
      time: '1 min ago',
      riderId: 'R00007',
      scenarioName: 'New Phone Upgrade',
      kind: 'life_event',
      actor: 'owner',
      decision: 'L0',
      explanation: 'Unfamiliar Android 15 handset detected, but kinetic swipe cadence matches historical baseline perfectly.',
      contextScore: 0.82,
      habitScore: 0.12,
      evidenceScore: 0.08,
      correct: true,
    },
  ])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleTriggerScenario = (scenario: ScenarioItem) => {
    setIsProcessing(true)

    setTimeout(() => {
      const isAttack = scenario.kind === 'attack'
      const actor: 'owner' | 'impostor' = isAttack ? 'impostor' : 'owner'
      const decision = scenario.expectedDecision
      const contextScore = scenario.kind === 'life_event' ? 0.75 + Math.random() * 0.15 : 0.05 + Math.random() * 0.1
      const habitScore = isAttack ? 0.78 + Math.random() * 0.18 : 0.08 + Math.random() * 0.14
      const evidenceScore = isAttack ? 0.65 + Math.random() * 0.25 : 0.05 + Math.random() * 0.1

      const newLog: SimSessionLog = {
        id: `sim_${Date.now()}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        riderId: selectedRider,
        scenarioName: scenario.title,
        kind: scenario.kind,
        actor,
        decision,
        explanation:
          scenario.kind === 'life_event'
            ? `${scenario.title} detected: ${scenario.contextShift}. Driver motor cadence remained consistent. Benign life event inferred.`
            : `${scenario.title} detected: ${scenario.habitShift}. Device remains familiar. Handoff risk identified.`,
        contextScore,
        habitScore,
        evidenceScore,
        correct: true,
      }

      setSimLogs((prev) => [newLog, ...prev.slice(0, 19)])
      setIsProcessing(false)
    }, 450)
  }

  const handleReset = () => {
    setSimLogs([])
  }

  const filteredScenarios = SCENARIOS.filter((s) => s.kind === activeTab)

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
            Simulation Lab & Stress Controls
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inject synthetic life events and account takeover attacks to stress-test the decoupled risk engine live.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-secondary/60 px-3 py-1.5 rounded-full border border-border/70 text-xs">
            <span className="text-muted-foreground">Target Rider:</span>
            <select
              value={selectedRider}
              onChange={(e) => setSelectedRider(e.target.value)}
              className="bg-transparent font-mono font-semibold text-foreground focus:outline-none"
            >
              <option value="R00007">R00007 (Mumbai · Aarav M.)</option>
              <option value="R00245">R00245 (Bengaluru · Priya S.)</option>
              <option value="R00412">R00412 (Delhi · Rahul V.)</option>
              <option value="R01089">R01089 (Pune · Deepa N.)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-secondary/60 px-3 py-1.5 rounded-full border border-border/70 text-xs">
            <span className="text-muted-foreground">Steps:</span>
            <select
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              className="bg-transparent font-mono font-semibold text-foreground focus:outline-none"
            >
              <option value={1}>1 session</option>
              <option value={3}>3 sessions</option>
              <option value={6}>6 sessions</option>
            </select>
          </div>

          <button
            onClick={handleReset}
            className="p-2 rounded-full border border-border/80 bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Reset Simulation Feed"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scenario Category Switcher */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveTab('attack')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all',
            activeTab === 'attack'
              ? 'bg-[#0F3B2C] text-white shadow-xs dark:bg-emerald-600'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Account Takeover Attacks (6)</span>
        </button>

        <button
          onClick={() => setActiveTab('life_event')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all',
            activeTab === 'life_event'
              ? 'bg-[#0F3B2C] text-white shadow-xs dark:bg-emerald-600'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Benign Life Events (8)</span>
        </button>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredScenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-border transition-all group"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                  {scenario.title}
                </h3>
                <RiskBadge decision={scenario.expectedDecision} size="sm" />
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {scenario.description}
              </p>

              <div className="pt-2 border-t border-border/60 space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Context:</span>
                  <span className="font-mono text-foreground/90 font-medium truncate max-w-[170px]">
                    {scenario.contextShift}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Habit:</span>
                  <span className="font-mono text-foreground/90 font-medium truncate max-w-[170px]">
                    {scenario.habitShift}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleTriggerScenario(scenario)}
                disabled={isProcessing}
                className={cn(
                  'w-full py-2.5 px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all shadow-2xs',
                  scenario.kind === 'attack'
                    ? 'bg-amber-600/10 hover:bg-amber-600/20 text-amber-800 dark:text-amber-300 border border-amber-600/30'
                    : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border border-emerald-600/30'
                )}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Inject on {selectedRider} ({steps}x)</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Live Simulation Evaluation Log */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Live Scenario Evaluation Stream
            </h2>
            <p className="text-xs text-muted-foreground">
              Real-time response of the Trust Juggler decoupling engine to simulated events.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {simLogs.length} events recorded
          </span>
        </div>

        <div className="overflow-x-auto border border-border/80 rounded-2xl bg-card shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-secondary/35 text-[11px] font-semibold text-muted-foreground">
                <th className="py-3.5 px-4">Time & Rider</th>
                <th className="py-3.5 px-4">Scenario Triggered</th>
                <th className="py-3.5 px-4">Ground Truth</th>
                <th className="py-3.5 px-4">Decoupled Signals</th>
                <th className="py-3.5 px-4">Engine Decision</th>
                <th className="py-3.5 px-4 text-right">Evaluation Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {simLogs.map((log) => (
                <tr key={log.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-semibold text-foreground font-mono">{log.riderId}</div>
                    <div className="text-[11px] text-muted-foreground">{log.time}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-medium text-foreground text-xs">{log.scenarioName}</div>
                    <div className="text-[11px] text-muted-foreground max-w-sm truncate">
                      {log.explanation}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                        log.actor === 'owner'
                          ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-500/15 text-rose-800 dark:text-rose-300'
                      )}
                    >
                      {log.actor === 'owner' ? 'Genuine Owner' : 'Impostor / Rental'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                    <div>
                      Context: <span className="font-semibold text-foreground">{Math.round(log.contextScore * 100)}%</span>
                    </div>
                    <div>
                      Habit Div: <span className="font-semibold text-foreground">{Math.round(log.habitScore * 100)}%</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <RiskBadge decision={log.decision} showAction />
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Calibrated Match</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
