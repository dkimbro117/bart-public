import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ReadingBadge from '../../components/brand/ReadingBadge'
import KioskCameraAlert from '../../components/kiosk/KioskCameraAlert'
import KioskQrScanner from '../../components/kiosk/KioskQrScanner'
import Button from '../../components/ui/Button'
import { useCameraAvailability } from '../../hooks/useCameraAvailability'
import { normalizeQrToken } from '../../lib/checkIn'
import { resolveParticipantGoBadge } from '../../lib/participantPortal'
import {
  normalizeParticipantBadgeInput,
  participantGoProfileUrl,
  readParticipantGoToken,
  writeParticipantGoToken,
} from '../../lib/participantGoToken'

export default function GoScanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanKey, setScanKey] = useState(0)
  const [manualToken, setManualToken] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [startingQuiz, setStartingQuiz] = useState(false)

  const {
    cameraState,
    cameraUnavailable,
    cameraMessage,
    retryCameraProbe,
  } = useCameraAvailability(true)

  const beginQuiz = useCallback(
    async (rawToken: string) => {
      setStartingQuiz(true)
      setFormError(null)

      try {
        const token = await resolveParticipantGoBadge(
          normalizeParticipantBadgeInput(rawToken),
        )
        writeParticipantGoToken(token)
        navigate(participantGoProfileUrl(token), { replace: true })
        return true
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : 'That number did not work. Try again, or ask a leader.',
        )
        return false
      } finally {
        setStartingQuiz(false)
      }
    },
    [navigate],
  )

  useEffect(() => {
    const fromQuery = searchParams.get('t')
    if (fromQuery) {
      void beginQuiz(fromQuery)
      return
    }

    const stored = readParticipantGoToken()
    if (stored) {
      navigate(participantGoProfileUrl(stored), { replace: true })
    } else {
      setScanKey((key) => key + 1)
    }
  }, [beginQuiz, navigate, searchParams])

  const handleScan = useCallback(
    (qrToken: string) => {
      void beginQuiz(normalizeQrToken(qrToken))
    },
    [beginQuiz],
  )

  const handleManualSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void beginQuiz(manualToken)
  }

  const handleRetryCamera = () => {
    setCameraError(null)
    retryCameraProbe()
    setScanKey((key) => key + 1)
  }

  const scannerVisible = cameraState === 'available' && !cameraError

  return (
    <section className="space-y-6">
      <ReadingBadge
        variant="idle"
        idlePrompt="Scan your badge to see your Bucks"
      />

      <p className="text-center text-lg text-slate-700">
        Point your camera at the code on your badge.
      </p>

      {cameraUnavailable && !cameraError && cameraMessage && (
        <KioskCameraAlert message={cameraMessage} onRetry={handleRetryCamera} />
      )}

      {scannerVisible && (
        <KioskQrScanner
          resetKey={scanKey}
          onScan={handleScan}
          onCameraError={setCameraError}
        />
      )}

      {cameraError && (
        <KioskCameraAlert message={cameraError} onRetry={handleRetryCamera} />
      )}

      <form onSubmit={handleManualSubmit} className="space-y-3 rounded-2xl border border-cream-200 bg-white p-4">
        <label className="block text-base font-semibold text-slate-900" htmlFor="badge-token">
          Or type your number
        </label>
        <p className="text-base text-slate-600">
          It is the red number on your badge.
        </p>
        <input
          id="badge-token"
          type="text"
          inputMode="numeric"
          value={manualToken}
          onChange={(event) => setManualToken(event.target.value)}
          placeholder="2601"
          disabled={startingQuiz}
          className="min-h-16 w-full rounded-xl border border-cream-200 px-4 text-2xl"
        />
        <Button
          type="submit"
          fullWidth
          disabled={startingQuiz}
          className="min-h-16 text-xl"
        >
          {startingQuiz ? 'Opening…' : 'Go'}
        </Button>
      </form>

      {formError && (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-base text-amber-900">
          {formError}
        </p>
      )}
    </section>
  )
}
