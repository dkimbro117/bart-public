import { useCallback, useEffect, useRef, useState } from 'react'
import { formatClockTime } from '../../lib/dates'
import {
  countInkStrokes,
  undoLastStroke,
  type SignaturePayload,
  type SignaturePoint,
} from '../../lib/signatures'
import { btnGhost } from '../../ui/classes'

type SignaturePadProps = {
  disabled?: boolean
  /** Shown over the dimmed pad when it is not yet usable. */
  disabledHint?: string
  signerName?: string | null
  /** Bump to wipe the pad from the parent, e.g. when the signer changes. */
  resetKey?: number
  onChange: (payload: SignaturePayload | null) => void
}

export default function SignaturePad({
  disabled,
  disabledHint,
  signerName,
  resetKey,
  onChange,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const strokesRef = useRef<SignaturePoint[][]>([])
  const currentStroke = useRef<SignaturePoint[]>([])
  const drawing = useRef(false)
  const [strokeTotal, setStrokeTotal] = useState(0)
  const [signedAt, setSignedAt] = useState<Date | null>(null)

  const emit = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || countInkStrokes(strokesRef.current) === 0) {
      onChange(null)
      return
    }

    const payload: SignaturePayload = {
      strokes: strokesRef.current,
      width: canvas.width,
      height: canvas.height,
    }
    onChange(payload)
  }, [onChange])

  const syncPadState = useCallback(() => {
    setStrokeTotal(strokesRef.current.length)
    setSignedAt((previous) =>
      countInkStrokes(strokesRef.current) > 0 ? (previous ?? new Date()) : null,
    )
  }, [])

  const pointFromEvent = useCallback(
    (event: PointerEvent): SignaturePoint | null => {
      const canvas = canvasRef.current
      if (!canvas) {
        return null
      }
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        return null
      }
      return {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      }
    },
    [],
  )

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
      return
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = '#1c1917'
    context.lineWidth = 3
    context.lineCap = 'round'
    context.lineJoin = 'round'

    for (const stroke of strokesRef.current) {
      if (stroke.length === 0) {
        continue
      }
      context.beginPath()
      context.moveTo(stroke[0].x * canvas.width, stroke[0].y * canvas.height)
      for (const point of stroke.slice(1)) {
        context.lineTo(point.x * canvas.width, point.y * canvas.height)
      }
      context.stroke()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.round(rect.width * ratio))
      canvas.height = Math.max(1, Math.round(rect.height * ratio))
      redraw()
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [redraw])

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) {
      return
    }

    function onPointerDown(event: PointerEvent) {
      const canvas = canvasRef.current
      if (!canvas || disabled) {
        return
      }
      event.preventDefault()
      canvas.setPointerCapture(event.pointerId)
      drawing.current = true
      const point = pointFromEvent(event)
      currentStroke.current = point ? [point] : []
      if (point) {
        strokesRef.current = [...strokesRef.current, currentStroke.current]
      }
    }

    function onPointerMove(event: PointerEvent) {
      if (!drawing.current || disabled) {
        return
      }
      event.preventDefault()
      const point = pointFromEvent(event)
      if (!point) {
        return
      }
      currentStroke.current.push(point)
      redraw()
    }

    function onPointerUp(event: PointerEvent) {
      const canvas = canvasRef.current
      if (!drawing.current || !canvas) {
        return
      }
      drawing.current = false
      currentStroke.current = []
      syncPadState()
      emit()
      canvas.releasePointerCapture(event.pointerId)
    }

    canvasEl.addEventListener('pointerdown', onPointerDown)
    canvasEl.addEventListener('pointermove', onPointerMove)
    canvasEl.addEventListener('pointerup', onPointerUp)
    canvasEl.addEventListener('pointercancel', onPointerUp)

    return () => {
      canvasEl.removeEventListener('pointerdown', onPointerDown)
      canvasEl.removeEventListener('pointermove', onPointerMove)
      canvasEl.removeEventListener('pointerup', onPointerUp)
      canvasEl.removeEventListener('pointercancel', onPointerUp)
    }
  }, [disabled, emit, pointFromEvent, redraw, syncPadState])

  useEffect(() => {
    strokesRef.current = []
    currentStroke.current = []
    setStrokeTotal(0)
    setSignedAt(null)
    redraw()
  }, [resetKey, redraw])

  const undoStroke = useCallback(() => {
    strokesRef.current = undoLastStroke(strokesRef.current)
    currentStroke.current = []
    syncPadState()
    redraw()
    emit()
  }, [emit, redraw, syncPadState])

  const clearPad = useCallback(() => {
    strokesRef.current = []
    currentStroke.current = []
    syncPadState()
    redraw()
    onChange(null)
  }, [onChange, redraw, syncPadState])

  const caption = signedAt
    ? signerName
      ? `Signed by ${signerName} at ${formatClockTime(signedAt)}`
      : `Signed at ${formatClockTime(signedAt)}`
    : 'Sign with a finger or stylus'

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-800">
        Parent / guardian signature
      </p>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className={`h-44 w-full touch-none rounded-2xl border bg-white ${
            disabled ? 'border-cream-200 opacity-50' : 'border-cream-300'
          }`}
          style={{ touchAction: 'none' }}
          aria-label="Signature pad"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-5 bottom-9 border-b border-dashed border-cream-300"
        />
        {disabled && disabledHint && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-medium text-slate-500">
            {disabledHint}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-xs text-slate-500">{caption}</p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={disabled || strokeTotal === 0}
            onClick={undoStroke}
            className={`${btnGhost} min-h-11 px-4 text-sm`}
          >
            Undo
          </button>
          <button
            type="button"
            disabled={disabled || strokeTotal === 0}
            onClick={clearPad}
            className={`${btnGhost} min-h-11 px-4 text-sm`}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
