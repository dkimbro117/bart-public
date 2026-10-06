import { useSyncStatus } from '../contexts/SyncContext'
import { alertWarning } from '../ui/classes'

/**
 * Guard for the missing-session case only. The header session picker is
 * sticky on every staff page, so repeating the session name below the title
 * was ~40pt of duplication on the check-in hot path.
 */
export default function SessionBanner({ verb }: { verb: string }) {
  const { selectedSessionId, sessions, initializing } = useSyncStatus()

  if (initializing) {
    return <p className="text-sm text-slate-600">Loading session…</p>
  }

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? null

  if (selectedSession) {
    return null
  }

  return (
    <p className={`${alertWarning} text-sm text-amber-900`}>
      No session selected. Choose a session in the header before {verb}.
    </p>
  )
}
