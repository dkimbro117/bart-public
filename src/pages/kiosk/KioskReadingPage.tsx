import { useCallback, useEffect, useState } from 'react'
import ManualCheckInSearch from '../../components/checkin/ManualCheckInSearch'
import KioskCameraAlert from '../../components/kiosk/KioskCameraAlert'
import KioskMinutesPad from '../../components/kiosk/KioskMinutesPad'
import KioskQrScanner from '../../components/kiosk/KioskQrScanner'
import KioskScanPrompt from '../../components/kiosk/KioskScanPrompt'
import KioskSuccess from '../../components/kiosk/KioskSuccess'
import RosterCacheGate from '../../components/RosterCacheGate'
import Button from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { useSyncStatus } from '../../contexts/SyncContext'
import { useCameraAvailability } from '../../hooks/useCameraAvailability'
import { useKioskParticipants } from '../../hooks/useKioskParticipants'
import { useKioskPreviewMode } from '../../hooks/useKioskPreviewMode'
import { lookupParticipantByQrToken } from '../../lib/checkIn'
import { formatParticipantName } from '../../lib/format'
import type { Participant } from '../../lib/participants'
import {
  logReadingMinutes,
  parseReadingMinutesInput,
} from '../../lib/readingLogs'

type KioskReadingView =
  | { mode: 'scanning' }
  | { mode: 'minutes'; participant: Participant }
  | { mode: 'error'; message: string }
  | { mode: 'success'; participant: Participant; minutes: number }

export default function KioskReadingPage() {
  const { profile } = useAuth()
  const { selectedSessionId } = useSyncStatus()
  const isPreview = useKioskPreviewMode()
  const [view, setView] = useState<KioskReadingView>({ mode: 'scanning' })
  const [minutes, setMinutes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [scanKey, setScanKey] = useState(0)

  const scannerEnabled = !isPreview
  const {
    cameraState,
    cameraUnavailable,
    cameraChecking,
    cameraMessage,
    retryCameraProbe,
  } = useCameraAvailability(scannerEnabled)
  const manualLookupEnabled =
    isPreview || cameraUnavailable || Boolean(scannerError)
  const { participants, loading: participantsLoading, error: participantsError } =
    useKioskParticipants(manualLookupEnabled)

  const resetToScanner = useCallback(() => {
    setView({ mode: 'scanning' })
    setMinutes('')
    setSubmitting(false)
    setScannerError(null)
    setScanKey((key) => key + 1)
  }, [])

  const openMinutesForParticipant = useCallback((participant: Participant) => {
    setMinutes('')
    setView({ mode: 'minutes', participant })
  }, [])

  const handleScan = useCallback(
    async (qrToken: string) => {
      if (!selectedSessionId) {
        setView({
          mode: 'error',
          message: 'Ask a volunteer to pick a session first.',
        })
        return
      }

      try {
        const participant = await lookupParticipantByQrToken(qrToken)

        if (!participant) {
          setView({
            mode: 'error',
            message: 'Badge not recognized. Try scanning again.',
          })
          return
        }

        openMinutesForParticipant(participant)
      } catch (error) {
        setView({
          mode: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to look up that badge.',
        })
      }
    },
    [openMinutesForParticipant, selectedSessionId],
  )

  const handleConfirm = useCallback(async () => {
    if (view.mode !== 'minutes' || !selectedSessionId || !profile?.id) {
      return
    }

    const parsedMinutes = parseReadingMinutesInput(minutes)
    if (parsedMinutes === null) {
      setView({
        mode: 'error',
        message: 'Enter a whole number of minutes from 0 to 999.',
      })
      return
    }

    setSubmitting(true)

    try {
      await logReadingMinutes({
        participantId: view.participant.id,
        sessionId: selectedSessionId,
        staffId: profile.id,
        minutes: parsedMinutes,
        occurredAt: new Date().toISOString(),
      })

      setView({
        mode: 'success',
        participant: view.participant,
        minutes: parsedMinutes,
      })
    } catch (error) {
      setSubmitting(false)
      setView({
        mode: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to save reading minutes. Try again.',
      })
    }
  }, [minutes, profile?.id, selectedSessionId, view])

  useEffect(() => {
    if (view.mode === 'error') {
      const timer = window.setTimeout(resetToScanner, 3000)
      return () => window.clearTimeout(timer)
    }
  }, [resetToScanner, view.mode])

  const handleCameraError = useCallback((message: string) => {
    setScannerError(message)
  }, [])

  const handleRetryCamera = useCallback(() => {
    setScannerError(null)
    retryCameraProbe()
    setScanKey((key) => key + 1)
  }, [retryCameraProbe])

  const scannerVisible =
    view.mode === 'scanning' &&
    scannerEnabled &&
    cameraState === 'available' &&
    !scannerError

  return (
    <section className="space-y-6">
      {view.mode === 'scanning' && (
        <>
          <KioskScanPrompt
            prompt={
              isPreview
                ? 'Find your name to log reading'
                : manualLookupEnabled
                  ? 'Scan your badge or find your name'
                  : undefined
            }
          />

          {manualLookupEnabled && (
            <ManualCheckInSearch
              participants={participants}
              disabled={participantsLoading || Boolean(participantsError)}
              autoFocus={isPreview || cameraUnavailable}
              title={isPreview ? 'Find your name' : 'Or find your name'}
              description={
                isPreview
                  ? 'Type your name or badge number.'
                  : 'Type your name if the camera is not working.'
              }
              onSelect={openMinutesForParticipant}
            />
          )}

          {participantsLoading && manualLookupEnabled && (
            <p className="text-center text-sm text-slate-600">Loading roster…</p>
          )}

          {participantsError && manualLookupEnabled && (
            <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              {participantsError}
            </p>
          )}

          {scannerEnabled && (
            <RosterCacheGate>
              {cameraChecking && !manualLookupEnabled && (
                <p className="text-center text-lg text-slate-600">
                  Checking camera…
                </p>
              )}

              {cameraUnavailable && !scannerError && cameraMessage && (
                <KioskCameraAlert message={cameraMessage} onRetry={handleRetryCamera} />
              )}

              {scannerVisible && (
                <KioskQrScanner
                  resetKey={scanKey}
                  onScan={(token) => void handleScan(token)}
                  onCameraError={handleCameraError}
                />
              )}

              {scannerError && cameraState === 'available' && (
                <KioskCameraAlert
                  message={scannerError}
                  onRetry={handleRetryCamera}
                />
              )}
            </RosterCacheGate>
          )}
        </>
      )}

      {view.mode === 'minutes' && (
        <div className="space-y-6">
          <p className="text-center text-3xl font-bold text-crimson-700">
            {formatParticipantName(
              view.participant.first_name,
              view.participant.last_initial,
            )}
          </p>
          <KioskMinutesPad
            value={minutes}
            disabled={submitting}
            onChange={setMinutes}
          />
          <div className="flex flex-col gap-3">
            <Button fullWidth disabled={submitting} onClick={() => void handleConfirm()}>
              {submitting ? 'Saving…' : 'Done'}
            </Button>
            <Button variant="secondary" fullWidth disabled={submitting} onClick={resetToScanner}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {view.mode === 'success' && (
        <KioskSuccess
          firstName={view.participant.first_name}
          minutes={view.minutes}
          onNext={resetToScanner}
        />
      )}

      {view.mode === 'error' && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-6 text-center text-xl text-amber-900">
          {view.message}
        </div>
      )}
    </section>
  )
}
