import { useMemo, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRightOnRectangleIcon,
  ArrowRightIcon,
  Bars3BottomLeftIcon,
  BookOpenIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { useAttendanceCounts } from '../hooks/useAttendanceCounts'
import { useInputMode } from '../hooks/useInputMode'
import { usePendingRegistrationCount } from '../hooks/usePendingRegistrationCount'
import { formatSessionLabel, todayIsoDate } from '../lib/dates'
import { isFeatureEnabled } from '../lib/features'
import {
  alertWarningInline,
  btnSecondary,
  headingPage,
  sectionCard,
  textMuted,
  textSubtle,
} from '../ui/classes'

type QuickActionProps = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  badge?: number
  fieldRoute?: boolean
}

function QuickAction({ to, label, icon: Icon, badge, fieldRoute }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="flex min-h-14 touch-manipulation items-center gap-3 rounded-xl border border-cream-200 bg-margin-white px-4 py-3 hover:bg-cream-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-crimson-600/10">
        <Icon className="h-5 w-5 text-crimson-600" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold text-ink-900">{label}</span>
      {fieldRoute && (
        <DevicePhoneMobileIcon
          aria-hidden
          className="h-4 w-4 shrink-0 text-ink-400"
          title="Best on tablet"
        />
      )}
      {badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-crimson-600 px-2 py-0.5 text-xs font-semibold text-cream-50">
          {badge}
        </span>
      )}
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
    </Link>
  )
}

type ConsoleLinkProps = {
  to: string
  label: string
  description: string
  badge?: number
}

function ConsoleLink({ to, label, description, badge }: ConsoleLinkProps) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-cream-200 bg-margin-white px-4 py-3 hover:bg-cream-50"
    >
      <div className="min-w-0">
        <p className="font-semibold text-ink-900">{label}</p>
        <p className={`text-sm ${textMuted}`}>{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge !== undefined && badge > 0 && (
          <span className="rounded-full bg-crimson-600 px-2 py-0.5 text-xs font-semibold text-cream-50">
            {badge}
          </span>
        )}
        <ArrowRightIcon className="h-4 w-4 text-ink-400" aria-hidden />
      </div>
    </Link>
  )
}

type AttentionRowProps = {
  to: string
  children: ReactNode
}

function AttentionRow({ to, children }: AttentionRowProps) {
  return (
    <Link
      to={to}
      className="flex min-h-12 touch-manipulation items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-cream-50"
    >
      <span className="text-sm text-ink-800">{children}</span>
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
    </Link>
  )
}

type AttentionButtonProps = {
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}

function AttentionButton({ onClick, children, disabled = false }: AttentionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-12 w-full touch-manipulation items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="text-sm text-ink-800">{children}</span>
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
    </button>
  )
}

type ManageLinkProps = {
  to: string
  label: string
  adminOnly?: boolean
  isAdmin: boolean
}

function ManageLink({ to, label, adminOnly, isAdmin }: ManageLinkProps) {
  if (adminOnly && !isAdmin) {
    return null
  }

  return (
    <Link
      to={to}
      className="flex min-h-12 touch-manipulation items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-crimson-700 hover:bg-cream-100"
    >
      <span>{label}</span>
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
    </Link>
  )
}

type AttentionItem =
  | {
      key: string
      kind: 'link'
      to: string
      label: string
    }
  | {
      key: string
      kind: 'action'
      label: string
      onAction: () => void
      disabled?: boolean
    }

