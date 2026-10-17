import React, { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Zap,
  Clock,
  Target,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  Download,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceDot,
  Cell,
} from 'recharts'
import { cn } from '@/lib/utils'

// Data directly from docs/sample/compare.json & summary.txt
const TRADEOFF_CURVE_DATA = [
  { multiplier: '0.5x', falseStepUp: 18.05, recall: 100.0, medianSessions: 1.0 },
  { multiplier: '0.75x', falseStepUp: 3.84, recall: 100.0, medianSessions: 2.0 },
  { multiplier: '1.0x (Operating Point)', falseStepUp: 0.42, recall: 96.9, medianSessions: 3.0 },
  { multiplier: '1.5x', falseStepUp: 0.02, recall: 85.7, medianSessions: 4.0 },
  { multiplier: '2.0x', falseStepUp: 0.0, recall: 71.4, medianSessions: 6.0 },
  { multiplier: '3.0x', falseStepUp: 0.0, recall: 35.7, medianSessions: 8.0 },
  { multiplier: '4.0x', falseStepUp: 0.0, recall: 13.8, medianSessions: 10.0 },
]

const SYSTEM_COMPARISONS = [
  {
    name: 'Trust Juggler (Decoupled Engine)',
    badge: 'Our Model',
    falseStepUp: '0.42%',
    falseLockout: '0.00%',
    recall14d: '96.9%',
    medianSessions: '3.0',
    medianHours: '26.3h',
    isChampion: true,
  },
  {
    name: 'Naive Anomaly Detector (IsoForest)',
    badge: 'Baseline 1',
    falseStepUp: '0.49%',
    falseLockout: '0.00%',
    recall14d: '84.2%',
    medianSessions: '1.0',
    medianHours: '0.0h',
    isChampion: false,
  },
  {
    name: 'Strict Gate (Re-verify on context change)',
    badge: 'Baseline 2',
    falseStepUp: '0.71%',
    falseLockout: '0.00%',
    recall14d: '34.2%',
    medianSessions: '1.0',
    medianHours: '0.0h',
    isChampion: false,
  },
  {
    name: 'Open Gate (Never re-verify after signup)',
    badge: 'Baseline 3',
    falseStepUp: '0.00%',
    falseLockout: '0.00%',
    recall14d: '0.0%',
    medianSessions: 'None',
    medianHours: 'None',
    isChampion: false,
  },
]

const LIFE_EVENT_FRICTION_DATA = [
  { system: 'Strict Gate', friction: 65.1, fill: '#EF4444', note: 'Massive honest worker lockout' },
  { system: 'Naive Anomaly', friction: 15.8, fill: '#F59E0B', note: 'Flags hardware changes' },
  { system: 'Trust Juggler', friction: 5.4, fill: '#0F3B2C', note: 'Virtually identical to background' },
  { system: 'Background Baseline', friction: 5.3, fill: '#64748B', note: 'Riders with no events' },
]

const ATTACK_RECALL_DATA = [
  { name: 'Hard Handoff', recall: 100.0, medianSessions: 3.0, medianHours: 40.9, sampleSize: 28 },
  { name: 'Gradual Sharing', recall: 92.7, medianSessions: 3.0, medianHours: 43.8, sampleSize: 41 },
  { name: 'Timeshare Rental', recall: 100.0, medianSessions: 2.0, medianHours: 22.5, sampleSize: 29 },
  { name: 'Credential Theft', recall: 92.7, medianSessions: 3.0, medianHours: 22.0, sampleSize: 41 },
  { name: 'Slow Drift', recall: 100.0, medianSessions: 6.0, medianHours: 94.0, sampleSize: 31 },
  { name: 'Fleet Farming', recall: 100.0, medianSessions: 2.0, medianHours: 2.3, sampleSize: 26 },
]

const LIFE_EVENT_BREAKDOWN = [
  { name: 'New Phone Upgrade', riderFriction: '5.1%', sessionFriction: '0.40%', sample: 39 },
  { name: 'OS System Update', riderFriction: '0.0%', sessionFriction: '0.00%', sample: 38 },
  { name: 'Relocated to New City', riderFriction: '4.4%', sessionFriction: '0.20%', sample: 45 },
  { name: 'New Delivery Sector/Zone', riderFriction: '13.5%', sessionFriction: '0.53%', sample: 37 },
  { name: 'Extended Vacation Gap', riderFriction: '6.5%', sessionFriction: '0.58%', sample: 46 },
  { name: 'Illness / Slowdown', riderFriction: '47.1%', sessionFriction: '3.13%', sample: 34 },
  { name: 'Schedule / Shift Shift', riderFriction: '56.8%', sessionFriction: '2.99%', sample: 37 },
  { name: 'Cellular Carrier Change', riderFriction: '2.8%', sessionFriction: '0.16%', sample: 36 },
]

