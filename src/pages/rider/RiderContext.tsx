import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { rider } from '@/api/endpoints'
import type { RiderOverview } from '@/types/api'

interface RiderValue {
  overview: RiderOverview | null
  error: string
  refresh: () => Promise<void>
  /** Bumps whenever the account changed, so open pages can reload. */
  version: number
}

const RiderContext = createContext<RiderValue | undefined>(undefined)

/** The rider's account status, shared by the sidebar and every portal page. */
export const RiderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overview, setOverview] = useState<RiderOverview | null>(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  const refresh = useCallback(async () => {
    try {
      setOverview(await rider.overview())
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
    setVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    void refresh()
    const again = () => { if (document.visibilityState === 'visible') void refresh() }
    const timer = window.setInterval(again, 30000)
    document.addEventListener('visibilitychange', again)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', again) }
  }, [refresh])

  const value = useMemo(() => ({ overview, error, refresh, version }), [overview, error, refresh, version])
  return <RiderContext.Provider value={value}>{children}</RiderContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRider(): RiderValue {
  const ctx = useContext(RiderContext)
  if (!ctx) throw new Error('useRider must be used within a RiderProvider')
  return ctx
}
