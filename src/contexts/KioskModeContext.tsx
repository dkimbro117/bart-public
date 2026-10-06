import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import KioskActivateDialog from '../components/KioskActivateDialog'
import { useAuth } from './AuthContext'
import { useSyncStatus } from './SyncContext'
import {
  clearKioskLock,
  hashKioskPin,
  isKioskLocked,
  setKioskLocked,
  verifyKioskPin,
} from '../lib/kioskMode'
import { isDesktopViewport } from '../lib/inputMode'
import type { KioskPreviewPath, KioskProductionPath } from '../lib/kioskRoutes'

export type KioskEntryPath = KioskProductionPath
export type KioskPreviewEntryPath = KioskPreviewPath

type KioskModeContextValue = {
  isLocked: boolean
  requestEnterKioskMode: (path?: KioskEntryPath) => void
  requestEnterKioskPreview: (path?: KioskPreviewEntryPath) => void
  activateKioskMode: (pin: string) => Promise<void>
  verifyExitPin: (pin: string) => Promise<boolean>
  exitKioskMode: () => void
}

const KioskModeContext = createContext<KioskModeContextValue | null>(null)

export function KioskModeProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { refreshRoster } = useSyncStatus()
  const [isLocked, setIsLocked] = useState(() => isKioskLocked())
  const [activateOpen, setActivateOpen] = useState(false)
  const [pendingEntryPath, setPendingEntryPath] =
    useState<KioskEntryPath>('/kiosk/reading')

  const activateKioskMode = useCallback(
    async (pin: string) => {
      const email = session?.user.email
      if (!email) {
        throw new Error('Sign in before entering kiosk mode.')
      }

      const pinHash = await hashKioskPin(pin)
      setKioskLocked(pinHash, email)
      setIsLocked(true)

      if (navigator.onLine) {
        await refreshRoster()
      }

      setActivateOpen(false)
      navigate(pendingEntryPath, { replace: true })
    },
    [navigate, pendingEntryPath, refreshRoster, session?.user.email],
  )

  const requestEnterKioskMode = useCallback(
    (path: KioskEntryPath = '/kiosk/reading') => {
      if (isDesktopViewport()) {
        return
      }

      if (isKioskLocked()) {
        setIsLocked(true)
        navigate(path)
        return
      }
      setPendingEntryPath(path)
      setActivateOpen(true)
    },
    [navigate],
  )

  const requestEnterKioskPreview = useCallback(
    (path: KioskPreviewEntryPath = '/kiosk/preview/reading') => {
      navigate(path)
    },
    [navigate],
  )

  const verifyExitPin = useCallback(async (pin: string) => {
    return verifyKioskPin(pin)
  }, [])

  const exitKioskMode = useCallback(() => {
    clearKioskLock()
    setIsLocked(false)
    if (navigator.onLine) {
      void refreshRoster()
    }
    navigate('/check-in', { replace: true })
  }, [navigate, refreshRoster])

  const value = useMemo(
    () => ({
      isLocked,
      requestEnterKioskMode,
      requestEnterKioskPreview,
      activateKioskMode,
      verifyExitPin,
      exitKioskMode,
    }),
    [
      activateKioskMode,
      exitKioskMode,
      isLocked,
      requestEnterKioskMode,
      requestEnterKioskPreview,
      verifyExitPin,
    ],
  )

  return (
    <KioskModeContext.Provider value={value}>
      {children}
      <KioskActivateDialog
        open={activateOpen}
        onClose={() => {
          setActivateOpen(false)
          setPendingEntryPath('/kiosk/reading')
        }}
        onActivate={activateKioskMode}
      />
    </KioskModeContext.Provider>
  )
}

export function useKioskMode() {
  const context = useContext(KioskModeContext)
  if (!context) {
    throw new Error('useKioskMode must be used within KioskModeProvider')
  }
  return context
}
