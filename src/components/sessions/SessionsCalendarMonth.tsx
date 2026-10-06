import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  formatMonthYearLabel,
  formatSessionLabel,
  shiftMonth,
  todayIsoDate,
  buildMonthGrid,
} from '../../lib/dates'
import {
  formatEventTypeLabel,
  type Session,
  type SessionEventType,
  isSessionEventType,
} from '../../lib/sessions'
import { btnGhost, textMuted, textSubtle } from '../../ui/classes'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const EVENT_TYPE_CHIP: Record<SessionEventType, string> = {
  reading_session:
    'border-crimson-200 bg-crimson-50 text-crimson-900 hover:bg-crimson-100',
  field_trip:
    'border-cream-300 bg-cream-50 text-ink-800 hover:bg-cream-100',
  gala: 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100',
  other: 'border-cream-300 bg-margin-white text-ink-700 hover:bg-cream-50',
}

function chipClassForSession(session: Session): string {
  const type = isSessionEventType(session.event_type)
    ? session.event_type
    : 'other'
  return EVENT_TYPE_CHIP[type]
}

type CurriculumBySession = Map<string, { id: string; title: string }>

type SessionsCalendarMonthProps = {
  year: number
  monthIndex: number
  sessions: Session[]
  curriculumBySession: CurriculumBySession
  onMonthChange: (year: number, monthIndex: number) => void
  onEmptyDay: (isoDate: string) => void
}

export default function SessionsCalendarMonth({
  year,
  monthIndex,
  sessions,
  curriculumBySession,
  onMonthChange,
  onEmptyDay,
}: SessionsCalendarMonthProps) {
  const previewId = useId()
  const today = todayIsoDate()
  const cells = buildMonthGrid(year, monthIndex)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const byDate = new Map<string, Session[]>()

  for (const session of sessions) {
    const list = byDate.get(session.session_date) ?? []
    list.push(session)
    byDate.set(session.session_date, list)
  }

  for (const list of byDate.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title))
  }

  const hovered = hoveredId
    ? (sessions.find((session) => session.id === hoveredId) ?? null)
    : null
  const hoveredCurriculum = hovered
    ? (curriculumBySession.get(hovered.id) ?? null)
    : null

  function go(delta: number) {
    const next = shiftMonth(year, monthIndex, delta)
    onMonthChange(next.year, next.monthIndex)
  }

  function goToday() {
    const now = new Date()
    onMonthChange(now.getFullYear(), now.getMonth())
  }

  return (
    <div className="rounded-[20px] border border-cream-200 bg-margin-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-200 px-3 py-3 sm:px-4">
        <h2 className="text-lg font-semibold text-ink-900">
          {formatMonthYearLabel(year, monthIndex)}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btnGhost} onClick={() => go(-1)}>
            Previous
          </button>
          <button type="button" className={btnGhost} onClick={goToday}>
            Today
          </button>
          <button type="button" className={btnGhost} onClick={() => go(1)}>
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-cream-200 bg-cream-50 text-center text-xs font-medium uppercase tracking-wide text-ink-500">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-1 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr overflow-visible">
        {cells.map((cell) => {
          const daySessions = byDate.get(cell.iso) ?? []
          const isToday = cell.iso === today
          return (
            <div
              key={cell.iso}
              className={`min-h-24 border-b border-r border-cream-100 p-1 sm:min-h-28 sm:p-1.5 ${
                cell.inMonth ? 'bg-margin-white' : 'bg-cream-50/60'
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onEmptyDay(cell.iso)}
                  className={`inline-flex min-h-7 min-w-7 touch-manipulation items-center justify-center rounded-full text-sm font-medium ${
                    isToday
                      ? 'bg-crimson-600 text-cream-50'
                      : cell.inMonth
                        ? 'text-ink-800 hover:bg-cream-100'
                        : `${textMuted} hover:bg-cream-100`
                  }`}
                  title={`New event on ${cell.iso}`}
                  aria-label={`New event on ${cell.iso}`}
                >
                  {cell.day}
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {daySessions.map((session) => {
                  const hasCurriculum = curriculumBySession.has(session.id)
                  const isHovered = hoveredId === session.id
                  return (
                    <div
                      key={session.id}
                      className="relative"
                      onMouseEnter={() => setHoveredId(session.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onFocus={() => setHoveredId(session.id)}
                      onBlur={() => setHoveredId(null)}
                    >
                      <Link
                        to={`/sessions/${session.id}`}
                        className={`block w-full touch-manipulation rounded-md border px-1.5 py-1 text-left text-[11px] leading-snug sm:text-xs ${chipClassForSession(session)} ${
                          isHovered ? 'ring-2 ring-crimson-500 ring-offset-1' : ''
                        }`}
                        aria-describedby={
                          isHovered ? `${previewId}-${session.id}` : undefined
                        }
                      >
                        <span className="line-clamp-2 font-semibold">
                          {session.title}
                        </span>
                        <span
                          className={`mt-0.5 block truncate ${textSubtle} opacity-80`}
                        >
                          {formatEventTypeLabel(session.event_type)}
                          {session.requires_check_in ? ' · in' : ''}
                          {session.supports_reading ? ' · read' : ''}
                          {hasCurriculum ? ' · unit' : ''}
                        </span>
                      </Link>

                      {isHovered && (
                        <div
                          id={`${previewId}-${session.id}`}
                          role="tooltip"
                          className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-56 rounded-xl border border-cream-200 bg-margin-white p-3 text-left shadow-card sm:block"
                        >
                          <p className="text-sm font-semibold text-ink-900">
                            {formatSessionLabel(
                              session.title,
                              session.session_date,
                            )}
                          </p>
                          <p className={`mt-1 text-xs ${textSubtle}`}>
                            {formatEventTypeLabel(session.event_type)}
                          </p>
                          <ul className={`mt-2 space-y-1 text-xs ${textMuted}`}>
                            <li>
                              Check-in:{' '}
                              {session.requires_check_in
                                ? 'Required'
                                : 'Not required'}
                            </li>
                            <li>
                              Reading / quiz:{' '}
                              {session.supports_reading
                                ? 'Supported'
                                : 'Not supported'}
                            </li>
                            {hoveredCurriculum && (
                              <li>Curriculum: {hoveredCurriculum.title}</li>
                            )}
                          </ul>
                          <p className={`mt-2 text-xs font-medium text-crimson-700`}>
                            Click to edit
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
