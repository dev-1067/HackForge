import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { KpiSummary, SessionRecord, DecisionLevel, LiveAlert } from '@/types'
import { apiClient } from '@/api/client'
import { KpiCard } from '@/components/ui/KpiCard'
import { LiveSessionTable } from '@/components/dashboard/LiveSessionTable'
import { LiveAlertPanel } from '@/components/dashboard/LiveAlertPanel'
import { SessionDetailDrawer } from '@/components/dashboard/SessionDetailDrawer'
import { QuickFilters } from '@/components/dashboard/QuickFilters'
import { DeviationEvidenceChart } from '@/components/charts/DeviationEvidenceChart'
import { SEED_CHART_TIMELINE, generateSimulatedSession } from '@/data/mockData'
import {
  Activity,
  AlertTriangle,
  Users,
  ShieldCheck,
} from 'lucide-react'

interface LiveCommandCenterProps {
  searchQuery: string
  onSearchChange: (val: string) => void
  isStreaming: boolean
  triggerTick: number
}

export const LiveCommandCenter: React.FC<LiveCommandCenterProps> = ({
  searchQuery,
  onSearchChange,
  isStreaming,
  triggerTick,
}) => {
  const [kpi, setKpi] = useState<KpiSummary | null>(null)
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [alerts, setAlerts] = useState<LiveAlert[]>([])
  const [selectedLevel, setSelectedLevel] = useState<DecisionLevel | 'ALL'>('ALL')
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null)
  const [chartData, setChartData] = useState(SEED_CHART_TIMELINE)

  // Initial load
  useEffect(() => {
    async function initData() {
      const [kpiData, sessionsData, alertsData] = await Promise.all([
        apiClient.getMetricsSummary(),
        apiClient.getDecisions(),
        apiClient.getLiveAlerts(),
      ])
      setKpi(kpiData)
      setSessions(sessionsData)
      setAlerts(alertsData)
    }
    initData()
  }, [])

  // Core session ingestion handler: used by both live timer and manual tick
  const handleIncomingSession = useCallback((newSession: SessionRecord) => {
    // 1. Prepend to recent sessions (keep last 50)
    setSessions((prev) => [newSession, ...prev.slice(0, 49)])

    // 2. Update KPI metrics
    setKpi((prev) =>
      prev
        ? {
            ...prev,
            sessionsProcessed: prev.sessionsProcessed + 1,
            lastSyncTime: new Date().toISOString(),
            activeAlerts:
              newSession.decision === 'L3' || newSession.decision === 'L4'
                ? prev.activeAlerts + 1
                : prev.activeAlerts,
          }
        : null
    )

    // 3. If elevated or acute risk, push to Live Alerts feed
    if (newSession.decision === 'L2' || newSession.decision === 'L3' || newSession.decision === 'L4') {
      const newAlert: LiveAlert = {
        id: `alt_${Date.now()}`,
        sessionId: newSession.sessionId,
        riderId: newSession.riderId,
        riderName: newSession.riderName,
        timestamp: newSession.timestamp,
        decision: newSession.decision,
        riskLevel: newSession.riskLevel,
        title:
          newSession.decision === 'L4'
            ? 'Acute Collision / Takeover Detected'
            : newSession.decision === 'L3'
            ? 'Multi-Session Handoff Escalation'
            : 'Graduated Step-Up Challenge',
        summary: newSession.explanation,
        reasons: newSession.evidenceFactors,
        habitDeviation: newSession.habitDeviationScore,
        contextNovelty: newSession.contextNoveltyScore,
        evidenceScore: newSession.evidenceScore,
      }
      setAlerts((prev) => [newAlert, ...prev.slice(0, 9)])
    }

    // 4. Append to chart timeline
    setChartData((prev) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const nextPoint = {
        time: timeStr,
        timestamp: Date.now(),
        habitDeviation: newSession.habitDeviationScore,
        evidenceAccumulated: newSession.evidenceScore,
        baseline: 0.2,
        decisionLevel: newSession.decision,
        sessionId: newSession.sessionId,
      }
      return [...prev.slice(1), nextPoint]
    })
  }, [])

  // Listen to live stream subscription
  useEffect(() => {
    if (!isStreaming) return

    const unsubscribe = apiClient.subscribeStream((newSession) => {
      handleIncomingSession(newSession)
    })

    return () => unsubscribe()
  }, [isStreaming, handleIncomingSession])

  // Handle manual trigger tick button
  useEffect(() => {
    if (triggerTick === 0) return
    const simulatedEvent = generateSimulatedSession()
    handleIncomingSession(simulatedEvent)
  }, [triggerTick, handleIncomingSession])

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesLevel = selectedLevel === 'ALL' || s.decision === selectedLevel
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        s.riderId.toLowerCase().includes(q) ||
        s.riderName.toLowerCase().includes(q) ||
        s.sessionId.toLowerCase().includes(q) ||
        s.context.city.toLowerCase().includes(q) ||
        s.context.zone.toLowerCase().includes(q) ||
        s.context.deviceModel.toLowerCase().includes(q)
      return matchesLevel && matchesSearch
    })
  }, [sessions, selectedLevel, searchQuery])

  const handleSelectAlertSession = (sessionId: string) => {
    const found = sessions.find((s) => s.sessionId === sessionId)
    if (found) {
      setActiveSession(found)
    }
  }

  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Page Heading & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
            Operations Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Continuous identity verification, kinetic habit monitoring, and account handoff detection across active fleet dispatches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 border border-border text-[11px] font-medium text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Fleet Feed Connected
          </span>
        </div>
      </div>

      {/* KPI Stat Cards Grid (CoLuxe Style: Featured Dark Green Card + Clean White Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Sessions Evaluated"
          value={kpi?.sessionsProcessed ?? 48924}
          change={kpi?.sessionsChange24h ?? 12.4}
          icon={<Activity className="w-5 h-5 text-white" />}
          variant="featured"
        />
        <KpiCard
          title="Review Queue Cases"
          value={kpi?.activeAlerts ?? 19}
          change={kpi?.alertsChange24h ?? -4.2}
          icon={<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          variant="alert"
        />
        <KpiCard
          title="Monitored Profiles"
          value={kpi?.accountsUnderWatch ?? 168}
          change={kpi?.watchChange24h ?? 3.1}
          icon={<Users className="w-5 h-5 text-muted-foreground" />}
          variant="warning"
        />
        <KpiCard
          title="Step-up Verification Rate"
          value={`${kpi?.stepUpRatePercent ?? 2.84}%`}
          change={kpi?.stepUpChange24h ?? -0.6}
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          variant="default"
          subtitle="Fleet threshold < 4.0%"
        />
      </div>

      {/* Upper Grid: Evidence vs Habit Timeline Chart + Decoupled Logic Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart Container */}
        <div className="lg:col-span-2 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Kinetic Habit Drift & Evidence Accumulation
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Instant habit divergence plotted against multi-session accumulated risk score. Step-up trigger calibrated at 0.60.
              </p>
            </div>
            <span className="text-[11px] bg-secondary/80 border border-border/70 px-2.5 py-0.5 rounded-full text-muted-foreground hidden sm:inline font-medium">
              Window: 60 min
            </span>
          </div>

          <DeviationEvidenceChart data={chartData} height={210} className="mt-2" />
        </div>

        {/* Core Logic Explainer Card */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                Decision Escalation Rules
              </h3>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">RULESET</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Distinguishing benign life events from unauthorized account sharing.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-emerald-800 dark:text-emerald-300 font-bold">L0 Verified (Allow)</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">New phone / location + Habit steady</span>
              </div>
              <span className="text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">Life Event</span>
            </div>

            <div className="p-2.5 rounded-xl bg-secondary/70 border border-border/70 flex items-center justify-between">
              <div>
                <span className="text-foreground font-bold">L1 Observation (Watch)</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Mild location novelty + Normal cadence</span>
              </div>
              <span className="text-muted-foreground text-[11px] font-medium">Passive</span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div>
                <span className="text-amber-800 dark:text-amber-300 font-bold">L2 Step-Up (Challenge)</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Same phone + Habit shifted &gt; 50%</span>
              </div>
              <span className="text-amber-700 dark:text-amber-400 text-[11px] font-semibold">Handoff Risk</span>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
              <div>
                <span className="text-rose-800 dark:text-rose-300 font-bold">L3 Escalated (Review)</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Evidence accumulated across 4+ sessions</span>
              </div>
              <span className="text-rose-700 dark:text-rose-400 text-[11px] font-semibold">Analyst Queue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bottom Section: Live Activity Table & Live Alerts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Session Activity Table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Active Session Stream
              </h2>
              <p className="text-xs text-muted-foreground">
                Continuous scoring of real-time dispatch orders across delivery fleet.
              </p>
            </div>
          </div>

          <QuickFilters
            selectedLevel={selectedLevel}
            onSelectLevel={setSelectedLevel}
            search={searchQuery}
            onSearchChange={onSearchChange}
            totalCount={sessions.length}
            filteredCount={filteredSessions.length}
          />

          <LiveSessionTable
            sessions={filteredSessions}
            onSelectSession={(session) => setActiveSession(session)}
            selectedSessionId={activeSession?.id}
          />
        </div>

        {/* Right Column: Live Active Alerts Panel */}
        <div className="lg:col-span-1">
          <LiveAlertPanel
            alerts={alerts}
            onSelectAlertSession={handleSelectAlertSession}
            onDismissAlert={handleDismissAlert}
          />
        </div>
      </div>

      {/* Detail Inspection Drawer */}
      <SessionDetailDrawer
        session={activeSession}
        onClose={() => setActiveSession(null)}
      />
    </div>
  )
}
