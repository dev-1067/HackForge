import React from 'react'
import { BarChart3, ClipboardList, FlaskConical, History, LayoutDashboard, Settings, Users } from 'lucide-react'
import { useOps } from '@/components/app/OpsContext'
import { NavSidebar, type NavGroup } from './NavSidebar'

/** Navigation for the company operations team. */
export const Sidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { summary } = useOps()
  const waiting = (summary?.open_cases ?? 0) + (summary?.open_requests ?? 0)
  const groups: NavGroup[] = [
    {
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/review-queue', label: 'Needs review', icon: ClipboardList, count: waiting },
        { to: '/riders', label: 'Riders', icon: Users },
        { to: '/audit', label: 'History', icon: History },
      ],
    },
    {
      heading: 'Explore',
      items: [
        { to: '/simulation', label: 'Demo lab', icon: FlaskConical },
        { to: '/analytics', label: 'How it compares', icon: BarChart3 },
      ],
    },
    { items: [{ to: '/settings', label: 'Settings', icon: Settings }] },
  ]
  return <NavSidebar groups={groups} label="Main" onNavigate={onNavigate} />
}
