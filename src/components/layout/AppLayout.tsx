import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { OpsProvider, useOps } from '@/components/app/OpsContext'
import { Alert } from '@/components/ui/Alert'
import { cn } from '@/lib/utils'
import { AppFrame } from './AppFrame'
import { Sidebar } from './Sidebar'

const TITLES: Array<[string, string]> = [
  ['/dashboard', 'Dashboard'],
  ['/review-queue', 'Needs review'],
  ['/riders', 'Riders'],
  ['/sessions', 'Sessions'],
  ['/audit', 'History'],
  ['/simulation', 'Demo lab'],
  ['/analytics', 'How it compares'],
  ['/settings', 'Settings'],
]

const Shell: React.FC = () => {
  const { pathname } = useLocation()
  const { summaryError, live } = useOps()
  const title = TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'Dashboard'
  const status = (
    <span className="hidden items-center gap-1.5 text-app-13 text-muted-foreground sm:inline-flex" aria-live="polite">
      <span className={cn('h-2 w-2 rounded-full', live ? 'bg-emerald-500' : 'bg-amber-500')} aria-hidden="true" />
      {live ? 'Live' : 'Reconnecting'}
    </span>
  )
  return (
    <AppFrame title={title} status={status} sidebar={(close) => <Sidebar onNavigate={close} />}>
      {summaryError && <Alert tone="warning" className="mb-4">{summaryError}</Alert>}
      <Outlet />
    </AppFrame>
  )
}

export const AppLayout: React.FC = () => (
  <OpsProvider>
    <Shell />
  </OpsProvider>
)
