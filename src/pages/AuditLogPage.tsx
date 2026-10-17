import React, { useState } from 'react'
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Ban,
  Clock,
  Download,
  ChevronDown,
  ChevronRight,
  User,
  Cpu,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditEvent {
  id: number
  timestamp: string
  riderId: string
  riderName: string
  actor: 'system' | 'reviewer:asha' | 'reviewer:tariq'
  actorType: 'autonomous_engine' | 'human_analyst'
  action: 'step_up_passed' | 'step_up_failed' | 'takeover_confirmed' | 'suspicion_dismissed' | 'baseline_reset' | 'level_escalated'
  details: {
    summary: string
    sessionId?: string
    decisionId?: number
    level?: string
    evidenceScore?: number
    threshold?: number
    note?: string
    rawJson?: any
  }
}

const INITIAL_AUDIT_LOGS: AuditEvent[] = [
  {
    id: 9104,
    timestamp: '2026-10-17 17:42:10',
    riderId: 'R00007',
    riderName: 'Marcus Chen',
    actor: 'reviewer:asha',
    actorType: 'human_analyst',
    action: 'takeover_confirmed',
    details: {
      summary: 'Confirmed unauthorized physical phone handover. Payouts locked and dispatched verification gate.',
      decisionId: 2601,
      sessionId: 'R00007-00039',
      level: 'L3 -> L4',
      evidenceScore: 4.12,
      threshold: 3.12,
      note: 'Kinetic swipe speeds deviate by -2.84σ across last 4 consecutive deliveries. Phone held by secondary person.',
      rawJson: {
        reviewer: 'asha',
        verdict: 'takeover_confirmed',
        action_taken: 'suspend_dispatch',
        timestamp: '2026-10-17T17:42:10Z',
      },
    },
  },
  {
    id: 9103,
    timestamp: '2026-10-17 17:35:45',
    riderId: 'R00245',
    riderName: 'Elena Rostova',
    actor: 'system',
    actorType: 'autonomous_engine',
    action: 'step_up_passed',
    details: {
      summary: 'Biometric selfie challenge completed with 99.4% confidence match. Device Samsung Galaxy S24 Ultra added to approved baseline.',
      sessionId: 'R00245-00181',
      level: 'L2 -> L0',
      evidenceScore: 0.38,
      threshold: 3.12,
      rawJson: {
        method: 'in_app_selfie_liveness',
        result: 'passed',
        liveness_score: 0.994,
        device_whitelisted: 'SM-S928B',
      },
    },
  },
  {
    id: 9102,
    timestamp: '2026-10-17 17:28:12',
    riderId: 'R01432',
    riderName: 'Tariq Al-Mansoor',
    actor: 'system',
    actorType: 'autonomous_engine',
    action: 'step_up_failed',
    details: {
      summary: 'Biometric step-up challenge expired after 240 seconds without camera feed. Evidence accumulator incremented.',
      sessionId: 'R01432-00074',
      level: 'L3 -> L4',
      evidenceScore: 8.95,
      threshold: 3.12,
      rawJson: {
        method: 'in_app_selfie_liveness',
        result: 'failed_timeout',
        attempts: 2,
        action: 'auto_suspend',
      },
    },
  },
  {
    id: 9101,
    timestamp: '2026-10-17 17:15:30',
    riderId: 'R01089',
    riderName: 'Asha Patel',
    actor: 'system',
    actorType: 'autonomous_engine',
    action: 'baseline_reset',
    details: {
      summary: 'Geographic baseline successfully adapted to Bengaluru metro after verified genuine relocation.',
      sessionId: 'R01089-00203',
      level: 'L0',
      evidenceScore: 0.29,
      threshold: 3.12,
      rawJson: {
        migration_origin: 'Pune (Z2)',
        migration_destination: 'Bengaluru (Z4)',
        motor_continuity: 0.985,
      },
    },
  },
  {
    id: 9100,
    timestamp: '2026-10-17 17:02:18',
    riderId: 'R00412',
    riderName: 'Devon Vance',
    actor: 'system',
    actorType: 'autonomous_engine',
    action: 'level_escalated',
    details: {
      summary: 'Accumulated evidence crossed L3 boundary (6.84 vs 3.12 threshold). Queued for human analyst adjudication.',
      decisionId: 2602,
      sessionId: 'R00412-00028',
      level: 'L2 -> L3',
      evidenceScore: 6.84,
      threshold: 3.12,
      rawJson: {
        drift_factor: 'timeshare_bimodal',
        consecutive_anomalies: 6,
        action_triggered: 'hold_payouts',
      },
    },
  },
  {
    id: 9099,
    timestamp: '2026-10-17 16:45:00',
    riderId: 'R00781',
    riderName: 'Vikram Joshi',
    actor: 'reviewer:tariq',
    actorType: 'human_analyst',
    action: 'suspicion_dismissed',
    details: {
      summary: 'Manual verification of fractured finger explaining altered swipe speed. Account restored to L0.',
      sessionId: 'R00781-00055',
      level: 'L2 -> L0',
      evidenceScore: 0.12,
      threshold: 3.12,
      note: 'Rider confirmed medical splint on right hand, accounting for prolonged touch latency.',
      rawJson: {
        reviewer: 'tariq',
        verdict: 'dismissed_medical',
        baseline_action: 'adapt_slowdown',
      },
    },
  },
]

