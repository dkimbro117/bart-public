import { FormEvent, useState } from 'react'
import { isValidKioskPin } from '../lib/kioskMode'
import { btnPrimary, inputClass, labelClass, modalBackdrop, modalCancelBtn, modalCard, alertErrorInline } from '../ui/classes'

type KioskActivateDialogProps = {
  open: boolean
  onClose: () => void
  onActivate: (pin: string) => Promise<void>
}

export default function KioskActivateDialog({
  open,
  onClose,
  onActivate,
}: KioskActivateDialogProps) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!open) {
    return null
  }

  function reset() {
    setPin('')
    setConfirmPin('')
    setError(null)
    setSubmitting(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!isValidKioskPin(pin)) {
      setError('PIN must be 4–6 digits.')
      return
    }

    if (pin !== confirmPin) {
      setError('PINs do not match.')
      return
    }

    setSubmitting(true)
    try {
      await onActivate(pin)
      reset()
    } catch (activateError) {
      setError(
        activateError instanceof Error
          ? activateError.message
          : 'Could not enter kiosk mode.',
      )
      setSubmitting(false)
    }
  }

  return (
    <div
      className={modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-activate-title"
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className={modalCard}
      >
        <h2 id="kiosk-activate-title" className="text-xl font-bold text-slate-900">
          Enter kiosk mode
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Choose a staff PIN. Participants will stay on reading and quiz screens
          until you enter this PIN to exit.
        </p>

        <label className={`${labelClass} mt-4 block`}>
          Staff PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
            className={`${inputClass} mt-2 min-h-12 text-lg tracking-widest`}
          />
        </label>

        <label className={`${labelClass} mt-4 block`}>
          Confirm PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={confirmPin}
            onChange={(event) =>
              setConfirmPin(event.target.value.replace(/\D/g, ''))
            }
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
            {submitting ? 'Starting…' : 'Lock and open kiosk'}
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
