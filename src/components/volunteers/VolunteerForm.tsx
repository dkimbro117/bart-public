import { FormEvent, useState } from 'react'
import type { VolunteerFormValues } from '../../lib/volunteers'
import {
  alertErrorInline,
  btnPrimary,
  btnSecondary,
  choiceRow,
  inputClass,
  labelClass,
} from '../../ui/classes'

type VolunteerFormProps = {
  initialValues: VolunteerFormValues
  submitLabel: string
  showActiveToggle?: boolean
  onSubmit: (values: VolunteerFormValues) => Promise<void>
  onCancel: () => void
}

export default function VolunteerForm({
  initialValues,
  submitLabel,
  showActiveToggle = false,
  onSubmit,
  onCancel,
}: VolunteerFormProps) {
  const [values, setValues] = useState(initialValues)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField<K extends keyof VolunteerFormValues>(
    key: K,
    value: VolunteerFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
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
        <span className={labelClass}>Full name</span>
        <input
          type="text"
          required
          disabled={submitting}
          value={values.full_name}
          onChange={(event) => updateField('full_name', event.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Email</span>
        <input
          type="email"
          disabled={submitting}
          value={values.email}
          onChange={(event) => updateField('email', event.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Phone</span>
        <input
          type="tel"
          disabled={submitting}
          value={values.phone}
          onChange={(event) => updateField('phone', event.target.value)}
          placeholder="(336) 555-0100"
          className={inputClass}
        />
      </label>

      {showActiveToggle && (
        <label className={`${choiceRow} touch-manipulation py-3`}>
          <input
            type="checkbox"
            disabled={submitting}
            checked={values.active}
            onChange={(event) => updateField('active', event.target.checked)}
            className="h-5 w-5 rounded border-cream-300 text-crimson-600 focus:ring-crimson-500"
          />
          <span className="text-base text-slate-900">Active on roster</span>
        </label>
      )}

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
