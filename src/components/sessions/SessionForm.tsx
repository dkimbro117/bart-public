import { FormEvent, useEffect, useState } from 'react'
import {
  defaultsForEventType,
  formatEventTypeLabel,
  SESSION_EVENT_TYPES,
  type SessionEventType,
  type SessionFormValues,
} from '../../lib/sessions'
import {
  alertErrorInline,
  btnPrimary,
  btnSecondary,
  choiceRow,
  inputClass,
  labelClass,
} from '../../ui/classes'

type SessionFormProps = {
  initialValues: SessionFormValues
  submitLabel: string
  onSubmit: (values: SessionFormValues) => Promise<void>
  onCancel: () => void
}

export default function SessionForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: SessionFormProps) {
  const [values, setValues] = useState(initialValues)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flagsTouched, setFlagsTouched] = useState(false)

  useEffect(() => {
    setValues(initialValues)
    setFlagsTouched(false)
  }, [initialValues])

  function updateField<K extends keyof SessionFormValues>(
    key: K,
    value: SessionFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleEventTypeChange(eventType: SessionEventType) {
    setValues((current) => {
      const next = { ...current, event_type: eventType }
      if (!flagsTouched) {
        return { ...next, ...defaultsForEventType(eventType) }
      }
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await onSubmit(values)
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      <label className="block">
        <span className={labelClass}>Title</span>
        <input
          type="text"
          required
          disabled={submitting}
          value={values.title}
          onChange={(event) => updateField('title', event.target.value)}
          className={inputClass}
          placeholder="e.g. Week 4 reading night"
        />
      </label>

      <label className="block">
        <span className={labelClass}>Date</span>
        <input
          type="date"
          required
          disabled={submitting}
          value={values.session_date}
          onChange={(event) => updateField('session_date', event.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Event type</span>
        <select
          disabled={submitting}
          value={values.event_type}
          onChange={(event) =>
            handleEventTypeChange(event.target.value as SessionEventType)
          }
          className={inputClass}
        >
          {SESSION_EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {formatEventTypeLabel(type)}
            </option>
          ))}
        </select>
      </label>

      <label className={`${choiceRow} touch-manipulation py-3`}>
        <input
          type="checkbox"
          disabled={submitting}
          checked={values.requires_check_in}
          onChange={(event) => {
            setFlagsTouched(true)
            updateField('requires_check_in', event.target.checked)
          }}
          className="h-5 w-5 rounded border-cream-300 text-crimson-600 focus:ring-crimson-500"
        />
        <span className="text-base text-slate-900">Requires check-in</span>
      </label>

      <label className={`${choiceRow} touch-manipulation py-3`}>
        <input
          type="checkbox"
          disabled={submitting}
          checked={values.supports_reading}
          onChange={(event) => {
            setFlagsTouched(true)
            updateField('supports_reading', event.target.checked)
          }}
          className="h-5 w-5 rounded border-cream-300 text-crimson-600 focus:ring-crimson-500"
        />
        <span className="text-base text-slate-900">
          Supports reading / quiz kiosk
        </span>
      </label>

      {error && <p className={alertErrorInline}>{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={submitting} className={`flex-1 ${btnPrimary}`}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onCancel}
          className={`flex-1 ${btnSecondary}`}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
