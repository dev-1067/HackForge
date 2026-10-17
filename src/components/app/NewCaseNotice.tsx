import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useOps } from './OpsContext'

/** A quiet bar that appears when a new case is waiting, so a reviewer on another page does not miss it. */
export const NewCaseNotice: React.FC = () => {
  const { summary } = useOps()
  const { pathname } = useLocation()
  const previous = useRef<number | null>(null)
  const [fresh, setFresh] = useState(0)
  const open = summary?.open_cases ?? null

  useEffect(() => {
    if (open === null) return
    if (previous.current !== null && open > previous.current) setFresh((n) => n + (open - (previous.current ?? 0)))
    previous.current = open
  }, [open])

  useEffect(() => { if (pathname.startsWith('/review-queue')) setFresh(0) }, [pathname])
  if (fresh === 0 || pathname.startsWith('/review-queue')) return null
  return (
    <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-app-sm text-foreground">
      <span>{fresh === 1 ? 'A new case is waiting for review.' : `${fresh} new cases are waiting for review.`}</span>
      <span className="flex items-center gap-2">
        <Link to="/review-queue" className="font-medium underline underline-offset-2">Open Needs review</Link>
        <button type="button" onClick={() => setFresh(0)} aria-label="Dismiss" className="rounded p-1 text-muted-foreground hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </span>
    </div>
  )
}
