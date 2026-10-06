import { useCallback, useEffect, useState } from 'react'
import CheckInAlertCard from '../components/checkin/CheckInAlertCard'
import ManualFirstScanHint from '../components/checkin/ManualFirstScanHint'
import StaffQrScanner from '../components/checkin/StaffQrScanner'
import VolunteerManualSearch from '../components/volunteers/VolunteerManualSearch'
import VolunteersCheckedInList from '../components/volunteers/VolunteersCheckedInList'
import { useAuth } from '../contexts/AuthContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { useInputMode } from '../hooks/useInputMode'
import { formatDateTime, formatSessionLabel } from '../lib/dates'
import { formatDisplayId } from '../lib/format'
import { VOLUNTEER_SCAN } from '../lib/volunteerColumns'
import {
  checkInVolunteer,
  checkOutVolunteer,
  fetchCheckedInVolunteers,
  getVolunteerAttendanceForSession,
  getVolunteerAttendanceState,
  lookupVolunteerByQrToken,
  type VolunteerAttendanceState,
  type VolunteerAttendanceWithVolunteer,
} from '../lib/volunteerAttendance'
import type { Volunteer } from '../lib/volunteers'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  alertSuccessInline,
  alertWarningInline,
  btnPrimary,
  btnSecondary,
  confirmCard,
  headingPage,
  textMuted,
  textSubtle,
} from '../ui/classes'

type SelectedVolunteer = {
  volunteer: Volunteer
  attendanceState: VolunteerAttendanceState
  checkedInAt: string | null
}

