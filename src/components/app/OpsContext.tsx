import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ops, openStream } from '@/api/endpoints'
import type { Decision, MetricsSummary } from '@/types/api'

const RECENT_LIMIT = 60
const FALLBACK_POLL_MS = 15000

interface OpsValue {
  summary: MetricsSummary | null
  summaryError: string
  recent: Decision[]
  live: boolean
  /** Increases whenever something changed on the server (review, step-up, lab action). */
  changeTick: number
  refresh: () => void
}

const OpsContext = createContext<OpsValue | undefined>(undefined)

/** One live connection and one set of headline numbers, shared by every operations page. */
export const OpsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [summaryError, setSummaryError] = useState('')
  const [recent, setRecent] = useState<Decision[]>([])
  const [live, setLive] = useState(false)
  const [changeTick, setChangeTick] = useState(0)
  const timer = useRef<number | null>(null)

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await ops.summary())
      setSummaryError('')
    } catch (error) {
      setSummaryError((error as Error).message)
    }
  }, [])

  const loadRecent = useCallback(async () => {
    try {
      setRecent(await ops.decisions({ limit: RECENT_LIMIT }))
    } catch {
      /* the summary error already tells the user the server is unreachable */
    }
  }, [])

  const refresh = useCallback(() => {
    void loadSummary()
    void loadRecent()
    setChangeTick((t) => t + 1)
  }, [loadSummary, loadRecent])

  // throttle bursts of events into one refresh of the headline numbers
  const scheduleSummary = useCallback(() => {
    if (timer.current !== null) return
    timer.current = window.setTimeout(() => {
      timer.current = null
      void loadSummary()
    }, 800)
  }, [loadSummary])

  useEffect(() => {
    void loadSummary()
    void loadRecent()
    const close = openStream({
      onStatus: setLive,
      onDecision: (decision) => {
        setRecent((prev) => [decision, ...prev.filter((d) => d.decision_id !== decision.decision_id)].slice(0, RECENT_LIMIT))
        scheduleSummary()
        if (decision.level !== 'L0' && decision.level !== 'L1') setChangeTick((t) => t + 1)
      },
      onEvent: () => {
        scheduleSummary()
        setChangeTick((t) => t + 1)
      },
    })
    return () => {
      close()
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [loadSummary, loadRecent, scheduleSummary])

  // When the live connection is down, fall back to polling so the page never goes stale.
  useEffect(() => {
    if (live) return
    const id = window.setInterval(() => { void loadSummary(); void loadRecent() }, FALLBACK_POLL_MS)
    return () => window.clearInterval(id)
  }, [live, loadSummary, loadRecent])

  const value = useMemo(() => ({ summary, summaryError, recent, live, changeTick, refresh }),
    [summary, summaryError, recent, live, changeTick, refresh])
  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOps(): OpsValue {
  const ctx = useContext(OpsContext)
  if (!ctx) throw new Error('useOps must be used within an OpsProvider')
  return ctx
}
