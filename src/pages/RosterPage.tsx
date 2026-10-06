import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandedEmptyState } from '../components/brand/BrandedStates'
import FilterPills from '../components/ui/FilterPills'
import ConsolePageLayout from '../components/ui/ConsolePageLayout'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useConsoleSelection } from '../hooks/useConsoleSelection'
import { useInputMode } from '../hooks/useInputMode'
import { formatDisplayId, formatParticipantName } from '../lib/format'
import type { Participant } from '../lib/participants'
import { PARTICIPANT_ROSTER_LIST } from '../lib/participantColumns'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  btnPrimary,
  btnSecondary,
  consoleListButton,
  consoleListButtonActive,
  consolePanelPlaceholder,
  headingPage,
  listCard,
  listRow,
  sectionCard,
  textAccent,
  textMuted,
  textSubtle,
} from '../ui/classes'

type ActiveFilter = 'active' | 'inactive' | 'all'

function matchesSearch(participant: Participant, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  const fullName = formatParticipantName(
    participant.first_name,
    participant.last_initial,
    participant.last_name,
  ).toLowerCase()
  const lastName = participant.last_name?.trim().toLowerCase() ?? ''

  return (
    fullName.includes(normalized) ||
    participant.first_name.toLowerCase().includes(normalized) ||
    participant.last_initial.toLowerCase().includes(normalized) ||
    (lastName.length > 0 && lastName.includes(normalized)) ||
    `${participant.first_name} ${participant.last_initial}`
      .toLowerCase()
      .includes(normalized)
  )
}

function RosterListItem({
  participant,
  active,
  desktop,
  onSelect,
}: {
  participant: Participant
  active: boolean
  desktop: boolean
  onSelect: () => void
}) {
  const name = formatParticipantName(
    participant.first_name,
    participant.last_initial,
    participant.last_name,
  )
  const displayId = formatDisplayId(participant.display_id)
  const inactiveBadge = !participant.active ? (
    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
      Inactive
    </span>
  ) : null

  if (desktop) {
    return (
      <li>
        <button
          type="button"
          onClick={onSelect}
          className={active ? consoleListButtonActive : consoleListButton}
        >
          <span className={`w-14 shrink-0 ${textAccent}`}>{displayId}</span>
          <span className="min-w-0 truncate font-medium text-slate-900">{name}</span>
          {inactiveBadge}
        </button>
      </li>
    )
  }

  return (
    <li className="flex flex-col sm:flex-row sm:items-stretch">
      <Link
        to={`/roster/${participant.id}`}
        className={`${listRow} min-h-16 flex-1 items-center gap-4 px-5 hover:bg-cream-50`}
      >
        <span className={`w-16 shrink-0 ${textAccent}`}>{displayId}</span>
        <span className="min-w-0 flex-1 text-lg font-medium text-slate-900">{name}</span>
        {inactiveBadge}
      </Link>
      {participant.active ? (
        <div className="border-t border-cream-200 px-5 py-3 sm:flex sm:w-36 sm:items-center sm:justify-center sm:border-t-0 sm:border-l">
          <Link
            to={`/lanyards/reprint/${participant.id}`}
            className={`${btnSecondary} w-full text-sm sm:w-auto`}
          >
            Reprint
          </Link>
        </div>
      ) : null}
    </li>
  )
}

