import { useCallback, useEffect, useState } from 'react'
import CheckInAlertCard from '../components/checkin/CheckInAlertCard'
import ManualCheckInSearch from '../components/checkin/ManualCheckInSearch'
import ManualFirstScanHint from '../components/checkin/ManualFirstScanHint'
import StaffQrScanner from '../components/checkin/StaffQrScanner'
import ReadingMinutesCard from '../components/reading/ReadingMinutesCard'
import RosterCacheGate from '../components/RosterCacheGate'
import SessionBanner from '../components/SessionBanner'
import { useAuth } from '../contexts/AuthContext'
import { useKioskMode } from '../contexts/KioskModeContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { useInputMode } from '../hooks/useInputMode'
import {
  isRosterNotCachedError,
  loadCachedParticipantsForManualSearch,
  lookupParticipantByQrToken,
} from '../lib/checkIn'
import { formatDisplayId, formatParticipantName } from '../lib/format'
import type { Participant } from '../lib/participants'
import {
  getCurriculumUnitForSession,
  logReadingMinutes,
  parseReadingMinutesInput,
} from '../lib/readingLogs'
import { isOnline } from '../lib/sync'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  alertWarningInline,
  btnPrimary,
  btnSecondary,
  headingPage,
  textSubtle,
} from '../ui/classes'

type ReadingView =
  | { mode: 'scanning' }
  | { mode: 'minutes'; participant: Participant }
  | { mode: 'error'; title: string; message: string; detail?: string }
  | { mode: 'success'; participant: Participant; minutes: number }

