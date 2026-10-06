import type { ReactNode } from 'react'
import { useSyncStatus } from '../contexts/SyncContext'
import { alertInfo, alertWarning, btnPrimary } from '../ui/classes'

type RosterCacheGateProps = {
  children: ReactNode
}

export default function RosterCacheGate({ children }: RosterCacheGateProps) {
  const {
    connectionState,
    rosterCached,
    rosterCacheChecking,
    refreshRoster,
    initializing,
  } = useSyncStatus()

  if (initializing || rosterCacheChecking) {
    return (
      <p className={`${alertInfo} text-sm text-slate-700`}>
        Checking offline roster cache…
      </p>
    )
  }

  if (connectionState === 'online' && !rosterCached) {
    return (
      <div className={alertWarning}>
        <p className="text-lg font-bold text-amber-900">Refresh roster first</p>
        <p className="mt-2 text-sm text-slate-700">
          This device needs a cached roster before scanning. Tap refresh while
          connected so check-in and check-out work if Wi‑Fi drops.
        </p>
        <button
          type="button"
          onClick={() => void refreshRoster()}
          className={`${btnPrimary} mt-4 min-h-14 w-full bg-amber-600 text-lg hover:bg-amber-700`}
        >
          Refresh roster
        </button>
      </div>
    )
  }

  return <>{children}</>
}
