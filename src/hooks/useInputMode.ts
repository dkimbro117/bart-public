import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DESKTOP_MIN_WIDTH_PX,
  isDesktopViewport,
  persistManualInputPreference,
  readManualInputPreference,
} from '../lib/inputMode'

export type InputMode = {
  /** True when the viewport is at least the desktop breakpoint. */
  isDesktopViewport: boolean
  /** Search/manual entry is the default input on this device. */
  manualPreferred: boolean
  /** Mount the QR camera scanner. */
  scanEnabled: boolean
  /** User opted into camera on a desktop viewport. */
  enableScan: () => void
  /** Remember manual-only for this browser tab after camera failure. */
  reportCameraFailure: () => void
}

export function useInputMode(): InputMode {
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport)
  const [preferManual, setPreferManual] = useState(readManualInputPreference)
  const [scanRequested, setScanRequested] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`)

    function handleChange() {
      setIsDesktop(mediaQuery.matches)
      if (mediaQuery.matches) {
        setScanRequested(false)
      }
    }

    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const manualPreferred = preferManual || (isDesktop && !scanRequested)

  const scanEnabled = useMemo(() => {
    if (preferManual) {
      return false
    }

    if (isDesktop) {
      return scanRequested
    }

    return true
  }, [isDesktop, preferManual, scanRequested])

  const enableScan = useCallback(() => {
    setScanRequested(true)
  }, [])

  const reportCameraFailure = useCallback(() => {
    persistManualInputPreference()
    setPreferManual(true)
    setScanRequested(false)
  }, [])

  return {
    isDesktopViewport: isDesktop,
    manualPreferred,
    scanEnabled,
    enableScan,
    reportCameraFailure,
  }
}
