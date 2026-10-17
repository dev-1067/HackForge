import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/hooks/useTheme'
import { AppLayout } from '@/components/layout/AppLayout'
import { LiveCommandCenter } from '@/pages/LiveCommandCenter'
import { LandingPage } from '@/pages/LandingPage'
import { RidersInvestigationPage } from '@/pages/RidersInvestigationPage'
import { SimulationLabPage } from '@/pages/SimulationLabPage'
import { TradeoffAnalyticsPage } from '@/pages/TradeoffAnalyticsPage'
import { ReviewQueuePage } from '@/pages/ReviewQueuePage'
import { AuditLogPage } from '@/pages/AuditLogPage'

export function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isStreaming, setIsStreaming] = useState(true)
  const [triggerTick, setTriggerTick] = useState(0)

  const handleManualTick = () => {
    setTriggerTick((prev) => prev + 1)
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Product Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Operations Console Layout */}
          <Route
            element={
              <AppLayout
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isStreaming={isStreaming}
                onToggleStreaming={() => setIsStreaming(!isStreaming)}
                onManualTick={handleManualTick}
              />
            }
          >
            <Route
              path="/dashboard"
              element={
                <LiveCommandCenter
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  isStreaming={isStreaming}
                  triggerTick={triggerTick}
                />
              }
            />
            {/* Alias /live to /dashboard */}
            <Route path="/live" element={<Navigate to="/dashboard" replace />} />

            {/* Rider Profiles & Investigation Dossier */}
            <Route path="/riders" element={<RidersInvestigationPage />} />
            <Route path="/investigate" element={<Navigate to="/riders" replace />} />

            {/* Interactive Simulation Lab */}
            <Route path="/simulation" element={<SimulationLabPage />} />
            <Route path="/lab" element={<Navigate to="/simulation" replace />} />

            {/* Trade-off Analytics (Pareto Frontier) */}
            <Route path="/analytics" element={<TradeoffAnalyticsPage />} />
            <Route path="/tradeoff" element={<Navigate to="/analytics" replace />} />

            {/* Fraud Adjudication Review Queue */}
            <Route path="/review-queue" element={<ReviewQueuePage />} />
            <Route path="/queue" element={<Navigate to="/review-queue" replace />} />

            {/* Immutable Audit Trail Log */}
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="/audit-trail" element={<Navigate to="/audit" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