export default function HomePage() {
  const { profile } = useAuth()
  const { isDesktopViewport } = useInputMode()
  const {
    sessions,
    selectedSessionId,
    pendingCount,
    connectionState,
    rosterCached,
    initializing,
    refreshRoster,
    syncNow,
  } = useSyncStatus()
  const { count: pendingRegistrations } = usePendingRegistrationCount()
  const {
    counts,
    loading: attendanceLoading,
    error: attendanceError,
  } = useAttendanceCounts(selectedSessionId)

  const isAdmin = profile?.role === 'admin'

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  )

  const isTodaySession = selectedSession?.session_date === todayIsoDate()

  const attentionItems = useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = []

    if (pendingRegistrations > 0) {
      items.push({
        key: 'registrations',
        kind: 'link',
        to: '/registrations',
        label: `${pendingRegistrations} registration${pendingRegistrations === 1 ? '' : 's'} to review`,
      })
    }

    if (pendingCount > 0) {
      items.push({
        key: 'sync',
        kind: 'action',
        label: `${pendingCount} pending change${pendingCount === 1 ? '' : 's'} — tap to sync`,
        onAction: () => void syncNow(),
        disabled: connectionState === 'offline',
      })
    }

    if (!rosterCached && connectionState === 'online') {
      items.push({
        key: 'cache',
        kind: 'action',
        label: 'Roster not cached on this device — tap to refresh',
        onAction: () => void refreshRoster(),
        disabled: !selectedSessionId,
      })
    }

    return items
  }, [
    pendingRegistrations,
    pendingCount,
    rosterCached,
    connectionState,
    selectedSessionId,
    refreshRoster,
    syncNow,
  ])

  const sessionLabel = selectedSession
    ? formatSessionLabel(selectedSession.title, selectedSession.session_date)
    : 'No session selected'

  const countsLoading = initializing || attendanceLoading
  const showCounts = Boolean(selectedSessionId)

  return (
    <section className="space-y-6">
      <div>
        <h1 className={headingPage}>Home</h1>
        <p className={`mt-1 text-sm ${textSubtle}`}>
          {isDesktopViewport
            ? 'Session overview and staff console shortcuts.'
            : `${isTodaySession ? "Today's session" : 'Selected session'} — use the header to switch meetings.`}
        </p>
      </div>

      {attentionItems.length > 0 && (
        <div className={`${sectionCard} space-y-1`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Needs attention
          </h2>
          <ul>
            {attentionItems.map((item) => (
              <li key={item.key}>
                {item.kind === 'action' ? (
                  <AttentionButton
                    onClick={item.onAction}
                    disabled={item.disabled}
                  >
                    {item.label}
                  </AttentionButton>
                ) : (
                  <AttentionRow to={item.to}>{item.label}</AttentionRow>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-[20px] border border-cream-200 bg-margin-white shadow-card">
        <div className="bg-crimson-600 px-5 py-4 text-cream-50">
          <p className="text-xs font-semibold uppercase tracking-wide text-cream-100/90">
            {isTodaySession ? "Today's session" : 'Current session'}
          </p>
          <p className="mt-1 text-xl font-bold leading-tight">{sessionLabel}</p>
          {isDesktopViewport && (
            <p className="mt-2 text-sm text-cream-100/85">
              {rosterCached
                ? 'Roster cached on this device.'
                : 'Refresh roster in the menu before event-day check-in on tablets.'}
              {connectionState !== 'online' && ' Currently offline.'}
            </p>
          )}
        </div>

        <div className="space-y-4 p-5">
          {!isDesktopViewport && (
            <p className={`text-sm ${textMuted}`}>
              Switch sessions from the header when the meeting changes.
            </p>
          )}

          {showCounts && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-cream-200 bg-cream-50/60 px-4 py-3 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Checked in
                  </p>
                  <p className="mt-1 text-4xl font-bold text-crimson-600">
                    {countsLoading ? '—' : counts.checkedIn}
                  </p>
                </div>
                <div className="rounded-xl border border-cream-200 bg-cream-50/60 px-4 py-3 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Checked out
                  </p>
                  <p className="mt-1 text-4xl font-bold text-ink-900">
                    {countsLoading ? '—' : counts.checkedOut}
                  </p>
                </div>
              </div>

              {attendanceError && <p className={alertWarningInline}>{attendanceError}</p>}

              <Link to="/roster-live" className={`${btnSecondary} w-full`}>
                Open live roster
              </Link>
            </>
          )}
        </div>
      </div>

      {isDesktopViewport ? (
        <>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              On this computer
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              <ConsoleLink
                to="/roster"
                label="Boys roster"
                description="Search, edit, and print lanyards."
              />
              <ConsoleLink
                to="/roster/forms"
                label="Mark forms"
                description="Mark required forms on file for many boys."
              />
              <ConsoleLink
                to="/roster-live"
                label="Live roster"
                description="Who is checked in right now."
              />
              <ConsoleLink
                to="/door-helpers"
                label="BART Volunteers"
                description="Start door night and share tonight’s PIN."
              />
              <ConsoleLink
                to="/reports"
                label="Reports"
                description="Session and participant summaries."
              />
              <ConsoleLink
                to="/registrations"
                label="Registrations"
                description="Review pending JotForm submissions."
                badge={pendingRegistrations}
              />
              {isAdmin && (
                <ConsoleLink
                  to="/messages"
                  label="Messages"
                  description="Guardian broadcasts and reminders."
                />
              )}
              {isAdmin && (
                <ConsoleLink
                  to="/family-links"
                  label="Email family link"
                  description="Resend a parent’s /family view link."
                />
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              Use a tablet for
            </h2>
            <p className={`text-sm ${textMuted}`}>
              QR scanning and kiosk mode work best on phones and tablets at the
              door.
            </p>
            <div className="grid gap-2">
              <QuickAction to="/check-in" label="Check in" icon={Bars3BottomLeftIcon} fieldRoute />
              <QuickAction
                to="/check-out"
                label="Check out"
                icon={ArrowRightOnRectangleIcon}
                fieldRoute
              />
              <QuickAction to="/reading" label="Reading log" icon={BookOpenIcon} fieldRoute />
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Quick actions
          </h2>
          <div className="grid gap-2">
            <QuickAction to="/check-in" label="Check in" icon={Bars3BottomLeftIcon} />
            <QuickAction to="/check-out" label="Check out" icon={ArrowRightOnRectangleIcon} />
            <QuickAction to="/reading" label="Reading log" icon={BookOpenIcon} />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          Manage
        </h2>
        <div className={`${sectionCard} divide-y divide-cream-200 p-2`}>
          <ManageLink to="/sessions" label="Sessions & events" isAdmin={isAdmin} adminOnly />
          <ManageLink to="/bucks" label="BART Bucks" isAdmin={isAdmin} adminOnly />
          <ManageLink to="/door-helpers" label="BART Volunteers" isAdmin={isAdmin} />
          <ManageLink to="/curriculum" label="Curriculum" isAdmin={isAdmin} />
          <ManageLink to="/lanyards" label="Lanyards" isAdmin={isAdmin} />
          {isFeatureEnabled('ai') && (
            <ManageLink
              to="/settings/ai"
              label="AI automations"
              isAdmin={isAdmin}
              adminOnly
            />
          )}
          {!isDesktopViewport && (
            <>
              <ManageLink to="/roster" label="Boys roster" isAdmin={isAdmin} />
              <ManageLink to="/roster/forms" label="Mark forms" isAdmin={isAdmin} />
              <ManageLink to="/registrations" label="Registrations" isAdmin={isAdmin} />
              <ManageLink to="/reports" label="Reports" isAdmin={isAdmin} />
              <ManageLink to="/messages" label="Messages" isAdmin={isAdmin} adminOnly />
              <ManageLink
                to="/family-links"
                label="Email family link"
                isAdmin={isAdmin}
                adminOnly
              />
            </>
          )}
          {isDesktopViewport && (
            <ManageLink to="/roster/forms" label="Mark forms" isAdmin={isAdmin} />
          )}
        </div>
      </div>

      {connectionState !== 'online' && (
        <p className={alertWarningInline}>
          You are offline. Check-in and check-out will queue until you reconnect.
        </p>
      )}
    </section>
  )
}
