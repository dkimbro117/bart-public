import { useCallback, useEffect, useState } from 'react'
import CheckInAlertCard from '../components/checkin/CheckInAlertCard'
import SuccessCard from '../components/checkin/SuccessCard'
import ManualCheckInSearch from '../components/checkin/ManualCheckInSearch'
import ManualFirstScanHint from '../components/checkin/ManualFirstScanHint'
import StaffQrScanner from '../components/checkin/StaffQrScanner'
import DoorSignFlow from '../components/door/DoorSignFlow'
import RosterCacheGate from '../components/RosterCacheGate'
import SessionBanner from '../components/SessionBanner'
import { useAuth } from '../contexts/AuthContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { useInputMode } from '../hooks/useInputMode'
import type { Attendance } from '../lib/checkIn'
import {
  getAttendanceForSession,
  isRosterNotCachedError,
  loadCachedParticipantsForCheckout,
  lookupParticipantForCheckout,
} from '../lib/checkIn'
import { checkOutParticipant } from '../lib/checkOut'
import type { SignaturePayload } from '../lib/signatures'
import { formatDateTime } from '../lib/dates'
import { formatDisplayId, formatParticipantName } from '../lib/format'
import { confirmHaptic } from '../lib/haptics'
import type { Participant } from '../lib/participants'
import { PARTICIPANT_CHECKOUT } from '../lib/participantColumns'
import { isOnline } from '../lib/sync'
import { supabase } from '../lib/supabase'

type CheckOutView =
  | { mode: 'scanning' }
  | {
      mode: 'pickup'
      participant: Participant
      attendance: Attendance
      scannedAt: string
    }
  | { mode: 'error'; title: string; message: string; detail?: string }
  | { mode: 'not_checked_in'; participant: Participant }
  | {
      mode: 'already_checked_out'
      participant: Participant
      checkedOutAt: string
      pickupName: string | null
    }
  | { mode: 'success'; participant: Participant; pickupName: string }

const OFFLINE_CHECKOUT_HINT_KEY = 'bart-checkout-offline-hint-dismissed'

export default function CheckOutPage() {
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
  const [view, setView] = useState<CheckOutView>({ mode: 'scanning' })
  const [submitting, setSubmitting] = useState(false)
  const [scanKey, setScanKey] = useState(0)
  const [offlineHintDismissed, setOfflineHintDismissed] = useState(
    () => sessionStorage.getItem(OFFLINE_CHECKOUT_HINT_KEY) === '1',
  )

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
          message: 'Choose a session in the header before checking boys out.',
        })
        return
      }

      try {
        const attendance = await getAttendanceForSession(
          participant.id,
          selectedSessionId,
        )

        if (!attendance?.checked_in_at) {
          setView({ mode: 'not_checked_in', participant })
          return
        }

        if (attendance.checked_out_at) {
          setView({
            mode: 'already_checked_out',
            participant,
            checkedOutAt: attendance.checked_out_at,
            pickupName: attendance.pickup_name,
          })
          return
        }

        setView({
          mode: 'pickup',
          participant,
          attendance,
          scannedAt: scannedAt ?? new Date().toISOString(),
        })
      } catch (error) {
        setView({
          mode: 'error',
          title: 'Check-out lookup failed',
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
            detail: 'Try scanning again or use manual lookup below.',
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

  const handlePickupSelect = useCallback(
    async (pickupName: string, signature: SignaturePayload) => {
      if (view.mode !== 'pickup' || !selectedSessionId) {
        return
      }

      if (!profile?.id) {
        setView({
          mode: 'error',
          title: 'Staff profile missing',
          message:
            'Your staff profile could not be loaded. Try signing out and back in.',
        })
        return
      }

      setSubmitting(true)

      try {
        await checkOutParticipant({
          participantId: view.participant.id,
          sessionId: selectedSessionId,
          staffId: profile.id,
          pickupName,
          occurredAt: view.scannedAt,
          signature,
        })

        confirmHaptic()
        setView({
          mode: 'success',
          participant: view.participant,
          pickupName,
        })
        window.setTimeout(() => {
          resetToScanner()
        }, 1500)
      } catch (error) {
        setSubmitting(false)
        const message =
          error instanceof Error ? error.message : 'Unable to save check-out.'
        setView({
          mode: 'error',
          title: 'Check-out failed',
          message:
            message.includes('before check-in') ||
            message.includes('not on server')
              ? 'Check-in is still syncing. Wait a moment, tap Sync now in the header, then try again.'
              : message,
        })
      }
    },
    [profile?.id, resetToScanner, selectedSessionId, view],
  )

  const scannerVisible =
    view.mode === 'scanning' && scanEnabled && !cameraError
  const manualSearchDisabled =
    loading || initializing || !selectedSessionId || view.mode !== 'scanning'

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Check-out</h1>
        <p className="mt-1 text-sm text-slate-600">
          {manualPreferred
            ? 'Search for a boy below, then verify who is picking him up.'
            : 'Scan a lanyard QR, then verify who is picking the boy up.'}
        </p>
      </div>

      <SessionBanner verb="Checking out from" />

      {!checkInRequired && selectedSessionId && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Check-in is not required for this event. Confirm the top-bar session
          before checking boys out.
        </p>
      )}

      {!offlineHintDismissed && (
        <div className="flex items-start justify-between gap-3 rounded-[20px] border border-cream-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-card">
          <p>
            If two tablets scan the same boy offline, the server keeps the latest
            successful sync. Tap Sync now after reconnecting.
          </p>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(OFFLINE_CHECKOUT_HINT_KEY, '1')
              setOfflineHintDismissed(true)
            }}
            className="shrink-0 text-slate-500 underline hover:text-slate-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {loadError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          {loadError}
        </p>
      )}

      {view.mode === 'scanning' && (
        <>
          {manualPreferred && <ManualFirstScanHint onEnableScan={enableScan} />}

          <ManualCheckInSearch
            participants={participants}
            disabled={manualSearchDisabled}
            autoFocus={manualPreferred}
            title="Manual check-out"
            description="Search by name or badge number if the QR is damaged."
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

      {view.mode === 'pickup' && (
        <DoorSignFlow
          participant={view.participant}
          heading="Verify pickup person"
          prompt="Confirm who is collecting him, then have them sign."
          confirmLabel="Confirm check-out"
          submitting={submitting}
          onConfirm={(pickupName, signature) =>
            void handlePickupSelect(pickupName, signature)
          }
          onCancel={resetToScanner}
        />
      )}

      {view.mode === 'not_checked_in' && (
        <CheckInAlertCard
          title="Not checked in"
          message={`${formatParticipantName(
            view.participant.first_name,
            view.participant.last_initial,
            view.participant.last_name,
          )} (${formatDisplayId(view.participant.display_id)}) is not checked in for this session.`}
          detail="Check him in first, then return here to check him out."
          tone="warning"
          onAction={resetToScanner}
        />
      )}

      {view.mode === 'already_checked_out' && (
        <CheckInAlertCard
          title="Already checked out"
          message={`${formatParticipantName(
            view.participant.first_name,
            view.participant.last_initial,
            view.participant.last_name,
          )} (${formatDisplayId(view.participant.display_id)}) is already checked out.`}
          detail={`Checked out at ${formatDateTime(view.checkedOutAt)}${
            view.pickupName ? ` with ${view.pickupName}.` : '.'
          }`}
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
          title="Checked out"
          message={`${formatParticipantName(
            view.participant.first_name,
            view.participant.last_initial,
            view.participant.last_name,
          )} (${formatDisplayId(view.participant.display_id)}) left with ${view.pickupName}.`}
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
