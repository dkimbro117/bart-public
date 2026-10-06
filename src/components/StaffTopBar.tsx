import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BartWordmark from './brand/BartWordmark'
import { useAuth } from '../contexts/AuthContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { buildConnectionNotice } from '../lib/connectionNotice'
import { formatSessionOptionLabel } from '../lib/dates'
import { iconButton, inputClass } from '../ui/classes'

type StaffTopBarProps = {
  onOpenMenu?: () => void
  eventButton?: ReactNode
  homeButton?: ReactNode
  brandLink?: string
}

export default function StaffTopBar({
  onOpenMenu,
  eventButton,
  homeButton,
  brandLink,
}: StaffTopBarProps) {
  const { session, profile } = useAuth()
  const {
    connectionState,
    pendingCount,
    sessions,
    selectedSessionId,
    setSelectedSessionId,
    syncNow,
    initializing,
    syncError,
  } = useSyncStatus()

  const displayName =
    profile?.full_name?.trim() ||
    session?.user.email?.split('@')[0] ||
    'Staff'

  const connectionLabel =
    connectionState === 'online'
      ? 'Online'
      : connectionState === 'unreachable'
        ? 'Unreachable'
        : 'Offline'

  const connectionTone =
    connectionState === 'online'
      ? 'text-emerald-700'
      : connectionState === 'unreachable'
        ? 'text-red-700'
        : 'text-amber-700'

  const connectionNotice = buildConnectionNotice(connectionState, pendingCount)

  return (
    <header className="app-shell-header no-print sticky top-0 z-30 border-b border-cream-200 bg-cream-50/95 backdrop-blur-sm lg:static">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:max-w-none lg:gap-4 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-3 lg:flex-1">
            <div className="min-w-0 flex-1">
              {brandLink ? (
                <Link to={brandLink} className="inline-block lg:hidden">
                  <BartWordmark size="sm" />
                </Link>
              ) : (
                <div className="lg:hidden">
                  <BartWordmark size="sm" />
                </div>
              )}
              <p className="truncate text-xs text-ink-700 lg:text-sm">{displayName}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <span
                className={`hidden rounded-full px-2 py-1 text-xs font-medium sm:inline ${connectionTone} bg-white ring-1 ring-cream-200`}
                title={connectionLabel}
              >
                {connectionLabel}
              </span>
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full sm:hidden ${
                  connectionState === 'online'
                    ? 'bg-emerald-600'
                    : connectionState === 'unreachable'
                      ? 'bg-red-600'
                      : 'bg-amber-500'
                }`}
                title={connectionLabel}
                aria-label={connectionLabel}
              />
              <button
                type="button"
                disabled={connectionState === 'offline' || pendingCount === 0}
                onClick={() => void syncNow()}
                className="inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-cream-200 bg-white px-3 text-xs font-semibold text-crimson-700 hover:bg-cream-100 disabled:opacity-40 lg:min-h-12 lg:text-sm"
              >
                <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                </svg>
                Sync
                {pendingCount > 0 && (
                  <span className="rounded-full bg-crimson-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-cream-50">
                    {pendingCount}
                  </span>
                )}
              </button>
              {onOpenMenu && (
                <button
                  type="button"
                  onClick={onOpenMenu}
                  aria-label="More options"
                  className={iconButton}
                >
                  <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                  </svg>
                </button>
              )}
              {eventButton}
              {homeButton}
            </div>
          </div>

          <label className="block lg:min-w-[20rem] lg:flex-1">
            <span className="sr-only">Session</span>
            <select
              value={selectedSessionId}
              disabled={sessions.length === 0}
              onChange={(event) => void setSelectedSessionId(event.target.value)}
              className={`${inputClass} py-2 text-sm lg:text-base`}
            >
              {sessions.length === 0 ? (
                <option value="">No cached sessions</option>
              ) : (
                sessions.map((cachedSession) => (
                  <option key={cachedSession.id} value={cachedSession.id}>
                    {formatSessionOptionLabel(
                      cachedSession.title,
                      cachedSession.session_date,
                    )}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        {initializing && (
          <p className="text-xs text-slate-600 lg:text-sm">Caching roster…</p>
        )}

        {connectionNotice && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
            {connectionNotice}
          </p>
        )}

        {syncError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200 lg:text-sm">
            {syncError}
          </p>
        )}
      </div>
    </header>
  )
}