function RosterDetailPanel({
  participant,
  reactivating,
  onReactivate,
}: {
  participant: Participant
  reactivating: boolean
  onReactivate: () => void
}) {
  const name = formatParticipantName(
    participant.first_name,
    participant.last_initial,
    participant.last_name,
  )

  return (
    <div className={`${sectionCard} space-y-5`}>
      <div>
        <p className={textAccent}>{formatDisplayId(participant.display_id)}</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">{name}</h2>
        <p className={`mt-1 text-sm ${textMuted}`}>
          {participant.active ? 'Active participant' : 'Inactive — not on live roster'}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link to={`/roster/${participant.id}`} className={`flex-1 ${btnPrimary}`}>
          Edit participant
        </Link>
        {participant.active ? (
          <Link
            to={`/lanyards/reprint/${participant.id}`}
            className={`flex-1 ${btnSecondary}`}
          >
            Reprint lanyard
          </Link>
        ) : (
          <button
            type="button"
            disabled={reactivating}
            onClick={onReactivate}
            className={`flex-1 ${btnSecondary}`}
          >
            {reactivating ? 'Reactivating…' : 'Reactivate'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function RosterPage() {
  const { isDesktopViewport } = useInputMode()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active')
  const [reactivatingId, setReactivatingId] = useState<string | null>(null)

  const loadParticipants = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('participants')
      .select(PARTICIPANT_ROSTER_LIST)
      .order('display_id', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setParticipants([])
    } else {
      setParticipants(
        (data ?? []).map((row) => ({
          ...row,
          guardian_name: '',
          authorized_pickups: [],
          qr_token: '',
          created_at: null,
        })),
      )
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadParticipants()
  }, [loadParticipants])

  const filteredParticipants = useMemo(() => {
    return participants.filter((participant) => {
      if (activeFilter === 'active' && !participant.active) return false
      if (activeFilter === 'inactive' && participant.active) return false
      return matchesSearch(participant, search)
    })
  }, [participants, search, activeFilter])

  const getParticipantId = useCallback((participant: Participant) => participant.id, [])

  const { selected, setSelectedId } = useConsoleSelection(
    filteredParticipants,
    getParticipantId,
    isDesktopViewport,
  )

  async function handleReactivate(participant: Participant) {
    setReactivatingId(participant.id)
    setError(null)

    const { error: updateError } = await supabase
      .from('participants')
      .update({ active: true })
      .eq('id', participant.id)

    setReactivatingId(null)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setParticipants((current) =>
      current.map((row) =>
        row.id === participant.id ? { ...row, active: true } : row,
      ),
    )
  }

  const countLabel = loading
    ? 'Loading participants…'
    : activeFilter === 'inactive'
      ? `${filteredParticipants.length} inactive participant${filteredParticipants.length === 1 ? '' : 's'}`
      : activeFilter === 'all'
        ? `${filteredParticipants.length} participant${filteredParticipants.length === 1 ? '' : 's'}`
        : `${filteredParticipants.length} active participant${filteredParticipants.length === 1 ? '' : 's'}`

  const header = (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className={headingPage}>Boys roster</h1>
        <p className={`mt-1 text-sm ${textSubtle}`}>{countLabel}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link to="/roster/forms" className={btnSecondary}>
          Mark forms
        </Link>
        <Link to="/roster/new" className={btnPrimary}>
          Add participant
        </Link>
      </div>
    </div>
  )

  const filters = (
    <div className="space-y-4">
      <FilterPills
        options={[
          { id: 'active', label: 'Active' },
          { id: 'inactive', label: 'Inactive' },
          { id: 'all', label: 'All' },
        ]}
        value={activeFilter}
        onChange={(id) => setActiveFilter(id as ActiveFilter)}
      />
      <Input
        label="Search by name"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="e.g. Marcus or M"
      />
    </div>
  )

  const emptyMessage = search
    ? 'No participants match your search.'
    : activeFilter === 'inactive'
      ? 'No inactive participants.'
      : activeFilter === 'all'
        ? 'No participants yet. Add the first one to get started.'
        : 'No active participants yet. Add the first one to get started.'

  if (isDesktopViewport) {
    return (
      <ConsolePageLayout
        header={
          <>
            {header}
            {error && <p className={alertErrorInline}>{error}</p>}
          </>
        }
        list={
          <>
            {filters}
            {!loading && !error && filteredParticipants.length === 0 ? (
              <BrandedEmptyState>{emptyMessage}</BrandedEmptyState>
            ) : (
              <ul className={listCard}>
                {filteredParticipants.map((participant) => (
                  <RosterListItem
                    key={participant.id}
                    participant={participant}
                    active={selected?.id === participant.id}
                    desktop
                    onSelect={() => setSelectedId(participant.id)}
                  />
                ))}
              </ul>
            )}
          </>
        }
        panel={
          selected ? (
            <RosterDetailPanel
              participant={selected}
              reactivating={reactivatingId === selected.id}
              onReactivate={() => void handleReactivate(selected)}
            />
          ) : (
            <div className={consolePanelPlaceholder}>
              {loading
                ? 'Loading roster…'
                : filteredParticipants.length === 0
                  ? emptyMessage
                  : 'Select a participant from the list.'}
            </div>
          )
        }
      />
    )
  }

  return (
    <section className="space-y-5">
      {header}
      {filters}
      {error && <p className={alertErrorInline}>{error}</p>}
      {!loading && !error && filteredParticipants.length === 0 && (
        <Card className={`py-10 text-center ${textSubtle}`}>{emptyMessage}</Card>
      )}
      {filteredParticipants.length > 0 && (
        <Card padded={false} className="overflow-hidden">
          <ul>
            {filteredParticipants.map((participant) => (
              <RosterListItem
                key={participant.id}
                participant={participant}
                active={false}
                desktop={false}
                onSelect={() => undefined}
              />
            ))}
          </ul>
        </Card>
      )}
    </section>
  )
}