export default function ReadingPage() {
  const { profile } = useAuth()
  const { requestEnterKioskMode, requestEnterKioskPreview } = useKioskMode()
  const { pendingCount, connectionState, selectedSessionId, initializing, sessions } =
    useSyncStatus()
  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? null
  const readingSupported = selectedSession?.supports_reading !== false
  const {
    manualPreferred,
    scanEnabled,
    enableScan,
    reportCameraFailure,
    isDesktopViewport,
  } = useInputMode()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [unitTitle, setUnitTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [view, setView] = useState<ReadingView>({ mode: 'scanning' })
  const [minutes, setMinutes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [scanKey, setScanKey] = useState(0)

  const handleCameraError = useCallback(
    (message: string) => {
      reportCameraFailure()
      setCameraError(message)
    },
    [reportCameraFailure],
  )

  useEffect(() => {
    let mounted = true

    async function loadParticipants() {
      setLoading(true)
      setLoadError(null)

      try {
        if (isOnline()) {
          const { data, error } = await supabase
            .from('participants')
            .select('id, display_id, first_name, last_initial, last_name, qr_token, active')
            .eq('active', true)
            .order('display_id', { ascending: true })

          if (!mounted) return

          if (error) {
            setLoadError(error.message)
            setParticipants([])
          } else {
            setParticipants(
              (data ?? []).map((row) => ({
                ...row,
                guardian_name: '',
                authorized_pickups: [],
                created_at: null,
              })),
            )
          }
        } else {
          const cached = await loadCachedParticipantsForManualSearch()
          if (!mounted) return
          setParticipants(cached)
        }
      } catch (error) {
        if (!mounted) return
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Failed to load participants.',
        )
        setParticipants([])
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadParticipants()

    return () => {
      mounted = false
    }
  }, [connectionState])

  useEffect(() => {
    let mounted = true

    async function loadUnit() {
      if (!selectedSessionId) {
        setUnitTitle(null)
        return
      }

      try {
        const unit = await getCurriculumUnitForSession(selectedSessionId)
        if (!mounted) return
        setUnitTitle(unit?.title ?? null)
      } catch {
        if (!mounted) return
        setUnitTitle(null)
      }
    }

    void loadUnit()

    return () => {
      mounted = false
    }
  }, [selectedSessionId])

  const resetToScanner = useCallback(() => {
    setView({ mode: 'scanning' })
    setMinutes('')
    setSubmitting(false)
    setScanKey((key) => key + 1)
  }, [])

  const openMinutesEntry = useCallback((participant: Participant) => {
    if (!selectedSessionId) {
      setView({
        mode: 'error',
        title: 'No session selected',
        message: 'Choose a session in the header before logging reading.',
      })
      return
    }

    setMinutes('')
    setView({ mode: 'minutes', participant })
  }, [selectedSessionId])

  const handleScan = useCallback(
    async (qrToken: string) => {
      try {
        const participant = await lookupParticipantByQrToken(qrToken)

        if (!participant) {
          setView({
            mode: 'error',
            title: 'Badge not recognized',
            message: 'No active participant matches that QR code.',
            detail: 'Try scanning again or search manually below.',
          })
          return
        }

        openMinutesEntry(participant)
      } catch (error) {
        if (isRosterNotCachedError(error)) {
          setView({
            mode: 'error',
            title: 'Roster not cached',
            message: error.message,
            detail: 'Connect to Wi‑Fi, then tap Refresh roster in the menu.',
          })
          return
        }

        setView({
          mode: 'error',
          title: 'Scan lookup failed',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to look up that badge.',
        })
      }
    },
    [openMinutesEntry],
  )

  const handleConfirm = useCallback(async () => {
    if (view.mode !== 'minutes' || !selectedSessionId) {
      return
    }

    if (!profile?.id) {
      setView({
        mode: 'error',
        title: 'Staff profile missing',
        message: 'Your staff profile could not be loaded. Try signing out and back in.',
      })
      return
    }

    const parsedMinutes = parseReadingMinutesInput(minutes)
    if (parsedMinutes === null) {
      setView({
        mode: 'error',
        title: 'Invalid minutes',
        message: 'Enter a whole number of minutes from 0 to 999.',
        detail: 'Use the number pad, then confirm again.',
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
      window.setTimeout(() => {
        resetToScanner()
      }, 1500)
    } catch (error) {
      setSubmitting(false)
      setView({
        mode: 'error',
        title: 'Reading log failed',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to save reading minutes. Try again.',
      })
    }
  }, [minutes, profile?.id, resetToScanner, selectedSessionId, view])

  const scannerVisible =
    view.mode === 'scanning' && scanEnabled && !cameraError
  const manualSearchDisabled =
    loading || initializing || !selectedSessionId || view.mode !== 'scanning'

  return (
    <section className="space-y-6">
      <div>
        <h1 className={headingPage}>Reading log</h1>
        <p className={`mt-1 text-sm ${textSubtle}`}>
          {manualPreferred
            ? 'Search for a boy below and enter minutes read.'
            : 'Scan a lanyard QR, enter minutes read, and move to the next boy.'}
          {!isDesktopViewport &&
            ' Tablets are for reading minutes and check-in. Boys take the quiz on their phone at /go.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {isDesktopViewport ? (
            <>
              <button
                type="button"
                onClick={() => requestEnterKioskPreview('/kiosk/preview/reading')}
                className={btnSecondary}
              >
                Preview reading kiosk
              </button>
              <button
                type="button"
                onClick={() => requestEnterKioskPreview('/kiosk/preview/quiz')}
                className={btnSecondary}
              >
                Preview quiz kiosk
              </button>
              <a href="/go" className={btnSecondary}>
                Open phone quiz (/go)
              </a>
            </>
          ) : (
            <button
              type="button"
              onClick={() => requestEnterKioskMode('/kiosk/reading')}
              className={btnPrimary}
            >
              Reading kiosk
            </button>
          )}
        </div>
      </div>

      <SessionBanner verb="Logging reading for" />

      {!readingSupported && selectedSessionId && (
        <p className={alertWarningInline}>
          The selected event does not support reading. Choose a reading session
          in the top bar, or edit the event under Sessions.
        </p>
      )}

      {unitTitle && selectedSessionId && (
        <p className={`text-sm ${textSubtle}`}>
          Session unit:{' '}
          <span className="font-medium text-slate-900">{unitTitle}</span>
        </p>
      )}

      {loadError && (
        <p className={alertErrorInline}>{loadError}</p>
      )}

      {view.mode === 'scanning' && (
        <>
          {manualPreferred && <ManualFirstScanHint onEnableScan={enableScan} />}

          <ManualCheckInSearch
            participants={participants}
            disabled={manualSearchDisabled}
            autoFocus={manualPreferred}
            title="Manual lookup"
            description="Search by name or badge number if the QR won't scan."
            onSelect={openMinutesEntry}
          />

          {scanEnabled && (
            <RosterCacheGate>
              {scannerVisible && (
                <StaffQrScanner
                  resetKey={scanKey}
                  onScan={(token) => void handleScan(token)}
                  onCameraError={handleCameraError}
                  onCameraFailure={reportCameraFailure}
                />
              )}

              {cameraError && (
                <CheckInAlertCard
                  title="Camera unavailable"
                  message={cameraError}
                  tone="warning"
                  actionLabel="Try camera again"
                  onAction={() => setCameraError(null)}
                />
              )}
            </RosterCacheGate>
          )}
        </>
      )}

      {view.mode === 'minutes' && (
        <ReadingMinutesCard
          participant={view.participant}
          minutes={minutes}
          unitTitle={unitTitle}
          submitting={submitting}
          onMinutesChange={setMinutes}
          onConfirm={() => void handleConfirm()}
          onCancel={resetToScanner}
        />
      )}

      {view.mode === 'error' && (
        <CheckInAlertCard
          title={view.title}
          message={view.message}
          detail={view.detail}
          tone="error"
          onAction={resetToScanner}
        />
      )}

      {view.mode === 'success' && (
        <CheckInAlertCard
          title="Reading logged"
          message={`${formatParticipantName(
            view.participant.first_name,
            view.participant.last_initial,
            view.participant.last_name,
          )} (${formatDisplayId(view.participant.display_id)}) — ${view.minutes} minute${view.minutes === 1 ? '' : 's'}.`}
          detail={
            pendingCount > 0 || connectionState !== 'online'
              ? 'Saved on this device. Will sync to the server when connection is available.'
              : undefined
          }
          tone="success"
          actionLabel="Next scan"
          onAction={resetToScanner}
        />
      )}

    </section>
  )
}
