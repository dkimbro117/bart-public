import { formatDisplayId, formatParticipantName } from '../../lib/format'
import type { AttendanceWithParticipant } from '../../lib/attendance'
import { listRow, surfaceCard } from '../../ui/classes'

type LiveRosterListProps = {
  title: string
  rows: AttendanceWithParticipant[]
  emptyMessage: string
  showPickup?: boolean
  checkoutAction?: (row: AttendanceWithParticipant) => void
}

function LiveRosterList({
  title,
  rows,
  emptyMessage,
  showPickup = false,
  checkoutAction,
}: LiveRosterListProps) {
  return (
    <section className={`${surfaceCard} overflow-hidden border border-cream-200`}>
      <div className="border-b border-cream-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{rows.length} total</p>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-slate-600">{emptyMessage}</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.id} className={`${listRow} flex-col items-stretch sm:flex-row sm:items-center`}>
              <div className="flex min-w-0 flex-1 items-center gap-4 px-4">
                <span className="w-16 shrink-0 font-mono text-sm font-semibold text-crimson-600">
                  {formatDisplayId(row.participants.display_id)}
                </span>
                <span className="truncate text-base font-medium text-slate-900">
                  {formatParticipantName(
                    row.participants.first_name,
                    row.participants.last_initial,
                    row.participants.last_name,
                  )}
                </span>
              </div>
              {checkoutAction && !row.checked_out_at && (
                <div className="px-4 pb-3 sm:pb-0 sm:pr-4">
                  <button
                    type="button"
                    onClick={() => checkoutAction(row)}
                    className="min-h-11 rounded-[14px] bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"
                  >
                    Check out
                  </button>
                </div>
              )}
              {showPickup && row.pickup_name && (
                <span className="px-4 pb-1 text-sm text-slate-600 sm:shrink-0 sm:pb-0 sm:pr-4">
                  with {row.pickup_name}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default LiveRosterList