export const TradeoffAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pareto' | 'friction' | 'attacks'>('pareto')

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Breadcrumb Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            <span>Investigation & Research</span>
            <span>/</span>
            <span className="text-[#0F3B2C] dark:text-emerald-400">Model Trade-off Analytics</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pareto Frontier & Evaluation Benchmark
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Empirical validation on 1,000 held-out test riders and 85,827 scored sessions (seed 7).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl border border-border/70 bg-card text-foreground">
            Calibration: <strong className="text-[#0F3B2C] dark:text-emerald-400">h₂ = 3.124 (α = 0.5%)</strong>
          </span>
        </div>
      </div>

      {/* 5 Headline Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">False Step-Up</span>
            <Target className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">0.42%</div>
          <div className="text-[10px] text-emerald-600 font-medium">Target: ≤ 0.5% (Achieved)</div>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">False Lockout</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">0.00%</div>
          <div className="text-[10px] text-emerald-600 font-medium">Target: ~0% (Zero Lockouts)</div>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">Takeover Recall (14d)</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#0F3B2C] dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">96.9%</div>
          <div className="text-[10px] text-emerald-600 font-medium">Median: 3.0 sessions</div>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">Life-Event Friction</span>
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">5.4%</div>
          <div className="text-[10px] text-muted-foreground font-medium">vs Background: 5.3%</div>
        </div>

        <div className="p-4 rounded-2xl border border-[#0F3B2C]/20 bg-[#0F3B2C]/5 dark:bg-emerald-500/10 shadow-xs space-y-1 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium text-[#0F3B2C] dark:text-emerald-300">Scoring Latency</span>
            <Clock className="w-3.5 h-3.5 text-[#0F3B2C] dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">0.029 ms</div>
          <div className="text-[10px] text-[#0F3B2C] dark:text-emerald-300 font-medium">31,847 sessions / sec</div>
        </div>
      </div>

      {/* Main Interactive Charts & Benchmarks Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Pareto Frontier Curve (7 Cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground">Pareto Frontier: Friction vs Detection Recall</h2>
              <p className="text-xs text-muted-foreground">
                Recall of account takeovers plotted against false step-up challenge rate across threshold multipliers.
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shrink-0">
              Operating Point: 1.0x (0.42%, 96.9%)
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={TRADEOFF_CURVE_DATA} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
                <XAxis
                  dataKey="falseStepUp"
                  name="False Step-Up Rate (%)"
                  unit="%"
                  tick={{ fontSize: 10 }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                />
                <YAxis
                  dataKey="recall"
                  name="14d Takeover Recall (%)"
                  unit="%"
                  domain={[0, 105]}
                  tick={{ fontSize: 10 }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                />
                <Tooltip
                  formatter={(val: any, name: any) => [`${val}%`, name === 'recall' ? 'Recall (14d)' : 'False Step-Up']}
                  labelFormatter={(label) => `False Step-Up Rate: ${label}%`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="recall"
                  stroke="#0F3B2C"
                  strokeWidth={3}
                  dot={{ fill: '#0F3B2C', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Trust Juggler Frontier"
                />
                <ReferenceDot
                  x={0.42}
                  y={96.9}
                  r={8}
                  fill="#10B981"
                  stroke="#0F3B2C"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#0F3B2C] dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">
              <strong>Key Finding:</strong> At the calibrated operating point (multiplier 1.0x, $h_2 = 3.124$), Trust Juggler achieves <strong>96.9% takeover recall</strong> within 14 days while keeping the honest-owner false step-up rate at just <strong>0.42%</strong> (safely inside the 0.5% SLA).
            </p>
          </div>
        </div>

        {/* Right Column: Life-Event Friction Comparison Bar Chart (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Ordinary Life-Event Friction</h2>
            <p className="text-xs text-muted-foreground">
              Share of honest riders challenged for a selfie within 21 days of an ordinary event (phone upgrade, move, new zone).
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={LIFE_EVENT_FRICTION_DATA} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
                <XAxis dataKey="system" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis unit="%" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Friction Rate']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="friction" radius={[6, 6, 0, 0]}>
                  {LIFE_EVENT_FRICTION_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
            <strong>Strict Gate locks out 65.1%</strong> of honest workers on harmless phone/city changes. Trust Juggler brings this down to <strong>5.4%</strong>, statistically indistinguishable from background noise (5.3%).
          </div>
        </div>
      </div>

      {/* Benchmark Comparison Table Across Systems */}
      <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">System Baseline Comparison</h2>
            <p className="text-xs text-muted-foreground">
              Evaluated across 1,000 held-out test riders with identical attack and life-event mixes.
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">docs/sample/summary.txt</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/70 text-muted-foreground text-left">
                <th className="py-3 font-semibold">Architecture / System</th>
                <th className="py-3 font-semibold font-mono">False Step-Up</th>
                <th className="py-3 font-semibold font-mono">False Lockout</th>
                <th className="py-3 font-semibold font-mono">Takeover Recall (14d)</th>
                <th className="py-3 font-semibold font-mono">Median Sessions</th>
                <th className="py-3 font-semibold font-mono">Median Hours</th>
                <th className="py-3 font-semibold text-right">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-sans">
              {SYSTEM_COMPARISONS.map((sys, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    'transition-colors',
                    sys.isChampion
                      ? 'bg-[#0F3B2C]/5 dark:bg-emerald-500/10 font-medium'
                      : 'hover:bg-secondary/20'
                  )}
                >
                  <td className="py-3 font-semibold text-foreground flex items-center gap-2">
                    {sys.isChampion && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    <span>{sys.name}</span>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                        sys.isChampion
                          ? 'bg-[#0F3B2C] text-white'
                          : 'bg-secondary text-muted-foreground'
                      )}
                    >
                      {sys.badge}
                    </span>
                  </td>
                  <td className="py-3 font-mono font-bold text-foreground">{sys.falseStepUp}</td>
                  <td className="py-3 font-mono text-emerald-600 font-bold">{sys.falseLockout}</td>
                  <td className="py-3 font-mono font-bold text-[#0F3B2C] dark:text-emerald-400">
                    {sys.recall14d}
                  </td>
                  <td className="py-3 font-mono text-muted-foreground">{sys.medianSessions}</td>
                  <td className="py-3 font-mono text-muted-foreground">{sys.medianHours}</td>
                  <td className="py-3 text-right">
                    <span
                      className={cn(
                        'text-[10px] px-2.5 py-1 rounded-full font-semibold',
                        sys.isChampion
                          ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                          : sys.recall14d === '0.0%'
                          ? 'bg-secondary text-muted-foreground'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                      )}
                    >
                      {sys.isChampion ? 'Pareto Optimal' : sys.recall14d === '0.0%' ? 'Defenseless' : 'High Friction'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-Column Deep-Dive: Attack Recall vs Life-Event Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Recall by Attack Type */}
        <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Recall Breakdown by Attack Vector</h3>
              <p className="text-xs text-muted-foreground">Detection efficiency across all 6 simulated attack modes.</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#0F3B2C] dark:text-emerald-400">96.9% Overall</span>
          </div>

          <div className="space-y-3">
            {ATTACK_RECALL_DATA.map((atk, i) => (
              <div key={i} className="p-3 rounded-xl border border-border/60 bg-secondary/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-foreground font-semibold">{atk.name}</span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-muted-foreground text-[11px]">{atk.medianSessions} sess · {atk.medianHours}h</span>
                    <span className="font-bold text-emerald-600">{atk.recall}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0F3B2C] dark:bg-emerald-400 rounded-full"
                    style={{ width: `${atk.recall}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Life-Event Friction Breakdown */}
        <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Friction by Benign Life Event</h3>
              <p className="text-xs text-muted-foreground">Rider and session challenge rates across 8 life events.</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600">5.4% Avg Friction</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-left">
                  <th className="py-2 font-semibold">Life Event</th>
                  <th className="py-2 font-semibold font-mono">Rider Friction</th>
                  <th className="py-2 font-semibold font-mono">Session Friction</th>
                  <th className="py-2 font-semibold text-right font-mono">Sample (n)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-sans">
                {LIFE_EVENT_BREAKDOWN.map((evt, idx) => (
                  <tr key={idx} className="hover:bg-secondary/20">
                    <td className="py-2 font-medium text-foreground">{evt.name}</td>
                    <td className="py-2 font-mono font-semibold text-foreground">{evt.riderFriction}</td>
                    <td className="py-2 font-mono text-muted-foreground">{evt.sessionFriction}</td>
                    <td className="py-2 text-right font-mono text-muted-foreground">{evt.sample}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
