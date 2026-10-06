import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { usePendingRegistrationCount } from '../hooks/usePendingRegistrationCount'
import { isFeatureEnabled } from '../lib/features'
import { isDoorHelper } from '../lib/auth'
import { clearLocalCache } from '../lib/sync'
import { listRow } from '../ui/classes'

type AdminDrawerProps = {
  open: boolean
  onClose: () => void
}

type DrawerLink = {
  to: string
  label: string
  adminOnly?: boolean
  showPendingBadge?: boolean
}

const drawerSections: { title: string; links: DrawerLink[] }[] = [
  {
    title: 'Today',
    links: [
      { to: '/check-in', label: 'Check in' },
      { to: '/check-out', label: 'Check out' },
      { to: '/roster-live', label: 'Live roster' },
      { to: '/reading', label: 'Staff reading log' },
    ],
  },
  {
    title: 'People',
    links: [
      { to: '/roster', label: 'Boys roster' },
      { to: '/roster/forms', label: 'Mark forms' },
      {
        to: '/registrations',
        label: 'Registrations',
        showPendingBadge: true,
      },
      { to: '/door-helpers', label: 'BART Volunteers' },
    ],
  },
  {
    title: 'Program',
    links: [
      { to: '/sessions', label: 'Sessions & events', adminOnly: true },
      { to: '/curriculum', label: 'Curriculum' },
      { to: '/lanyards', label: 'Lanyards' },
    ],
  },
  {
    title: 'Admin',
    links: [
      { to: '/family-links', label: 'Email family link', adminOnly: true },
      ...(isFeatureEnabled('ai')
        ? [{ to: '/settings/ai', label: 'AI automations', adminOnly: true }]
        : []),
    ],
  },
  {
    title: 'Insights',
    links: [
      { to: '/reports', label: 'Reports' },
      { to: '/bucks', label: 'BART Bucks', adminOnly: true },
      { to: '/messages', label: 'Messages', adminOnly: true },
    ],
  },
]

export default function AdminDrawer({ open, onClose }: AdminDrawerProps) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { count: pendingRegistrationCount } = usePendingRegistrationCount()
  const { refreshRoster, connectionState, selectedSessionId } = useSyncStatus()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) {
    return null
  }

  async function handleRefreshRoster() {
    setRefreshing(true)
    try {
      await refreshRoster()
      onClose()
    } finally {
      setRefreshing(false)
    }
  }

  async function handleSignOut() {
    onClose()
    await clearLocalCache()
    await signOut()
    navigate(isDoorHelper(profile) ? '/door' : '/login', { replace: true })
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex flex-col justify-end lg:justify-stretch lg:flex-row">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-crimson-950/30"
        onClick={onClose}
      />
      <aside
        className="relative flex max-h-[85vh] flex-col rounded-t-[20px] bg-white shadow-card lg:ml-auto lg:h-full lg:max-h-none lg:w-full lg:max-w-sm lg:rounded-none lg:rounded-l-[20px]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
          <p className="text-lg font-semibold text-slate-900">Menu</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full text-slate-500 hover:bg-cream-100"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-5 py-2" aria-label="Admin menu">
          <button
            type="button"
            disabled={
              refreshing ||
              connectionState === 'offline' ||
              !selectedSessionId
            }
            onClick={() => void handleRefreshRoster()}
            className={`${listRow} w-full justify-between text-base font-medium text-slate-900 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Refresh roster
            {refreshing && (
              <span className="text-xs font-normal text-slate-500">Refreshing…</span>
            )}
          </button>

          {!isDoorHelper(profile) && (
            <Link
              to="/"
              onClick={onClose}
              className={`${listRow} text-base font-medium text-slate-900 hover:bg-cream-50`}
            >
              Home
            </Link>
          )}

          {!isDoorHelper(profile) &&
            drawerSections
            .filter((section) => section.links.length > 0)
            .map((section) => (
            <div key={section.title} className="mt-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {section.title}
              </p>
              <ul>
                {section.links
                  .filter(
                    (item) => !item.adminOnly || profile?.role === 'admin',
                  )
                  .map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={onClose}
                        className={`${listRow} justify-between text-base text-slate-800 hover:bg-cream-50`}
                      >
                        {item.label}
                        {item.showPendingBadge && pendingRegistrationCount > 0 && (
                          <span className="rounded-full bg-crimson-600 px-2 py-0.5 text-xs font-semibold text-cream-50">
                            {pendingRegistrationCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-cream-200 p-5">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex min-h-12 w-full touch-manipulation items-center justify-center py-3 text-center text-base font-medium text-crimson-700 hover:text-crimson-600"
          >
            Sign out
          </button>
        </div>
      </aside>
    </div>
  )
}
