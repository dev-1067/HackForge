import React, { useState } from 'react'
import { rider } from '@/api/endpoints'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { useRider } from './RiderContext'

/** "Was this you?" with real answers. Shown wherever a verification is waiting. */
export const VerificationPrompt: React.FC<{ onAnswered?: () => void }> = ({ onAnswered }) => {
  const { refresh } = useRider()
  const [busy, setBusy] = useState<'yes' | 'no' | ''>('')
  const [error, setError] = useState('')

  async function answer(confirmed: boolean) {
    setBusy(confirmed ? 'yes' : 'no')
    setError('')
    try {
      await rider.verify(confirmed)
      await refresh()
      onAnswered?.()
    } catch (e) {
      setError((e as Error).message)
      await refresh()
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-app-sm font-medium text-foreground">Was this you?</p>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" loading={busy === 'yes'} disabled={busy !== ''} onClick={() => void answer(true)}>Yes, it was me</Button>
        <Button className="flex-1" variant="secondary" loading={busy === 'no'} disabled={busy !== ''} onClick={() => void answer(false)}>No, that was not me</Button>
      </div>
      <p className="text-app-13 text-muted-foreground">If it was not you, we will pause your payouts and a person will look into it.</p>
    </div>
  )
}
