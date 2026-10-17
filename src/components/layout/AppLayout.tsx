import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface AppLayoutProps {
  searchQuery: string
  onSearchChange: (val: string) => void
  isStreaming: boolean
  onToggleStreaming: () => void
  onManualTick: () => void
  lastSyncTime?: string
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  searchQuery,
  onSearchChange,
  isStreaming,
  onToggleStreaming,
  onManualTick,
  lastSyncTime,
}) => {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Live Command Center'
      case '/riders':
        return 'Rider Investigation'
      case '/simulation':
        return 'Interactive Simulation Lab'
      case '/analytics':
        return 'Trade-off Analytics (Pareto Frontier)'
      case '/review-queue':
        return 'Manual Fraud Review Queue'
      default:
        return 'Operations Console'
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          isStreaming={isStreaming}
          onToggleStreaming={onToggleStreaming}
          onManualTick={onManualTick}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          title={getPageTitle()}
          lastSyncTime={lastSyncTime}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
