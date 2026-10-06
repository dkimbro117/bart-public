import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ConsolePageLayout from '../components/ui/ConsolePageLayout'
import AdminAccessNotice from '../components/AdminAccessNotice'
import SessionsCalendarMonth from '../components/sessions/SessionsCalendarMonth'
import { useAuth } from '../contexts/AuthContext'
import { useConsoleSelection } from '../hooks/useConsoleSelection'
import { useInputMode } from '../hooks/useInputMode'
import { isStaffAdmin } from '../lib/auth'
import { formatSessionLabel } from '../lib/dates'
import { CURRICULUM_UNIT_LIST } from '../lib/curriculumColumns'
import {
  formatEventTypeLabel,
  SESSION_LIST_COLUMNS,
  type Session,
} from '../lib/sessions'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  btnPrimary,
  consoleListButton,
  consoleListButtonActive,
  consolePanelPlaceholder,
  filterPill,
  filterPillActive,
  headingPage,
  listCard,
  sectionCard,
  textMuted,
  textSubtle,
} from '../ui/classes'

type ViewMode = 'calendar' | 'list'

type CurriculumLink = {
  id: string
  title: string
}

export default function SessionsPage() {
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()
  const isAdmin = isStaffAdmin(profile)
  const { isDesktopViewport } = useInputMode()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [curriculumBySession, setCurriculumBySession] = useState<
    Map<string, CurriculumLink>
  >(new Map())
  const todayParts = useMemo(() => {
    const now = new Date()
    return { year: now.getFullYear(), monthIndex: now.getMonth() }
  }, [])
  const [monthYear, setMonthYear] = useState(todayParts.year)
  const [monthIndex, setMonthIndex] = useState(todayParts.monthIndex)

  const loadSessionsList = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [sessionsResult, unitsResult] = await Promise.all([
      supabase
        .from('sessions')
        .select(SESSION_LIST_COLUMNS)
        .order('session_date', { ascending: false }),
      supabase
        .from('curriculum_units')
        .select(CURRICULUM_UNIT_LIST)
        .not('session_id', 'is', null),
    ])

    if (sessionsResult.error) {
      setError(sessionsResult.error.message)
      setSessions([])
    } else {
      setSessions((sessionsResult.data ?? []) as Session[])
    }

    const map = new Map<string, CurriculumLink>()
    if (!unitsResult.error && unitsResult.data) {
      for (const unit of unitsResult.data) {
        if (unit.session_id) {
          map.set(unit.session_id, { id: unit.id, title: unit.title })
        }
      }
    }
    setCurriculumBySession(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isAdmin) {
      void loadSessionsList()
    }
  }, [isAdmin, loadSessionsList])

  const getSessionId = useCallback((session: Session) => session.id, [])
  const { selected, setSelectedId } = useConsoleSelection(
    sessions,
    getSessionId,
    isDesktopViewport && viewMode === 'list',
  )

  if (authLoading) {
    return (
      <section className="mx-auto max-w-2xl">
        <p className={textSubtle}>Loading account…</p>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <AdminAccessNotice
        title="Sessions & events"
        actionLabel="create or edit sessions"
        backTo="/"
        backLabel="Back to home"
      />
    )
  }

  const header = (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={headingPage}>Sessions & events</h1>
          <p className={`mt-1 ${textSubtle}`}>
            Season calendar for reading nights, field trips, and other chapter
            events. Hover a gathering for a preview; click to edit. Tap a day
            number to add an event.
          </p>
        </div>
        <Link to="/sessions/new" className={btnPrimary}>
          New event
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={viewMode === 'calendar' ? filterPillActive : filterPill}
          onClick={() => setViewMode('calendar')}
        >
          Calendar
        </button>
        <button
          type="button"
          className={viewMode === 'list' ? filterPillActive : filterPill}
          onClick={() => setViewMode('list')}
        >
          List
        </button>
      </div>
      {error && <p className={alertErrorInline}>{error}</p>}
    </>
  )

  const listView = (
    <div className={listCard}>
      {loading ? (
        <p className={`${textSubtle} p-4`}>Loading…</p>
      ) : sessions.length === 0 ? (
        <p className={`${textSubtle} p-4`}>
          No sessions yet. Create the first event.
        </p>
      ) : (
        <ul className="divide-y divide-cream-200">
          {sessions.map((session) => {
            const active = selected?.id === session.id
            return (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(session.id)}
                  className={
                    active ? consoleListButtonActive : consoleListButton
                  }
                >
                  <span className="font-medium text-slate-900">
                    {formatSessionLabel(session.title, session.session_date)}
                  </span>
                  <span className={`mt-1 block ${textMuted}`}>
                    {formatEventTypeLabel(session.event_type)}
                    {session.supports_reading ? ' · reading' : ''}
                    {session.requires_check_in ? ' · check-in' : ''}
                    {curriculumBySession.has(session.id) ? ' · unit' : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )

  const calendarView = loading ? (
    <div className={sectionCard}>
      <p className={textSubtle}>Loading…</p>
    </div>
  ) : (
    <SessionsCalendarMonth
      year={monthYear}
      monthIndex={monthIndex}
      sessions={sessions}
      curriculumBySession={curriculumBySession}
      onMonthChange={(nextYear, nextMonth) => {
        setMonthYear(nextYear)
        setMonthIndex(nextMonth)
      }}
      onEmptyDay={(isoDate) => {
        navigate(`/sessions/new?date=${isoDate}`)
      }}
    />
  )

  const selectedCurriculum = selected
    ? (curriculumBySession.get(selected.id) ?? null)
    : null

  const listPanel = selected ? (
    <div className={`${sectionCard} space-y-4`}>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {formatSessionLabel(selected.title, selected.session_date)}
        </h2>
        <p className={`mt-1 ${textSubtle}`}>
          {formatEventTypeLabel(selected.event_type)}
        </p>
      </div>
      <dl className={`space-y-2 text-sm ${textMuted}`}>
        <div>
          <dt className="font-medium text-slate-700">Check-in</dt>
          <dd>{selected.requires_check_in ? 'Required' : 'Not required'}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-700">Reading / quiz</dt>
          <dd>{selected.supports_reading ? 'Supported' : 'Not supported'}</dd>
        </div>
        {selectedCurriculum && (
          <div>
            <dt className="font-medium text-slate-700">Curriculum</dt>
            <dd>{selectedCurriculum.title}</dd>
          </div>
        )}
      </dl>
      <Link to={`/sessions/${selected.id}`} className={btnPrimary}>
        Edit event
      </Link>
    </div>
  ) : (
    <div className={consolePanelPlaceholder}>
      Select a session to preview, or create a new event.
    </div>
  )

  if (viewMode === 'calendar') {
    return (
      <section className="space-y-5">
        {header}
        {calendarView}
      </section>
    )
  }

  if (isDesktopViewport) {
    return (
      <ConsolePageLayout header={header} list={listView} panel={listPanel} />
    )
  }

  return (
    <section className="space-y-6">
      {header}
      {listView}
      {selected && listPanel}
    </section>
  )
}
