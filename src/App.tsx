import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@/hooks/useTheme'
import { AuthProvider } from '@/auth/AuthContext'
import { RequireRole } from '@/auth/RequireRole'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { ChooseRole } from '@/pages/auth/ChooseRole'
import { CompanyLogin } from '@/pages/auth/CompanyLogin'
import { CompanyRegister } from '@/pages/auth/CompanyRegister'
import { RiderLogin } from '@/pages/auth/RiderLogin'
import { RiderRegister } from '@/pages/auth/RiderRegister'
import { ComparePage } from '@/pages/company/ComparePage'
import { DashboardPage } from '@/pages/company/DashboardPage'
import { DemoLabPage } from '@/pages/company/DemoLabPage'
import { HistoryPage } from '@/pages/company/HistoryPage'
import { NeedsReviewPage } from '@/pages/company/NeedsReviewPage'
import { RiderDetailPage } from '@/pages/company/RiderDetailPage'
import { RidersPage } from '@/pages/company/RidersPage'
import { RiderHome } from '@/pages/rider/RiderHome'

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<ChooseRole />} />
            <Route path="/rider/login" element={<RiderLogin />} />
            <Route path="/rider/register" element={<RiderRegister />} />
            <Route path="/company/login" element={<CompanyLogin />} />
            <Route path="/company/register" element={<CompanyRegister />} />

            {/* Delivery rider */}
            <Route path="/rider" element={<RequireRole role="rider"><RiderHome /></RequireRole>} />

            {/* Company operations */}
            <Route element={<RequireRole role="company"><AppLayout /></RequireRole>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/review-queue" element={<NeedsReviewPage />} />
              <Route path="/riders" element={<RidersPage />} />
              <Route path="/riders/:riderId" element={<RiderDetailPage />} />
              <Route path="/audit" element={<HistoryPage />} />
              <Route path="/simulation" element={<DemoLabPage />} />
              <Route path="/analytics" element={<ComparePage />} />
            </Route>

            {/* Older links */}
            <Route path="/live" element={<Navigate to="/dashboard" replace />} />
            <Route path="/queue" element={<Navigate to="/review-queue" replace />} />
            <Route path="/investigate" element={<Navigate to="/riders" replace />} />
            <Route path="/lab" element={<Navigate to="/simulation" replace />} />
            <Route path="/tradeoff" element={<Navigate to="/analytics" replace />} />
            <Route path="/audit-trail" element={<Navigate to="/audit" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
