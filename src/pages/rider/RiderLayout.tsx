import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Activity, LifeBuoy, Settings, ShieldCheck } from 'lucide-react'
import { AppFrame } from '@/components/layout/AppFrame'
import { NavSidebar, type NavGroup } from '@/components/layout/NavSidebar'
import { Alert } from '@/components/ui/Alert'
import { RiderProvider, useRider } from './RiderContext'

const TITLES: Array<[string, string]> = [
  ['/rider/account', 'Account & Verification'],
  ['/rider/help', 'Help & Review'],
  ['/rider/settings', 'Settings'],
  ['/rider', 'Recent Activity'],
]

const Sidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { overview } = useRider()
  const groups: NavGroup[] = [{
    items: [
      { to: '/rider', label: 'Recent Activity', icon: Activity, end: true },
      { to: '/rider/account', label: 'Account & Verification', icon: ShieldCheck, attention: overview?.account.action_required },
      { to: '/rider/help', label: 'Help & Review', icon: LifeBuoy },
      { to: '/rider/settings', label: 'Settings', icon: Settings },
    ],
  }]
  return <NavSidebar groups={groups} label="Partner menu" onNavigate={onNavigate} />
}

const Shell: React.FC = () => {
  const { pathname } = useLocation()
  const { error } = useRider()
  const title = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))?.[1] ?? 'Recent Activity'
  return (
    <AppFrame title={title} sidebar={(close) => <Sidebar onNavigate={close} />}>
      {error && <Alert tone="warning" className="mb-4">{error}</Alert>}
      <Outlet />
    </AppFrame>
  )
}

/** The delivery partner portal: its own sidebar and pages, nothing from the company dashboard. */
export const RiderLayout: React.FC = () => (
  <RiderProvider>
    <Shell />
  </RiderProvider>
)
