import { FormEvent, useState } from 'react'
import {
  deriveLastInitial,
  PARTICIPANT_FORM_CONSENTS,
  type ParticipantFormValues,
} from '../../lib/participants'
import {
  alertErrorInline,
  btnPrimary,
  btnSecondary,
  choiceRow,
  inputClass,
  labelClass,
} from '../../ui/classes'
import AuthorizedPickupsField from './AuthorizedPickupsField'

type ParticipantFormProps = {
  initialValues: ParticipantFormValues
  submitLabel: string
  showActiveToggle?: boolean
  showContactFields?: boolean
  onSubmit: (values: ParticipantFormValues) => Promise<void>
  onCancel: () => void
}

export default function ParticipantForm({
  initialValues,
  submitLabel,
  showActiveToggle = false,
  showContactFields = false,
  onSubmit,
  onCancel,
}: ParticipantFormProps) {
  const [values, setValues] = useState(initialValues)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField<K extends keyof ParticipantFormValues>(
    key: K,
    value: ParticipantFormValues[K],
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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <span className={labelClass}>First name</span>
          <input
            type="text"
            required
            disabled={submitting}
            value={values.first_name}
            onChange={(event) => updateField('first_name', event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-1">
          <span className={labelClass}>Last name</span>
          <input
            type="text"
            disabled={submitting}
            value={values.last_name}
            onChange={(event) => {
              const lastName = event.target.value
              setValues((current) => ({
                ...current,
                last_name: lastName,
                last_initial:
                  deriveLastInitial(lastName) || current.last_initial,
              }))
            }}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-slate-500">
            Staff only. Boys see “{values.first_name.trim() || 'First'}{' '}
            {values.last_initial || '?'}.”
          </span>
        </label>

        <label className="block sm:col-span-1">
          <span className={labelClass}>Last initial</span>
          <input
            type="text"
            required
            maxLength={1}
            disabled={submitting}
            value={values.last_initial}
            onChange={(event) =>
              updateField(
                'last_initial',
                event.target.value.toUpperCase().slice(0, 1),
              )
            }
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-1">
          <span className={labelClass}>Grade</span>
          <input
            type="text"
            disabled={submitting}
            value={values.grade}
            onChange={(event) => updateField('grade', event.target.value)}
            placeholder="4th"
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-1">
          <span className={labelClass}>Age</span>
          <input
            type="number"
            inputMode="numeric"
            min={4}
            max={18}
            disabled={submitting}
            value={values.age}
            onChange={(event) => updateField('age', event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-1">
          <span className={labelClass}>T-shirt size</span>
          <input
            type="text"
            disabled={submitting}
            value={values.shirt_size}
            onChange={(event) => updateField('shirt_size', event.target.value)}
            placeholder="YS"
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-1">
          <span className={labelClass}>New / Returning</span>
          <input
            type="text"
            disabled={submitting}
            value={values.enrollment_status}
            onChange={(event) =>
              updateField('enrollment_status', event.target.value)
            }
            placeholder="New"
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>School</span>
          <input
            type="text"
            disabled={submitting}
            value={values.school}
            onChange={(event) => updateField('school', event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>How heard about B.A.R.T.</span>
          <input
            type="text"
            disabled={submitting}
            value={values.how_heard}
            onChange={(event) => updateField('how_heard', event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>Registration date</span>
          <input
            type="date"
            disabled={submitting}
            value={values.registration_date}
            onChange={(event) =>
              updateField('registration_date', event.target.value)
            }
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Guardian name</span>
        <input
          type="text"
          required
          disabled={submitting}
          value={values.guardian_name}
          onChange={(event) => updateField('guardian_name', event.target.value)}
          className={inputClass}
        />
      </label>

      {showContactFields && (
        <>
          <label className="block">
            <span className={labelClass}>Guardian email</span>
            <input
              type="email"
              disabled={submitting}
              value={values.guardian_email}
              onChange={(event) =>
                updateField('guardian_email', event.target.value)
              }
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Guardian phone</span>
            <input
              type="tel"
              disabled={submitting}
              value={values.guardian_phone}
              onChange={(event) =>
                updateField('guardian_phone', event.target.value)
              }
              placeholder="(336) 555-0100"
              className={inputClass}
            />
          </label>
        </>
      )}

      <AuthorizedPickupsField
        values={values.authorized_pickups}
        disabled={submitting}
        onChange={(authorized_pickups) =>
          updateField('authorized_pickups', authorized_pickups)
        }
      />

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

      <fieldset className="space-y-1">
        <legend className={labelClass}>Required forms on file</legend>
        {PARTICIPANT_FORM_CONSENTS.map(({ key, label }) => (
          <label key={key} className={`${choiceRow} touch-manipulation py-3`}>
            <input
              type="checkbox"
              disabled={submitting}
              checked={values[key]}
              onChange={(event) => updateField(key, event.target.checked)}
              className="h-5 w-5 rounded border-cream-300 text-crimson-600 focus:ring-crimson-500"
            />
            <span className="text-base text-slate-900">{label}</span>
          </label>
        ))}
      </fieldset>

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