export default function VolunteerCheckInPage() {
  const { profile } = useAuth()
  const { sessions, selectedSessionId, initializing } = useSyncStatus()
  const { manualPreferred, scanEnabled, enableScan, reportCameraFailure } =
    useInputMode()
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [checkedIn, setCheckedIn] = useState<VolunteerAttendanceWithVolunteer[]>(
    [],
  )
  const [selected, setSelected] = useState<SelectedVolunteer | null>(null)
  const [loadingVolunteers, setLoadingVolunteers] = useState(true)
  const [loadingCheckedIn, setLoadingCheckedIn] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [scanKey, setScanKey] = useState(0)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const handleCameraError = useCallback(
    (message: string) => {
      reportCameraFailure()
      setCameraError(message)
    },
    [reportCameraFailure],
  )

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? null

  const refreshCheckedIn = useCallback(async () => {
    if (!selectedSessionId) {
      setCheckedIn([])
      return
    }

    setLoadingCheckedIn(true)
    try {
      const rows = await fetchCheckedInVolunteers(selectedSessionId)
      setCheckedIn(rows)
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Failed to load checked-in volunteers.',
      )
    } finally {
      setLoadingCheckedIn(false)
    }
  }, [selectedSessionId])

  useEffect(() => {
    let mounted = true

    async function loadVolunteers() {
      setLoadingVolunteers(true)
      setLoadError(null)

      const { data, error } = await supabase
        .from('volunteers')
        .select(VOLUNTEER_SCAN)
        .eq('active', true)
        .order('display_id', { ascending: true })

      if (!mounted) return

      if (error) {
        setLoadError(error.message)
        setVolunteers([])
      } else {
        setVolunteers(
          (data ?? []).map((row) => ({
            ...row,
            email: null,
            phone: null,
            created_at: null,
          })),
        )
      }

      setLoadingVolunteers(false)
    }

    void loadVolunteers()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    void refreshCheckedIn()
    const intervalId = window.setInterval(() => {
      void refreshCheckedIn()
    }, 15_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [refreshCheckedIn])

  const selectVolunteer = useCallback(
    async (volunteer: Volunteer) => {
      if (!selectedSessionId) {
        setActionError('Choose a session in the header before checking volunteers in.')
        return
      }

      setActionError(null)
      setStatusMessage(null)

      try {
        const attendance = await getVolunteerAttendanceForSession(
          volunteer.id,
          selectedSessionId,
        )
        setSelected({
          volunteer,
          attendanceState: getVolunteerAttendanceState(attendance),
          checkedInAt: attendance?.checked_in_at ?? null,
        })
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : 'Unable to load volunteer attendance.',
        )
      }
    },
    [selectedSessionId],
  )

  const handleScan = useCallback(
    async (token: string) => {
      try {
        const volunteer = await lookupVolunteerByQrToken(token)
        if (!volunteer) {
          setActionError('No active volunteer matches that badge QR.')
          return
        }
        await selectVolunteer(volunteer)
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'Unable to process scan.',
        )
      }
    },
    [selectVolunteer],
  )

  const handleToggleAttendance = useCallback(async () => {
    if (!selected || !profile?.id || !selectedSessionId) {
      return
    }

    setSubmitting(true)
    setActionError(null)
    setStatusMessage(null)

    const occurredAt = new Date().toISOString()

    try {
      if (selected.attendanceState === 'checked_in') {
        await checkOutVolunteer({
          volunteerId: selected.volunteer.id,
          sessionId: selectedSessionId,
          staffId: profile.id,
          occurredAt,
        })
        setStatusMessage(
          `${selected.volunteer.full_name} checked out at ${formatDateTime(occurredAt)}.`,
        )
      } else {
        await checkInVolunteer({
          volunteerId: selected.volunteer.id,
          sessionId: selectedSessionId,
          staffId: profile.id,
          occurredAt,
        })
        setStatusMessage(
          `${selected.volunteer.full_name} checked in at ${formatDateTime(occurredAt)}.`,
        )
      }

      setSelected(null)
      setScanKey((current) => current + 1)
      await refreshCheckedIn()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Unable to save attendance.',
      )
    } finally {
      setSubmitting(false)
    }
  }, [profile?.id, refreshCheckedIn, selected, selectedSessionId])

  const toggleLabel =
    selected?.attendanceState === 'checked_in' ? 'Check out' : 'Check in'

  const scannerVisible =
    !selected && scanEnabled && !cameraError && selectedSessionId

  return (
    <section className="space-y-6">
      <div>
        <h1 className={headingPage}>Volunteer check-in</h1>
        <p className={`mt-1 ${textSubtle}`}>
          {manualPreferred
            ? 'Search for a volunteer below, then tap to check in or out.'
            : 'Scan a badge or pick a volunteer, then tap to check in or out.'}
        </p>
      </div>

      {selectedSession && (
        <p className={`text-sm ${textMuted}`}>
          Working session:{' '}
          <span className="font-medium text-slate-900">
            {formatSessionLabel(
              selectedSession.title,
              selectedSession.session_date,
            )}
          </span>
        </p>
      )}

      {!selectedSessionId && !initializing && (
        <p className={alertWarningInline}>
          Choose a session in the header before checking volunteers in.
        </p>
      )}

      {loadError && (
        <p className={alertErrorInline}>{loadError}</p>
      )}

      {actionError && (
        <CheckInAlertCard
          title="Unable to continue"
          message={actionError}
          tone="error"
          onAction={() => setActionError(null)}
        />
      )}

      {statusMessage && (
        <p className={alertSuccessInline} role="status">
          {statusMessage}
        </p>
      )}

      {selected ? (
        <div className={confirmCard}>
          <p className="text-sm font-semibold uppercase tracking-wide text-crimson-600">
            {toggleLabel}
          </p>
          <p className={`mt-3 font-mono text-sm ${textMuted}`}>
            {formatDisplayId(selected.volunteer.display_id)}
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {selected.volunteer.full_name}
          </p>
          {selected.attendanceState === 'checked_in' && selected.checkedInAt && (
            <p className={`mt-3 text-sm ${textMuted}`}>
              Checked in at {formatDateTime(selected.checkedInAt)}
            </p>
          )}
          {selected.attendanceState === 'checked_out' && (
            <p className="mt-3 text-sm text-amber-800">
              Already checked out for this session. Tap below to check in again.
            </p>
          )}

          <button
            type="button"
            disabled={submitting || !selectedSessionId}
            onClick={() => void handleToggleAttendance()}
            className={`mt-6 ${btnPrimary} min-h-16 text-lg`}
          >
            {submitting ? 'Saving…' : toggleLabel}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => setSelected(null)}
            className={`mt-3 ${btnSecondary} min-h-14 text-lg`}
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {manualPreferred && <ManualFirstScanHint onEnableScan={enableScan} />}

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
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <VolunteerManualSearch
          volunteers={volunteers}
          disabled={loadingVolunteers || !selectedSessionId || submitting}
          autoFocus={manualPreferred && !selected}
          onSelect={(volunteer) => void selectVolunteer(volunteer)}
        />
        <VolunteersCheckedInList rows={checkedIn} loading={loadingCheckedIn} />
      </div>
    </section>
  )
}
