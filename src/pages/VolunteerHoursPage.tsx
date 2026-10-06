import { useCallback, useEffect, useState } from 'react'
import { BrandedEmptyState } from '../components/brand/BrandedStates'
import { formatDateTime, todayIsoDate } from '../lib/dates'
import { formatDisplayId } from '../lib/format'
import {
  downloadVolunteerHoursCsv,
  fetchVolunteerHoursReport,
  formatHours,
  formatVolunteerSessionLabel,
  type VolunteerHoursSummary,
} from '../lib/volunteerHours'
import {
  alertErrorInline,
  badgeWarning,
  btnPrimary,
  headingPage,
  headingSection,
  inputClass,
  labelClass,
  listCard,
  textAccent,
  textMuted,
  textSubtle,
} from '../ui/classes'

function defaultStartDate(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function VolunteerHoursPage() {
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(todayIsoDate)
  const [rows, setRows] = useState<VolunteerHoursSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) {
      setError('Choose a valid date range.')
      setRows([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const report = await fetchVolunteerHoursReport(startDate, endDate)
      setRows(report)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load volunteer hours.',
      )
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [endDate, startDate])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const totalCompletedHours = rows.reduce(
    (sum, volunteer) => sum + volunteer.totalHours,
    0,
  )
  const totalOpenSessions = rows.reduce(
    (sum, volunteer) => sum + volunteer.openSessionCount,
    0,
  )

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={headingPage}>Volunteer hours</h1>
          <p className={`mt-1 ${textSubtle}`}>
            Completed sessions count toward totals. Open check-ins are flagged, not
            counted as zero.
          </p>
        </div>

        <button
          type="button"
          disabled={loading || rows.length === 0}
          onClick={() => downloadVolunteerHoursCsv(rows, startDate, endDate)}
          className={btnPrimary}
        >
          Export CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className={labelClass}>
            From
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>
            To
          </span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={inputClass}
          />
        </label>

        <div className={`${listCard} px-4 py-3 sm:col-span-2`}>
          <p className={`text-sm ${textMuted}`}>Range summary</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatHours(totalCompletedHours)} completed hours
          </p>
          {totalOpenSessions > 0 && (
            <p className="mt-1 text-sm text-amber-800">
              {totalOpenSessions} open check-in
              {totalOpenSessions === 1 ? '' : 's'} not counted
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className={alertErrorInline}>{error}</p>
      )}

      {loading && <p className={textMuted}>Loading report…</p>}

      {!loading && !error && rows.length === 0 && (
        <BrandedEmptyState>
          No volunteer attendance in this date range.
        </BrandedEmptyState>
      )}

      <div className="space-y-6">
        {rows.map((volunteer) => (
          <section
            key={volunteer.volunteerId}
            className={`overflow-hidden ${listCard}`}
          >
            <div className="flex flex-col gap-2 border-b border-cream-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={textAccent}>
                  {formatDisplayId(volunteer.displayId)}
                </p>
                <h2 className={headingSection}>{volunteer.fullName}</h2>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-lg font-semibold text-slate-900">
                  {formatHours(volunteer.totalHours)} hrs
                </p>
                {volunteer.openSessionCount > 0 && (
                  <p className="text-sm text-amber-800">
                    {volunteer.openSessionCount} open session
                    {volunteer.openSessionCount === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            </div>

            <ul className="divide-y divide-cream-200">
              {volunteer.sessions.map((session) => (
                <li
                  key={session.attendanceId}
                  className="grid gap-2 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {formatVolunteerSessionLabel(
                        session.sessionTitle,
                        session.sessionDate,
                      )}
                    </p>
                    <p className={`mt-1 text-sm ${textMuted}`}>
                      In {formatDateTime(session.checkedInAt)}
                      {session.checkedOutAt
                        ? ` · Out ${formatDateTime(session.checkedOutAt)}`
                        : ''}
                    </p>
                  </div>
                  <p className={`text-sm ${textMuted} sm:self-center`}>
                    {session.sessionDate}
                  </p>
                  <div className="sm:text-right">
                    {session.isOpen ? (
                      <span className={badgeWarning}>
                        Open
                      </span>
                    ) : (
                      <span className="text-base font-semibold text-slate-900">
                        {formatHours(session.hours ?? 0)} hrs
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  )
}
