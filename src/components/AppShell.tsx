import { useMemo, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import AdminDrawer from './AdminDrawer'
import PatentNotice from './brand/PatentNotice'
import { buildAdminNavItems, useAdminNavGroups } from '../hooks/useAdminNavGroups'
import StaffTopBar from './StaffTopBar'
import DesktopSideNav from './ui/DesktopSideNav'
import FloatingNav from './ui/FloatingNav'
import { shellMain, surfacePage } from '../ui/classes'

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navItems = useMemo(
    () => buildAdminNavItems(() => setDrawerOpen(true)),
    [],
  )
  const navGroups = useAdminNavGroups()

  return (
    <div className={`${surfacePage} flex min-h-dvh flex-col lg:flex-row`}>
      <DesktopSideNav groups={navGroups} brandLink="/" />

      <div className="flex min-w-0 flex-1 flex-col">
        <StaffTopBar
          brandLink="/"
          onOpenMenu={() => setDrawerOpen(true)}
          eventButton={
            <Link
              to="/check-in"
              className="inline-flex min-h-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-crimson-600 px-4 text-xs font-semibold text-cream-50 hover:bg-crimson-700 lg:min-h-12"
            >
              Event
            </Link>
          }
        />

        <main className={shellMain}>
          <Outlet />
        </main>

        <footer className="hidden px-4 pb-2 lg:block">
          <PatentNotice />
        </footer>
        <FloatingNav items={navItems} />
        <AdminDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    </div>
  )
}