export const AuditLogPage: React.FC = () => {
  const [logs] = useState<AuditEvent[]>(INITIAL_AUDIT_LOGS)
  const [searchQuery, setSearchQuery] = useState('')
  const [actorFilter, setActorFilter] = useState<'all' | 'system' | 'analyst'>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [downloadNotice, setDownloadNotice] = useState(false)

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.riderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.riderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase())

    if (actorFilter === 'system') return matchesSearch && log.actorType === 'autonomous_engine'
    if (actorFilter === 'analyst') return matchesSearch && log.actorType === 'human_analyst'
    return matchesSearch
  })

  const triggerExport = () => {
    setDownloadNotice(true)
    setTimeout(() => setDownloadNotice(false), 3000)
  }

  const getActionBadge = (action: AuditEvent['action']) => {
    switch (action) {
      case 'takeover_confirmed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 flex items-center gap-1">
            <Ban className="w-3 h-3" />
            <span>Takeover Confirmed (L4)</span>
          </span>
        )
      case 'step_up_passed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Step-Up Passed</span>
          </span>
        )
      case 'step_up_failed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Step-Up Failed</span>
          </span>
        )
      case 'suspicion_dismissed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Dismissed & Cleared</span>
          </span>
        )
      case 'baseline_reset':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Baseline Adapted</span>
          </span>
        )
      case 'level_escalated':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Level Escalated</span>
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Breadcrumb Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            <span>Operations Console</span>
            <span>/</span>
            <span className="text-[#0F3B2C] dark:text-emerald-400">System Governance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Audit Trail & Adjudication Log
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cryptographically sealed timeline of autonomous engine decisions, reviewer interventions, and step-up outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerExport}
            className="px-3.5 py-1.5 rounded-xl border border-border/70 bg-card hover:bg-secondary text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Audit</span>
          </button>
        </div>
      </div>

      {downloadNotice && (
        <div className="p-3 rounded-xl bg-[#0F3B2C] text-white text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>Audit trail snapshot generated (SHA256 signature verified). Downloading audit-log-2026-10-17.csv</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by rider ID, analyst, action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border/70 bg-secondary/30 text-xs focus:outline-none focus:ring-1 focus:ring-[#0F3B2C]"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {[
            { id: 'all', label: 'All Actors' },
            { id: 'system', label: 'System Autonomous' },
            { id: 'analyst', label: 'Human Analysts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActorFilter(tab.id as any)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                actorFilter === tab.id
                  ? 'bg-[#0F3B2C] text-white'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Entries Table / List */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border/70 flex items-center justify-between bg-secondary/20">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Ledger Entries ({filteredLogs.length})
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">PostgreSQL: audit_log</span>
        </div>

        <div className="divide-y divide-border/60">
          {filteredLogs.map((entry) => {
            const isExpanded = expandedId === entry.id
            return (
              <div key={entry.id} className="p-4 hover:bg-secondary/15 transition-colors space-y-2">
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  onClick={() => toggleExpand(entry.id)}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <button className="text-muted-foreground hover:text-foreground mt-0.5 sm:mt-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">#{entry.id}</span>
                        <span className="text-xs text-muted-foreground font-mono">{entry.timestamp}</span>
                        <span className="font-mono text-xs font-semibold text-foreground bg-secondary px-2 py-0.5 rounded">
                          {entry.riderId}
                        </span>
                        <span className="text-xs font-medium text-foreground">{entry.riderName}</span>
                      </div>
                      <p className="text-xs text-foreground/90 font-sans">{entry.details.summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pl-7 sm:pl-0">
                    {getActionBadge(entry.action)}
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      {entry.actorType === 'autonomous_engine' ? (
                        <Cpu className="w-3.5 h-3.5 text-[#0F3B2C] dark:text-emerald-400" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      <span>{entry.actor}</span>
                    </span>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="mt-3 pl-7 pt-3 border-t border-border/50 space-y-3 animate-in fade-in">
                    {entry.details.note && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                        <strong>Analyst Note:</strong> {entry.details.note}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      {entry.details.sessionId && (
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="text-[10px] text-muted-foreground block">Session ID</span>
                          <span className="font-semibold text-foreground">{entry.details.sessionId}</span>
                        </div>
                      )}
                      {entry.details.level && (
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="text-[10px] text-muted-foreground block">Level State</span>
                          <span className="font-semibold text-foreground">{entry.details.level}</span>
                        </div>
                      )}
                      {entry.details.evidenceScore !== undefined && (
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="text-[10px] text-muted-foreground block">Evidence Score</span>
                          <span className="font-semibold text-foreground">
                            {entry.details.evidenceScore} / {entry.details.threshold}
                          </span>
                        </div>
                      )}
                      {entry.details.decisionId && (
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <span className="text-[10px] text-muted-foreground block">Decision ID</span>
                          <span className="font-semibold text-foreground">#{entry.details.decisionId}</span>
                        </div>
                      )}
                    </div>

                    {entry.details.rawJson && (
                      <div className="rounded-xl bg-secondary/40 p-3 font-mono text-[11px] text-muted-foreground overflow-x-auto">
                        <pre>{JSON.stringify(entry.details.rawJson, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
