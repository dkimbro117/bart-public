import { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type QrScannerProps = {
  onScan: (qrToken: string) => void
  onCameraError: (message: string) => void
  /** Increment to allow re-scanning the same token after cancel/error (L-3). */
  resetKey?: number
}

function computeQrBoxSize(containerWidth: number): number {
  const horizontalPadding = 32
  const available = Math.max(containerWidth - horizontalPadding, 200)
  return Math.min(Math.round(available * 0.85), 320)
}

export default function QrScanner({
  onScan,
  onCameraError,
  resetKey = 0,
}: QrScannerProps) {
  const elementId = useId().replace(/:/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScanRef = useRef<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const onScanRef = useRef(onScan)
  const onCameraErrorRef = useRef(onCameraError)
  const [scanAnnouncement, setScanAnnouncement] = useState('')
  const [viewfinderSize, setViewfinderSize] = useState(256)

  onScanRef.current = onScan
  onCameraErrorRef.current = onCameraError

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    function updateSize() {
      const width = container?.clientWidth ?? 320
      const qrSize = computeQrBoxSize(width)
      setViewfinderSize(qrSize)
    }

    updateSize()

    const observer = new ResizeObserver(() => {
      updateSize()
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    lastScanRef.current = null
    const scanner = scannerRef.current
    if (!scanner) {
      return
    }

    try {
      scanner.resume()
    } catch {
      // Scanner may not be paused yet on first mount.
    }
  }, [resetKey])

  useEffect(() => {
    let cancelled = false
    const scanner = new Html5Qrcode(elementId, { verbose: false })
    scannerRef.current = scanner
    const qrSize = computeQrBoxSize(containerRef.current?.clientWidth ?? 320)

    async function startScanner() {
      const cameraConfigs: Array<{ facingMode: string }> = [
        { facingMode: 'environment' },
        { facingMode: 'user' },
      ]

      for (let index = 0; index < cameraConfigs.length; index += 1) {
        const cameraConfig = cameraConfigs[index]
        if (cancelled) {
          return
        }

        try {
          await scanner.start(
            cameraConfig,
            {
              fps: 10,
              qrbox: { width: qrSize, height: qrSize },
              aspectRatio: 1,
            },
            (decodedText) => {
              const token = decodedText.trim()
              if (!token || lastScanRef.current === token) {
                return
              }

              lastScanRef.current = token
              setScanAnnouncement('Badge scanned.')
              void scanner.pause(true)
              onScanRef.current(token)
            },
            () => undefined,
          )
          return
        } catch (error) {
          if (cancelled) {
            return
          }

          const isLastAttempt = index === cameraConfigs.length - 1

          if (!isLastAttempt) {
            try {
              await scanner.stop()
              await scanner.clear()
            } catch {
              // Ignore cleanup errors between constraint attempts.
            }
            continue
          }

          const message =
            error instanceof Error && error.name === 'NotAllowedError'
              ? 'Camera permission denied. Use manual search below or allow camera access in your browser settings.'
              : error instanceof Error
                ? error.message
                : 'Unable to start the camera.'

          onCameraErrorRef.current(message)
        }
      }
    }

    void startScanner()

    return () => {
      cancelled = true
      scannerRef.current = null
      void scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => undefined)
    }
  }, [elementId])

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl border border-cream-300 bg-black shadow-card"
    >
      <div id={elementId} className="min-h-[min(80vw,20rem)] w-full sm:min-h-[20rem]" />
      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        aria-hidden
      >
        <div
          className="relative"
          style={{ width: viewfinderSize, height: viewfinderSize }}
        >
          <span className="absolute left-0 top-0 h-10 w-10 border-l-4 border-t-4 border-cream-100" />
          <span className="absolute right-0 top-0 h-10 w-10 border-r-4 border-t-4 border-cream-100" />
          <span className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-cream-100" />
          <span className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-cream-100" />
        </div>
        <p className="mt-4 px-4 text-center text-base font-semibold text-cream-100 drop-shadow-md">
          Hold badge in the square
        </p>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {scanAnnouncement}
      </p>
    </div>
  )
}
