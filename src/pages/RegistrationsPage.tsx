import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import RegistrationReviewCard from '../components/registrations/RegistrationReviewCard'
import ConsolePageLayout from '../components/ui/ConsolePageLayout'
import Card from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'
import { useConsoleSelection } from '../hooks/useConsoleSelection'
import { useInputMode } from '../hooks/useInputMode'
import { formatDateTime } from '../lib/dates'
import { formatParticipantName } from '../lib/format'
import { REGISTRATION_QUEUE_LIST } from '../lib/registrationColumns'
import {
  mappedToFormValues,
  notifyRegistrationsChanged,
  type RegistrationQueueRow,
} from '../lib/registrations'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  consoleListButton,
  consoleListButtonActive,
  consolePanelPlaceholder,
  headingPage,
  listCard,
  textMuted,
  textSubtle,
} from '../ui/classes'

function registrationLabel(registration: RegistrationQueueRow): string {
  const values = mappedToFormValues(registration.mapped)
  if (values.first_name) {
    return formatParticipantName(values.first_name, values.last_initial || '?', values.last_name)
  }

  return registration.jotform_forms?.label ?? 'Pending submission'
}

export default function RegistrationsPage() {
  const { profile } = useAuth()
  const { isDesktopViewport } = useInputMode()
  const [registrations, setRegistrations] = useState<RegistrationQueueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRegistrations = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('pending_registrations')
      .select(REGISTRATION_QUEUE_LIST)
      .eq('status', 'pending')
      .order('received_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setRegistrations([])
    } else {
      setRegistrations((data ?? []) as RegistrationQueueRow[])
      notifyRegistrationsChanged()
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadRegistrations()
  }, [loadRegistrations])

  const getRegistrationId = useCallback(
    (registration: RegistrationQueueRow) => registration.id,
    [],
  )

  const { selected, setSelectedId } = useConsoleSelection(
    registrations,
    getRegistrationId,
    isDesktopViewport,
  )

  const countLabel = loading
    ? 'Loading queue…'
    : `${registrations.length} pending submission${registrations.length === 1 ? '' : 's'}`

  const handleReviewed = useCallback((registrationId: string) => {
    setRegistrations((current) => current.filter((row) => row.id !== registrationId))
  }, [])

  if (!profile?.id) {
    return (
      <section>
        <p className={textSubtle}>Loading staff profile…</p>
      </section>
    )
  }

  const header = (
    <div>
      <h1 className={headingPage}>Registrations</h1>
      <p className={`mt-1 text-sm ${textSubtle}`}>{countLabel}</p>
      <p className={`mt-1 text-sm ${textMuted}`}>
        Correct mapped fields, then approve to add the boy to the roster or reject
        to dismiss.
      </p>
    </div>
  )

  const footerNote = !loading && registrations.length > 0 && (
    <p className={`text-sm ${textSubtle}`}>
      Approved boys appear on the{' '}
      <Link to="/roster" className="font-medium text-crimson-700 hover:text-crimson-600">
        roster
      </Link>{' '}
      and can be printed from{' '}
      <Link
        to="/lanyards"
        className="font-medium text-crimson-700 hover:text-crimson-600"
      >
        Lanyards
      </Link>
      .
    </p>
  )

  if (isDesktopViewport) {
    return (
      <section className="space-y-5">
        <ConsolePageLayout
        header={
          <>
            {header}
            {error && <p className={alertErrorInline}>{error}</p>}
          </>
        }
        list={
          !loading && !error && registrations.length === 0 ? (
            <Card className={`py-10 text-center ${textSubtle}`}>
              No pending registrations. New JotForm submissions will appear here.
            </Card>
          ) : (
            <ul className={listCard}>
              {registrations.map((registration) => (
                <li key={registration.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(registration.id)}
                    className={
                      selected?.id === registration.id
                        ? consoleListButtonActive
                        : consoleListButton
                    }
                  >
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block font-semibold text-slate-900">
                        {registrationLabel(registration)}
                      </span>
                      <span className={`mt-0.5 block text-sm ${textMuted}`}>
                        {registration.received_at
                          ? formatDateTime(registration.received_at)
                          : 'Unknown time'}
                        {registration.jotform_forms?.label
                          ? ` · ${registration.jotform_forms.label}`
                          : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        }
        panel={
          selected ? (
            <RegistrationReviewCard
              key={selected.id}
              registration={selected}
              staffId={profile.id}
              onReviewed={() => handleReviewed(selected.id)}
            />
          ) : (
            <div className={consolePanelPlaceholder}>
              {loading
                ? 'Loading queue…'
                : registrations.length === 0
                  ? 'No pending registrations.'
                  : 'Select a submission to review.'}
            </div>
          )
        }
        />
        {footerNote}
      </section>
    )
  }

  return (
    <section className="space-y-5">
      {header}
      {error && <p className={alertErrorInline}>{error}</p>}
      {!loading && !error && registrations.length === 0 && (
        <Card className={`py-10 text-center ${textSubtle}`}>
          No pending registrations. New JotForm submissions will appear here.
        </Card>
      )}
      <div className="space-y-4">
        {registrations.map((registration) => (
          <RegistrationReviewCard
            key={registration.id}
            registration={registration}
            staffId={profile.id}
            onReviewed={() => handleReviewed(registration.id)}
          />
        ))}
      </div>
      {footerNote}
    </section>
  )
}
