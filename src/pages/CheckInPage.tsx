import { useCallback, useEffect, useState } from 'react'
import CheckInAlertCard from '../components/checkin/CheckInAlertCard'
import SuccessCard from '../components/checkin/SuccessCard'
import DoorSignFlow from '../components/door/DoorSignFlow'
import ManualCheckInSearch from '../components/checkin/ManualCheckInSearch'
import ManualFirstScanHint from '../components/checkin/ManualFirstScanHint'
import StaffQrScanner from '../components/checkin/StaffQrScanner'
import RosterCacheGate from '../components/RosterCacheGate'
import SessionBanner from '../components/SessionBanner'
import { useAuth } from '../contexts/AuthContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { useInputMode } from '../hooks/useInputMode'
import {
  checkInParticipant,
  getAttendanceForSession,
  isRosterNotCachedError,
  loadCachedParticipantsForCheckout,
  lookupParticipantForCheckout,
} from '../lib/checkIn'
import { formatDateTime } from '../lib/dates'
import { formatDisplayId, formatParticipantName } from '../lib/format'
import { confirmHaptic } from '../lib/haptics'
import type { Participant } from '../lib/participants'
import { PARTICIPANT_CHECKOUT } from '../lib/participantColumns'
import { isOnline } from '../lib/sync'
import { supabase } from '../lib/supabase'
import type { SignaturePayload } from '../lib/signatures'
import { alertErrorInline, alertWarningInline, headingPage, textSubtle } from '../ui/classes'

type CheckInView =
  | { mode: 'scanning' }
  | { mode: 'confirm'; participant: Participant; scannedAt: string }
  | { mode: 'error'; title: string; message: string; detail?: string }
  | {
      mode: 'already_checked_in'
      participant: Participant
      checkedInAt: string
    }
  | { mode: 'success'; participant: Participant }

export default function CheckInPage() {
  const { profile } = useAuth()
  const { pendingCount, connectionState, selectedSessionId, initializing, sessions } =
    useSyncStatus()
  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? null
  const checkInRequired = selectedSession?.requires_check_in !== false
  const { manualPreferred, scanEnabled, enableScan, reportCameraFailure } =
    useInputMode()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [view, setView] = useState<CheckInView>({ mode: 'scanning' })
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
            .select(PARTICIPANT_CHECKOUT)
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
                created_at: null,
              })),
            )
          }
        } else {
          const cached = await loadCachedParticipantsForCheckout()
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

  const resetToScanner = useCallback(() => {
    setView({ mode: 'scanning' })
    setSubmitting(false)
    setScanKey((key) => key + 1)
  }, [])

  const evaluateParticipant = useCallback(
    async (participant: Participant, scannedAt?: string) => {
      if (!selectedSessionId) {
        setView({
          mode: 'error',
          title: 'No session selected',
          message: 'Choose a session in the header before checking boys in.',
        })
        return
      }

      try {
        const attendance = await getAttendanceForSession(
          participant.id,
          selectedSessionId,
        )

        if (attendance?.checked_in_at) {
          setView({
            mode: 'already_checked_in',
            participant,
            checkedInAt: attendance.checked_in_at,
          })
          return
        }

        setView({
          mode: 'confirm',
          participant,
          scannedAt: scannedAt ?? new Date().toISOString(),
        })
      } catch (error) {
        setView({
          mode: 'error',
          title: 'Check-in lookup failed',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to verify attendance status.',
        })
      }
    },
    [selectedSessionId],
  )

  const handleScan = useCallback(
    async (qrToken: string) => {
      const scannedAt = new Date().toISOString()

      try {
        const participant = await lookupParticipantForCheckout(qrToken)

        if (!participant) {
          setView({
            mode: 'error',
            title: 'Badge not recognized',
            message: 'No active participant matches that QR code.',
            detail: 'Try scanning again or use manual check-in below.',
          })
          return
        }

        await evaluateParticipant(participant, scannedAt)
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
    [evaluateParticipant],
  )

  const handleConfirm = useCallback(
    async (signerName: string, signature: SignaturePayload) => {
    if (view.mode !== 'confirm' || !selectedSessionId) {
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

    setSubmitting(true)

    try {
      await checkInParticipant({
        participantId: view.participant.id,
        sessionId: selectedSessionId,
        staffId: profile.id,
        occurredAt: view.scannedAt,
        signerName,
        signature,
      })

      confirmHaptic()
      setView({ mode: 'success', participant: view.participant })
      window.setTimeout(() => {
        setView({ mode: 'scanning' })
        setSubmitting(false)
      }, 1500)
    } catch (error) {
      setSubmitting(false)
      setView({
        mode: 'error',
        title: 'Check-in failed',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to save check-in. Try again.',
      })
    }
  }, [profile?.id, selectedSessionId, view])

  const scannerVisible =
    view.mode === 'scanning' && scanEnabled && !cameraError
  const manualSearchDisabled =
    loading || initializing || !selectedSessionId || view.mode !== 'scanning'

  return (
    <section className="space-y-6">
      <div>
        <h1 className={headingPage}>Boy check-in</h1>
        <p className={`mt-1 text-sm ${textSubtle}`}>
          {manualPreferred
            ? 'Search for a boy below to check him into the session.'
            : "Scan a boy's lanyard QR or search manually to check him into the session."}
        </p>
      </div>

      <SessionBanner verb="Checking in to" />

      {!checkInRequired && selectedSessionId && (
        <p className={alertWarningInline}>
          Check-in is not required for this event. You can still record
          attendance, or switch sessions in the top bar.
        </p>
      )}

      {loadError && <p className={alertErrorInline}>{loadError}</p>}

      {view.mode === 'scanning' && (
        <>
          {manualPreferred && <ManualFirstScanHint onEnableScan={enableScan} />}

          <ManualCheckInSearch
            participants={participants}
            disabled={manualSearchDisabled}
            autoFocus={manualPreferred}
            onSelect={(participant) =>
              void evaluateParticipant(participant, new Date().toISOString())
            }
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

      {view.mode === 'confirm' && (
        <DoorSignFlow
          participant={view.participant}
          heading="ID check — drop-off"
          prompt="Verify the adult in person, then have them sign."
          confirmLabel="Confirm check-in"
          submitting={submitting}
          onConfirm={(signerName, signature) =>
            void handleConfirm(signerName, signature)
          }
          onCancel={resetToScanner}
        />
      )}

      {view.mode === 'already_checked_in' && (
        <CheckInAlertCard
          title="Already checked in"
          message={`${formatParticipantName(
            view.participant.first_name,
            view.participant.last_initial,
            view.participant.last_name,
          )} (${formatDisplayId(view.participant.display_id)}) is already checked in.`}
          detail={`Checked in at ${formatDateTime(view.checkedInAt)}.`}
          tone="warning"
          onAction={resetToScanner}
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
        <SuccessCard
          title="Checked in"
          message={`${formatParticipantName(
            view.participant.first_name,
            view.participant.last_initial,
            view.participant.last_name,
          )} (${formatDisplayId(view.participant.display_id)}) is checked in.`}
          detail={
            pendingCount > 0 || connectionState !== 'online'
              ? 'Saved on this device. Will sync to the server when connection is available.'
              : undefined
          }
          onAction={resetToScanner}
        />
      )}
    </section>
  )
}
