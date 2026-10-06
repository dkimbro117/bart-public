import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrandedEmptyState } from '../components/brand/BrandedStates'
import ConfirmPanel from '../components/ui/ConfirmPanel'
import ConsolePageLayout from '../components/ui/ConsolePageLayout'
import { Link } from 'react-router-dom'
import { useConsoleSelection } from '../hooks/useConsoleSelection'
import { useInputMode } from '../hooks/useInputMode'
import { formatDisplayId } from '../lib/format'
import { VOLUNTEER_ROSTER_LIST } from '../lib/volunteerColumns'
import {
  formatVolunteerContact,
  matchesVolunteerLookup,
  type VolunteerRosterRow,
} from '../lib/volunteers'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  btnPrimary,
  btnSecondary,
  btnWarning,
  consoleListButton,
  consoleListButtonActive,
  consolePanelPlaceholder,
  headingPage,
  inputClass,
  labelClass,
  listCard,
  listRowLink,
  sectionCard,
  textAccent,
  textMuted,
  textSubtle,
} from '../ui/classes'

function VolunteerDetailPanel({
  volunteer,
  onDeactivate,
  deactivating,
}: {
  volunteer: VolunteerRosterRow
  onDeactivate: () => void
  deactivating: boolean
}) {
  return (
    <div className={`${sectionCard} space-y-5`}>
      <div>
        <p className={textAccent}>{formatDisplayId(volunteer.display_id)}</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">{volunteer.full_name}</h2>
        <p className={`mt-2 text-sm ${textMuted}`}>
          {formatVolunteerContact(volunteer.email, volunteer.phone)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link to={`/volunteers/${volunteer.id}`} className={btnPrimary}>
          Edit volunteer
        </Link>
        <Link
          to={`/volunteers/reprint/${volunteer.id}`}
          className={btnSecondary}
        >
          Print badge
        </Link>
        <button
          type="button"
          disabled={deactivating}
          onClick={onDeactivate}
          className={btnWarning}
        >
          {deactivating ? 'Deactivating…' : 'Deactivate'}
        </button>
      </div>
    </div>
  )
}

export default function VolunteersPage() {
  const { isDesktopViewport } = useInputMode()
  const [volunteers, setVolunteers] = useState<VolunteerRosterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [pendingDeactivate, setPendingDeactivate] = useState<VolunteerRosterRow | null>(
    null,
  )

  const loadVolunteers = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('volunteers')
      .select(VOLUNTEER_ROSTER_LIST)
      .eq('active', true)
      .order('display_id', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setVolunteers([])
    } else {
      setVolunteers(data ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadVolunteers()
  }, [loadVolunteers])

  const filteredVolunteers = useMemo(
    () =>
      volunteers.filter((volunteer) => matchesVolunteerLookup(volunteer, search)),
    [volunteers, search],
  )

  const getVolunteerId = useCallback((volunteer: VolunteerRosterRow) => volunteer.id, [])

  const { selected, setSelectedId } = useConsoleSelection(
    filteredVolunteers,
    getVolunteerId,
    isDesktopViewport,
  )

  async function handleDeactivate(volunteer: VolunteerRosterRow) {
    setDeactivatingId(volunteer.id)
    setError(null)
    setPendingDeactivate(null)

    const { error: updateError } = await supabase
      .from('volunteers')
      .update({ active: false })
      .eq('id', volunteer.id)

    setDeactivatingId(null)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setVolunteers((current) => current.filter((row) => row.id !== volunteer.id))
  }

  const countLabel = loading
    ? 'Loading volunteers…'
    : `${filteredVolunteers.length} active volunteer${filteredVolunteers.length === 1 ? '' : 's'}`

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className={headingPage}>Volunteers</h1>
        <p className={`mt-1 ${textSubtle}`}>{countLabel}</p>
        <p className={`mt-1 text-sm ${textMuted}`}>
          Manual adds and JotForm ingest share this roster.
        </p>
      </div>
      <Link to="/volunteers/new" className={btnPrimary}>
        Add volunteer
      </Link>
    </div>
  )

  const searchField = (
    <label className="block">
      <span className={labelClass}>Search by name, email, phone, or #display_id</span>
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="e.g. Denise or denise@chapter.org"
        className={inputClass}
      />
    </label>
  )

  const emptyMessage = search
    ? 'No volunteers match your search.'
    : 'No active volunteers yet. Add one manually or wait for JotForm ingest.'

  const confirmPanel = pendingDeactivate && (
    <ConfirmPanel
      title="Deactivate volunteer?"
      confirmLabel="Deactivate"
      tone="amber"
      loading={deactivatingId === pendingDeactivate.id}
      onConfirm={() => void handleDeactivate(pendingDeactivate)}
      onCancel={() => setPendingDeactivate(null)}
    >
      Deactivate <strong>{pendingDeactivate.full_name}</strong> (
      {formatDisplayId(pendingDeactivate.display_id)})? They will be hidden from the
      active roster but stay in the database.
    </ConfirmPanel>
  )

  if (isDesktopViewport) {
    return (
      <>
        <ConsolePageLayout
          header={
            <>
              {header}
              {error && <p className={alertErrorInline}>{error}</p>}
              {confirmPanel}
            </>
          }
          list={
            <>
              {searchField}
              {!loading && !error && filteredVolunteers.length === 0 ? (
                <BrandedEmptyState>{emptyMessage}</BrandedEmptyState>
              ) : (
                <ul className={listCard}>
                  {filteredVolunteers.map((volunteer) => (
                    <li key={volunteer.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(volunteer.id)}
                        className={
                          selected?.id === volunteer.id
                            ? consoleListButtonActive
                            : consoleListButton
                        }
                      >
                        <span className={`w-14 shrink-0 ${textAccent}`}>
                          {formatDisplayId(volunteer.display_id)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="block font-semibold text-slate-900">
                            {volunteer.full_name}
                          </span>
                          <span className={`block text-sm ${textMuted}`}>
                            {formatVolunteerContact(volunteer.email, volunteer.phone)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          }
          panel={
            selected ? (
              <VolunteerDetailPanel
                volunteer={selected}
                deactivating={deactivatingId === selected.id}
                onDeactivate={() => setPendingDeactivate(selected)}
              />
            ) : (
              <div className={consolePanelPlaceholder}>
                {loading
                  ? 'Loading volunteers…'
                  : filteredVolunteers.length === 0
                    ? emptyMessage
                    : 'Select a volunteer from the list.'}
              </div>
            )
          }
        />
      </>
    )
  }

  return (
    <section className="space-y-6">
      {header}
      {searchField}
      {error && <p className={alertErrorInline}>{error}</p>}
      {!loading && !error && filteredVolunteers.length === 0 && (
        <BrandedEmptyState>{emptyMessage}</BrandedEmptyState>
      )}
      {confirmPanel}
      <ul className={listCard}>
        {filteredVolunteers.map((volunteer) => (
          <li key={volunteer.id} className="flex flex-col lg:flex-row lg:items-stretch">
            <Link to={`/volunteers/${volunteer.id}`} className={listRowLink}>
              <span className={`w-16 shrink-0 ${textAccent}`}>
                {formatDisplayId(volunteer.display_id)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-slate-900">
                  {volunteer.full_name}
                </span>
                <span className={`mt-0.5 block text-sm ${textMuted}`}>
                  {formatVolunteerContact(volunteer.email, volunteer.phone)}
                </span>
              </span>
            </Link>
            <div className="flex flex-col gap-2 border-t border-cream-200 px-4 py-3 sm:flex-row sm:items-center sm:border-t-0 sm:border-l lg:shrink-0">
              <Link
                to={`/volunteers/reprint/${volunteer.id}`}
                className={`text-sm ${btnSecondary}`}
              >
                Print badge
              </Link>
              <button
                type="button"
                disabled={deactivatingId === volunteer.id}
                onClick={() => setPendingDeactivate(volunteer)}
                className={btnWarning}
              >
                {deactivatingId === volunteer.id ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
