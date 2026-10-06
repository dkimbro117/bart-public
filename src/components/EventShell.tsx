import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import AdminDrawer from './AdminDrawer'
import StaffTopBar from './StaffTopBar'
import DesktopSideNav from './ui/DesktopSideNav'
import FloatingNav from './ui/FloatingNav'
import { useAuth } from '../contexts/AuthContext'
import { useEventNavGroups, useEventNavItems } from '../hooks/useEventNavGroups'
import { useDoorAccessGuard } from '../hooks/useDoorAccessGuard'
import { isDoorHelper } from '../lib/auth'
import { shellMain, surfacePage } from '../ui/classes'

export default function EventShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { profile } = useAuth()
  const doorOnly = isDoorHelper(profile)
  useDoorAccessGuard()
  const eventNavItems = useEventNavItems()
  const eventNavGroups = useEventNavGroups()
  const homePath = doorOnly ? '/check-in' : '/'

  return (
    <div className={`${surfacePage} flex min-h-dvh flex-col lg:flex-row`}>
      <DesktopSideNav groups={eventNavGroups} brandLink={homePath} />

      <div className="flex min-w-0 flex-1 flex-col">
        <StaffTopBar
          brandLink={homePath}
          onOpenMenu={() => setDrawerOpen(true)}
          homeButton={
            doorOnly ? undefined : (
              <Link
                to="/"
                className="inline-flex min-h-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-crimson-600 bg-white px-4 text-xs font-semibold text-crimson-700 hover:bg-cream-50 lg:min-h-12"
              >
                Home
              </Link>
            )
          }
        />

        <main className={shellMain}>
          <Outlet />
        </main>

        <FloatingNav items={eventNavItems} />
        <AdminDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    </div>
  )
}
