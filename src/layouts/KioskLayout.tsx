import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import KioskPinModal from '../components/KioskPinModal'
import KioskDesktopGuard from '../components/kiosk/KioskDesktopGuard'
import { useKioskMode } from '../contexts/KioskModeContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { useInputMode } from '../hooks/useInputMode'
import { useKioskPreviewMode } from '../hooks/useKioskPreviewMode'
import { formatSessionLabel } from '../lib/dates'
import {
  isKioskProductionPath,
  kioskQuizPath,
  kioskReadingPath,
} from '../lib/kioskRoutes'

export default function KioskLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { sessions, selectedSessionId } = useSyncStatus()
  const { isLocked, verifyExitPin, exitKioskMode, requestEnterKioskMode } =
    useKioskMode()
  const { isDesktopViewport } = useInputMode()
  const isPreview = useKioskPreviewMode()
  const [exitPinOpen, setExitPinOpen] = useState(false)

  const selectedSession = sessions.find((session) => session.id === selectedSessionId)
  const readingPath = kioskReadingPath(isPreview)
  const quizPath = kioskQuizPath(isPreview)
  const onReading = location.pathname.endsWith('/reading')
  const onQuiz = location.pathname.endsWith('/quiz')
  const showProductionGuard =
    isDesktopViewport && isKioskProductionPath(location.pathname)
  const showKioskChrome = !showProductionGuard

  function handleExitClick() {
    if (isPreview) {
      navigate('/reading', { replace: true })
      return
    }

    if (isLocked) {
      setExitPinOpen(true)
      return
    }
    exitKioskMode()
  }

  return (
    <div className="font-kiosk flex min-h-dvh flex-col bg-cream-50 text-slate-900">
      {isPreview && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-900">
          Preview mode — for training and demos, not event tablets
        </div>
      )}

      <header
        className="no-print border-b border-cream-200 bg-cream-50 px-4 py-4"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-crimson-600">
              {selectedSession
                ? formatSessionLabel(
                    selectedSession.title,
                    selectedSession.session_date,
                  )
                : 'B.A.R.T.'}
            </p>
            {isLocked && !isPreview && (
              <p className="text-xs text-slate-500">Kiosk locked for participants</p>
            )}
            {isPreview && (
              <p className="text-xs text-slate-500">Staff preview — no PIN lock</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isLocked && !isDesktopViewport && !isPreview && (
              <button
                type="button"
                onClick={() => requestEnterKioskMode()}
                className="min-h-12 touch-manipulation rounded-lg border border-crimson-600 bg-white px-3 text-sm font-semibold text-crimson-700 hover:bg-cream-100"
              >
                Lock
              </button>
            )}
            <button
              type="button"
              onClick={handleExitClick}
              className="min-h-12 touch-manipulation rounded-lg border border-cream-200 bg-white px-4 text-sm font-semibold text-crimson-700 hover:bg-cream-100"
            >
              Exit
            </button>
          </div>
        </div>

        {showKioskChrome && isPreview && (
          <div className="mx-auto mt-3 flex max-w-lg rounded-xl border border-cream-200 bg-white p-1">
            <Link
              to={readingPath}
              className={[
                'flex min-h-12 flex-1 items-center justify-center rounded-lg text-sm font-semibold touch-manipulation',
                onReading
                  ? 'bg-crimson-600 text-cream-50'
                  : 'text-slate-600 hover:bg-cream-50',
              ].join(' ')}
            >
              Reading
            </Link>
            <Link
              to={quizPath}
              className={[
                'flex min-h-12 flex-1 items-center justify-center rounded-lg text-sm font-semibold touch-manipulation',
                onQuiz
                  ? 'bg-crimson-600 text-cream-50'
                  : 'text-slate-600 hover:bg-cream-50',
              ].join(' ')}
            >
              Quiz preview
            </Link>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        {showProductionGuard ? <KioskDesktopGuard /> : <Outlet />}
      </main>

      <KioskPinModal
        open={exitPinOpen}
        onClose={() => setExitPinOpen(false)}
        verifyPin={verifyExitPin}
        onVerified={() => {
          setExitPinOpen(false)
          exitKioskMode()
        }}
      />
    </div>
  )
}
