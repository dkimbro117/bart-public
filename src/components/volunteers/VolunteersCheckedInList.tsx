import { formatDateTime } from '../../lib/dates'
import { formatDisplayId } from '../../lib/format'
import type { VolunteerAttendanceWithVolunteer } from '../../lib/volunteerAttendance'
import {
  headingSection,
  listCard,
  listCardHeader,
  textAccent,
  textMuted,
} from '../../ui/classes'

type VolunteersCheckedInListProps = {
  rows: VolunteerAttendanceWithVolunteer[]
  loading?: boolean
}

export default function VolunteersCheckedInList({
  rows,
  loading = false,
}: VolunteersCheckedInListProps) {
  return (
    <section className={listCard}>
      <div className={listCardHeader}>
        <h2 className={headingSection}>Checked in now</h2>
        <p className={`text-sm ${textMuted}`}>
          {loading ? 'Updating…' : `${rows.length} on site`}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className={`px-4 py-8 text-center ${textMuted}`}>
          No volunteers checked in for this session yet.
        </p>
      ) : (
        <ul className="divide-y divide-cream-200">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex min-h-14 flex-col justify-center gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <span className={`w-16 shrink-0 ${textAccent}`}>
                  {formatDisplayId(row.volunteers.display_id)}
                </span>
                <span className="text-base font-semibold text-slate-900">
                  {row.volunteers.full_name}
                </span>
              </div>
              {row.checked_in_at && (
                <span className={`text-sm ${textMuted} sm:text-right`}>
                  Since {formatDateTime(row.checked_in_at)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
