import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { OpsProvider, useOps } from '@/components/app/OpsContext'
import { Alert } from '@/components/ui/Alert'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

const TITLES: Array<[string, string]> = [
  ['/dashboard', 'Dashboard'],
  ['/review-queue', 'Needs review'],
  ['/riders', 'Riders'],
  ['/audit', 'History'],
  ['/simulation', 'Demo lab'],
  ['/analytics', 'How it compares'],
]

const Shell: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const { summaryError } = useOps()
  const title = TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'Dashboard'

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className="hidden lg:block"><Sidebar /></div>
      {menuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="relative"><Sidebar onNavigate={() => setMenuOpen(false)} />
            <button onClick={() => setMenuOpen(false)} className="absolute right-2 top-3 rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="Close menu">
              <X className="h-4 w-4" />
            </button>
          </div>
          <button className="flex-1 bg-black/40" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
        </div>
      )}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Header title={title} onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
          <div className="mx-auto max-w-6xl">
            {summaryError && <Alert tone="warning" className="mb-4">{summaryError}</Alert>}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export const AppLayout: React.FC = () => (
  <OpsProvider>
    <Shell />
  </OpsProvider>
)
