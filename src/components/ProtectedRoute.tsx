import { Navigate, Outlet, useLocation } from 'react-router-dom'
import KioskStaffReauth from './KioskStaffReauth'
import BrandedLoading from './brand/BrandedStates'
import { useAuth } from '../contexts/AuthContext'
import { isDoorHelper } from '../lib/auth'
import { getKioskStaffEmail, isKioskLocked } from '../lib/kioskMode'
import { surfacePage } from '../ui/classes'

const DOOR_PATHS = ['/check-in', '/check-out', '/roster-live']

export default function ProtectedRoute() {
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  const onKioskRoute = location.pathname.startsWith('/kiosk')

  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${surfacePage}`}>
        <BrandedLoading />
      </div>
    )
  }

  if (onKioskRoute && isKioskLocked() && (!session || !profile)) {
    return <KioskStaffReauth staffEmail={getKioskStaffEmail()} />
  }

  if (!session || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!profile.password_set_at) {
    return <Navigate to="/login/set-password" replace />
  }

  if (isDoorHelper(profile) && !DOOR_PATHS.includes(location.pathname)) {
    return <Navigate to="/check-in" replace />
  }

  if (isKioskLocked() && !onKioskRoute) {
    return <Navigate to="/kiosk/reading" replace />
  }

  return <Outlet />
}
