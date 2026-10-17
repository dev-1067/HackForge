import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { rider } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthContext'
import { Panel } from '@/components/app/Panel'
import { Segmented } from '@/components/app/Segmented'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { SecurityPanels } from './SecurityPanels'
import { TEXT_SIZES, usePreferences } from '@/hooks/usePreferences'
import { useTheme } from '@/hooks/useTheme'

export const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { textSize, setTextSize } = usePreferences()
  const [busy, setBusy] = useState('')
  const [exportError, setExportError] = useState('')
  const isRider = user?.role === 'rider'

  async function download() {
    setBusy('export'); setExportError('')
    try {
      const data = await rider.exportData()
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'trust-juggler-my-data.json'
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) { setExportError((e as Error).message) } finally { setBusy('') }
  }

  return (
    <div className="space-y-4">
      <Panel title="Appearance">
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-app-sm font-medium text-foreground">Theme</p>
            <Segmented label="Theme" value={theme} onChange={setTheme}
              options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
          </div>
          <div>
            <p className="mb-1.5 text-app-sm font-medium text-foreground">Text size</p>
            <Segmented label="Text size" value={textSize} onChange={setTextSize} options={TEXT_SIZES} />
            <p className="mt-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-app-sm text-foreground">
              This is how text looks at the size you chose. Your choice is saved on this device.
            </p>
          </div>
        </div>
      </Panel>

      {isRider ? (
        <Panel title="Security">
          <p className="text-app-sm text-muted-foreground">Change your password, see where you are signed in and review your sign-in history.</p>
          <Link to="/rider/security" className="mt-3 inline-flex rounded-lg border border-border px-4 py-2 text-app-sm font-medium text-foreground hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open Security</Link>
        </Panel>
      ) : <SecurityPanels />}

      {isRider && (
        <Panel title="Privacy">
          <p className="text-app-sm text-muted-foreground">
            We keep your name, mobile number, the phones seen on your account, your sign-ins and your requests. We do not follow your location continuously,
            and we do not collect identity documents or photos.
          </p>
          {exportError && <Alert tone="error" className="mt-3">{exportError}</Alert>}
          <Button variant="secondary" className="mt-3" loading={busy === 'export'} onClick={() => void download()}>Download my data</Button>
        </Panel>
      )}

      <Panel title="Account">
        <p className="text-app-sm text-muted-foreground">Signed in as <span className="font-medium text-foreground">{user?.name}</span>.</p>
        <Button variant="secondary" className="mt-3" loading={busy === 'out'} onClick={() => { setBusy('out'); void signOut().finally(() => setBusy('')) }}>Sign out</Button>
      </Panel>
    </div>
  )
}
