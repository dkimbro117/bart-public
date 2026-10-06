import { useCallback, useEffect, useState } from 'react'
import { probeCameraAvailability } from '../lib/camera'

type CameraAvailabilityState = 'checking' | 'available' | 'unavailable'

export function useCameraAvailability(enabled = true) {
  const [state, setState] = useState<CameraAvailabilityState>(
    enabled ? 'checking' : 'unavailable',
  )
  const [message, setMessage] = useState<string | null>(null)
  const [probeKey, setProbeKey] = useState(0)

  const retry = useCallback(() => {
    setState('checking')
    setMessage(null)
    setProbeKey((key) => key + 1)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setState('unavailable')
      setMessage(null)
      return
    }

    let cancelled = false

    async function runProbe() {
      setState('checking')
      setMessage(null)

      const result = await probeCameraAvailability()
      if (cancelled) {
        return
      }

      if (result.status === 'available') {
        setState('available')
        setMessage(null)
        return
      }

      setState('unavailable')
      setMessage(result.message)
    }

    void runProbe()

    return () => {
      cancelled = true
    }
  }, [enabled, probeKey])

  return {
    cameraState: state,
    cameraUnavailable: state === 'unavailable',
    cameraChecking: state === 'checking',
    cameraMessage: message,
    retryCameraProbe: retry,
  }
}
