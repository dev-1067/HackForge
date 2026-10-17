import React from 'react'
import { SecurityPanels } from '@/pages/shared/SecurityPanels'

/** Password, where you are signed in and your sign-in history. */
export const SecurityPage: React.FC = () => (
  <div className="space-y-4">
    <p className="max-w-2xl text-app-sm text-muted-foreground">Keep your account yours. If you see a sign-in you do not recognise, change your password and sign out other sessions.</p>
    <SecurityPanels />
  </div>
)
