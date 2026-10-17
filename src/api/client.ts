import { KpiSummary, SessionRecord, ChartDataPoint, DecisionLevel, LiveAlert } from '@/types'
import {
  INITIAL_KPI_SUMMARY,
  SEED_SESSIONS,
  SEED_CHART_TIMELINE,
  INITIAL_ALERTS,
  generateSimulatedSession,
} from '@/data/mockData'

export interface MetricsSummaryResponse {
  data: KpiSummary
  source: 'mock' | 'fastapi'
}

export interface DecisionsQuery {
  level?: DecisionLevel
  limit?: number
  search?: string
}

export interface TimelineQuery {
  riderId: string
  windowMinutes?: number
}

export interface ApiClientInterface {
  getMetricsSummary(): Promise<KpiSummary>
  getDecisions(params?: DecisionsQuery): Promise<SessionRecord[]>
  getLiveAlerts(): Promise<LiveAlert[]>
  getRider(id: string): Promise<SessionRecord | null>
  getRiderTimeline(id: string): Promise<ChartDataPoint[]>
  getMetricsCompare(): Promise<{ baseline: Record<string, number>; current: Record<string, number> }>
  subscribeStream(onEvent: (session: SessionRecord) => void): () => void
}

/**
 * Trust Juggler API Client
 * Designed to seamlessly switch between local deterministic mock data
 * and the production Python FastAPI service (e.g. http://localhost:8000)
 */
class ApiClient implements ApiClientInterface {
  private baseUrl: string
  private isMockMode: boolean = true

  constructor() {
    this.baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'
  }

  public setMockMode(enabled: boolean) {
    this.isMockMode = enabled
  }

  public getIsMockMode(): boolean {
    return this.isMockMode
  }

  public getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * GET /metrics/summary
   */
  async getMetricsSummary(): Promise<KpiSummary> {
    if (this.isMockMode) {
      return { ...INITIAL_KPI_SUMMARY, lastSyncTime: new Date().toISOString() }
    }

    try {
      const response = await fetch(`${this.baseUrl}/metrics/summary`, {
        signal: AbortSignal.timeout(3000),
      })
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      return await response.json()
    } catch {
      // Graceful fallback to mock if backend is not yet started
      return { ...INITIAL_KPI_SUMMARY, lastSyncTime: new Date().toISOString() }
    }
  }

  /**
   * GET /decisions?level=L2&limit=50
   */
  async getDecisions(params?: DecisionsQuery): Promise<SessionRecord[]> {
    if (this.isMockMode) {
      let results = [...SEED_SESSIONS]
      if (params?.level) {
        results = results.filter((s) => s.decision === params.level)
      }
      if (params?.search) {
        const q = params.search.toLowerCase()
        results = results.filter(
          (s) =>
            s.riderId.toLowerCase().includes(q) ||
            s.riderName.toLowerCase().includes(q) ||
            s.sessionId.toLowerCase().includes(q) ||
            s.context.city.toLowerCase().includes(q) ||
            s.context.zone.toLowerCase().includes(q)
        )
      }
      if (params?.limit) {
        results = results.slice(0, params.limit)
      }
      return results
    }

    try {
      const searchParams = new URLSearchParams()
      if (params?.level) searchParams.append('level', params.level)
      if (params?.limit) searchParams.append('limit', String(params.limit))
      if (params?.search) searchParams.append('search', params.search)

      const response = await fetch(`${this.baseUrl}/decisions?${searchParams.toString()}`, {
        signal: AbortSignal.timeout(3000),
      })
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      return await response.json()
    } catch {
      return SEED_SESSIONS
    }
  }

  /**
   * GET /alerts/live
   */
  async getLiveAlerts(): Promise<LiveAlert[]> {
    return INITIAL_ALERTS
  }

  /**
   * GET /riders/{id}
   */
  async getRider(id: string): Promise<SessionRecord | null> {
    const found = SEED_SESSIONS.find((s) => s.riderId === id)
    return found || null
  }

  /**
   * GET /riders/{id}/timeline
   */
  async getRiderTimeline(_id: string): Promise<ChartDataPoint[]> {
    return SEED_CHART_TIMELINE
  }

  /**
   * GET /metrics/compare
   */
  async getMetricsCompare(): Promise<{ baseline: Record<string, number>; current: Record<string, number> }> {
    return {
      baseline: {
        acceptanceLatencySec: 3.2,
        tapSwipeCadenceMs: 340,
        speedProfileZScore: 0.3,
        routeDeviation: 0.12,
      },
      current: {
        acceptanceLatencySec: 13.8,
        tapSwipeCadenceMs: 145,
        speedProfileZScore: 2.4,
        routeDeviation: 0.68,
      },
    }
  }

  /**
   * GET /stream (SSE or WebSocket subscription)
   * Falls back to a deterministic interval generator in mock mode
   */
  subscribeStream(onEvent: (session: SessionRecord) => void): () => void {
    if (this.isMockMode) {
      // Deterministic periodic simulation tick every 6 seconds
      const intervalId = setInterval(() => {
        const nextSession = generateSimulatedSession()
        onEvent(nextSession)
      }, 6000)

      return () => clearInterval(intervalId)
    }

    // Future SSE implementation for FastAPI endpoint:
    try {
      const eventSource = new EventSource(`${this.baseUrl}/stream`)
      eventSource.onmessage = (event) => {
        try {
          const session: SessionRecord = JSON.parse(event.data)
          onEvent(session)
        } catch (e) {
          console.error('Failed to parse SSE payload', e)
        }
      }
      return () => eventSource.close()
    } catch {
      return () => {}
    }
  }
}

export const apiClient = new ApiClient()
