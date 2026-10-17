import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/hooks/useTheme'
import { AppLayout } from '@/components/layout/AppLayout'
import { LiveCommandCenter } from '@/pages/LiveCommandCenter'
import { LandingPage } from '@/pages/LandingPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

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

            <Route
              path="/riders"
              element={
                <PlaceholderPage
                  title="Riders Investigation"
                  subtitle="Detailed drilldown into individual rider longitudinal profiles, historical baseline distributions, and multi-session evidence trajectory."
                  phase="Phase 2 Implementation"
                  features={[
                    'Historical baseline comparison (30-day kernel density)',
                    'Session timeline with graduated action triggers',
                    'Context change log (hardware, carrier, IP, zones)',
                    'Rider manual override & whitelist management',
                  ]}
                />
              }
            />
            <Route
              path="/simulation"
              element={
                <PlaceholderPage
                  title="Interactive Simulation Lab"
                  subtitle="Test the decoupled engine with synthetic scenarios: genuine hardware upgrades, physical phone handoffs, account takeover scripts, and zone migrations."
                  phase="Phase 3 Implementation"
                  features={[
                    'Scenario 1: Benign hardware change (New phone, identical habits)',
                    'Scenario 2: Physical handoff (Same phone, altered swipe & latency)',
                    'Scenario 3: Synthetic takeover & proxy hopping',
                    'Interactive threshold calibration sliders (Context vs Habit)',
                  ]}
                />
              }
            />
            <Route
              path="/analytics"
              element={
                <PlaceholderPage
                  title="Trade-off Analytics (Pareto Frontier)"
                  subtitle="Quantify the trade-off between honest worker friction (false positive step-up rate) and fraud detection efficacy."
                  phase="Phase 4 Implementation"
                  features={[
                    'ROC / Precision-Recall curve visualizations',
                    'Worker friction index by delivery zone',
                    'Detection latency distribution (< 50ms requirement)',
                    'Calibrated threshold sensitivity analysis',
                  ]}
                />
              }
            />
            <Route
              path="/review-queue"
              element={
                <PlaceholderPage
                  title="Manual Fraud Review Queue"
                  subtitle="Operational workbench for Level 3 (L3) escalated sessions requiring human investigator adjudication before account suspension."
                  phase="Phase 5 Implementation"
                  features={[
                    'Priority queue sorted by accumulated evidence score',
                    'Side-by-side biometric photo verification preview',
                    'One-click actions: Clear, Step-up challenge, Suspend (L4)',
                    'Audit trail export & incident notes',
                  ]}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
