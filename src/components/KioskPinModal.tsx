import { FormEvent, useState } from 'react'
import { isValidKioskPin } from '../lib/kioskMode'
import { btnPrimary, inputClass, labelClass, modalBackdrop, modalCancelBtn, modalCard, alertErrorInline } from '../ui/classes'

type KioskPinModalProps = {
  open: boolean
  onClose: () => void
  onVerified: () => void
  verifyPin: (pin: string) => Promise<boolean>
  title?: string
  description?: string
  confirmLabel?: string
}

export default function KioskPinModal({
  open,
  onClose,
  onVerified,
  verifyPin,
  title = 'Staff PIN required',
  description = 'Enter the staff PIN to exit kiosk mode.',
  confirmLabel = 'Exit kiosk',
}: KioskPinModalProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!open) {
    return null
  }

  function handleClose() {
    setPin('')
    setError(null)
    setSubmitting(false)
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!isValidKioskPin(pin)) {
      setError('PIN must be 4–6 digits.')
      return
    }

    setSubmitting(true)
    const ok = await verifyPin(pin)
    if (!ok) {
      setError('Incorrect PIN.')
      setSubmitting(false)
      return
    }

    setPin('')
    setSubmitting(false)
    onVerified()
  }

  return (
    <div
      className={modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-pin-title"
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className={modalCard}
      >
        <h2 id="kiosk-pin-title" className="text-xl font-bold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>

        <label className={`${labelClass} mt-4 block`}>
          Staff PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            autoFocus
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
            className={`${inputClass} mt-2 min-h-12 text-lg tracking-widest`}
          />
        </label>

        {error && <p className={`mt-4 ${alertErrorInline}`}>{error}</p>}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="submit"
            disabled={submitting}
            className={`${btnPrimary} min-h-12 w-full`}
          >
            {submitting ? 'Checking…' : confirmLabel}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className={modalCancelBtn}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
