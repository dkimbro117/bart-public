import { useLocation } from 'react-router-dom'
import { isKioskPreviewPath } from '../lib/kioskRoutes'

export function useKioskPreviewMode(): boolean {
  const { pathname } = useLocation()
  return isKioskPreviewPath(pathname)
}
