import { useCallback, useMemo, useState } from 'react'
import DoorSignFlow from '../components/door/DoorSignFlow'
import LiveRosterList from '../components/roster/LiveRosterList'
import SessionBanner from '../components/SessionBanner'
import { useAuth } from '../contexts/AuthContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { useLiveAttendance } from '../hooks/useLiveAttendance'
import type { AttendanceWithParticipant } from '../lib/attendance'
import { splitAttendance } from '../lib/attendance'
import { getAttendanceForSession } from '../lib/checkIn'
import { checkOutParticipant } from '../lib/checkOut'
import { PARTICIPANT_CHECKOUT } from '../lib/participantColumns'
import type { Participant } from '../lib/participants'
import type { SignaturePayload } from '../lib/signatures'
import { supabase } from '../lib/supabase'
import {
  surfaceCard,
  headingPage,
  textSubtle,
  alertWarningInline,
  alertErrorInline,
} from '../ui/classes'

export default function RosterLivePage() {
  const { profile } = useAuth()
  const { selectedSessionId, initializing } = useSyncStatus()
  const { rows, loading, error, usingLocalData } =
    useLiveAttendance(selectedSessionId)

  const { checkedIn, checkedOut } = useMemo(
    () => splitAttendance(rows),
    [rows],
  )

  const [checkoutTarget, setCheckoutTarget] = useState<Participant | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const pageLoading = initializing || loading

  const startCheckout = useCallback(async (row: AttendanceWithParticipant) => {
    setCheckoutError(null)
    const { data, error: loadError } = await supabase
      .from('participants')
      .select(PARTICIPANT_CHECKOUT)
      .eq('id', row.participant_id)
      .maybeSingle()

    if (loadError || !data) {
      setCheckoutError(loadError?.message ?? 'Could not load pickup list.')
      return
    }

    setCheckoutTarget({ ...data, created_at: null })
  }, [])

  const handleCheckout = useCallback(
    async (pickupName: string, signature: SignaturePayload) => {
      if (!checkoutTarget || !selectedSessionId || !profile?.id) {
        return
      }

      setSubmitting(true)
      setCheckoutError(null)
      try {
        const attendance = await getAttendanceForSession(
          checkoutTarget.id,
          selectedSessionId,
        )
        if (!attendance?.checked_in_at) {
          throw new Error('This boy is not checked in for the selected session.')
        }
        if (attendance.checked_out_at) {
          throw new Error('This boy is already checked out.')
        }

        await checkOutParticipant({
          participantId: checkoutTarget.id,
          sessionId: selectedSessionId,
          staffId: profile.id,
          pickupName,
          occurredAt: new Date().toISOString(),
          signature,
        })
        setCheckoutTarget(null)
      } catch (submitError) {
        setCheckoutError(
          submitError instanceof Error
            ? submitError.message
            : 'Check-out failed.',
        )
      } finally {
        setSubmitting(false)
      }
    },
    [checkoutTarget, profile?.id, selectedSessionId],
  )

  return (
    <section className="space-y-5">
      <div>
        <h1 className={headingPage}>Live roster</h1>
        <p className={`mt-1 text-sm ${textSubtle}`}>
          Updates automatically. Tap Check out on a boy who is still in.
        </p>
      </div>

      <SessionBanner verb="Showing" />

      {usingLocalData && (
        <p className={alertWarningInline}>
          Showing cached data from this device. Counts update when you reconnect.
        </p>
      )}

      {pageLoading && <p className={textSubtle}>Loading live roster…</p>}

      {error && <p className={alertErrorInline}>{error}</p>}
      {checkoutError && <p className={alertErrorInline}>{checkoutError}</p>}

      {checkoutTarget && (
        <DoorSignFlow
          participant={checkoutTarget}
          heading="Live roster check-out"
          prompt="Confirm who is collecting him, then have them sign."
          confirmLabel="Confirm check-out"
          submitting={submitting}
          onConfirm={(pickupName, signature) =>
            void handleCheckout(pickupName, signature)
          }
          onCancel={() => setCheckoutTarget(null)}
        />
      )}

      {!pageLoading && !error && !checkoutTarget && (
        <>
          <div
            className={`${surfaceCard} grid grid-cols-2 gap-4 border border-cream-200 px-4 py-6 text-center`}
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                In
              </p>
              <p className="text-5xl font-bold text-crimson-600">{checkedIn.length}</p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                Out
              </p>
              <p className="text-5xl font-bold text-slate-900">{checkedOut.length}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <LiveRosterList
              title="Checked in"
              rows={checkedIn}
              emptyMessage="No boys checked in yet."
              checkoutAction={(row) => void startCheckout(row)}
            />
            <LiveRosterList
              title="Checked out"
              rows={checkedOut}
              emptyMessage="No boys checked out yet."
              showPickup
            />
          </div>
        </>
      )}
    </section>
  )
}
