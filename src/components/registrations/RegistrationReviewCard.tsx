import { useState } from 'react'
import ConfirmPanel from '../ui/ConfirmPanel'
import AuthorizedPickupsField from '../participants/AuthorizedPickupsField'
import { formatDateTime } from '../../lib/dates'
import { formatParticipantName } from '../../lib/format'
import type { ParticipantFormValues } from '../../lib/participants'
import {
  approveRegistration,
  formatGuardianContactSummary,
  mappedToFormValues,
  notifyRegistrationsChanged,
  rejectRegistration,
  type RegistrationQueueRow,
} from '../../lib/registrations'

import { btnGhost, btnPrimary, inputClass, surfaceCard } from '../../ui/classes'

type RegistrationReviewCardProps = {
  registration: RegistrationQueueRow
  staffId: string
  onReviewed: () => void
}

export default function RegistrationReviewCard({
  registration,
  staffId,
  onReviewed,
}: RegistrationReviewCardProps) {
  const [values, setValues] = useState<ParticipantFormValues>(() =>
    mappedToFormValues(registration.mapped),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false)

  function updateField<K extends keyof ParticipantFormValues>(
    key: K,
    value: ParticipantFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleApprove() {
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await approveRegistration({
        registrationId: registration.id,
        submissionId: registration.submission_id,
        staffId,
        values,
      })

      const message = result.linkedExisting
        ? 'Linked to the existing participant for this submission — no duplicate created.'
        : 'Approved. The boy is on the roster and ready to print on Lanyards.'

      setSuccess(message)
      notifyRegistrationsChanged()
      onReviewed()
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : 'Unable to approve registration.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReject() {
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    setRejectConfirmOpen(false)

    try {
      await rejectRegistration({
        registrationId: registration.id,
        staffId,
      })
      notifyRegistrationsChanged()
      onReviewed()
    } catch (rejectError) {
      setError(
        rejectError instanceof Error
          ? rejectError.message
          : 'Unable to reject registration.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const summaryName = formatParticipantName(values.first_name, values.last_initial)
  const contactSummary = formatGuardianContactSummary(values)

  return (
    <article className={`${surfaceCard} space-y-4 border border-cream-200 p-4 sm:p-5`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {summaryName || 'Unnamed submission'}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Guardian: {values.guardian_name || '—'}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">{contactSummary}</p>
        </div>
        <div className="shrink-0 text-sm text-slate-500">
          <p>{registration.jotform_forms?.label ?? 'Registration form'}</p>
          <p className="mt-1">{formatDateTime(registration.received_at)}</p>
          <p className="mt-1 font-mono text-xs text-slate-600">
            #{registration.submission_id}
          </p>
        </div>
      </div>

      <details className="rounded-xl border border-cream-200 bg-cream-50/50 p-3">
        <summary className="cursor-pointer touch-manipulation text-sm font-semibold text-slate-700">
          Raw submission
        </summary>
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-600">
          {JSON.stringify(registration.raw_payload, null, 2)}
        </pre>
      </details>

      <div className="space-y-4 rounded-xl border border-cream-200 bg-cream-50/30 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Review and correct
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-1">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              First name
            </span>
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
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Last initial
            </span>
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
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Guardian name
          </span>
          <input
            type="text"
            required
            disabled={submitting}
            value={values.guardian_name}
            onChange={(event) => updateField('guardian_name', event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Guardian email
          </span>
          <input
            type="email"
            disabled={submitting}
            value={values.guardian_email}
            onChange={(event) => updateField('guardian_email', event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Guardian phone
          </span>
          <input
            type="tel"
            disabled={submitting}
            value={values.guardian_phone}
            onChange={(event) => updateField('guardian_phone', event.target.value)}
            placeholder="(336) 555-0100"
            className={inputClass}
          />
        </label>

        <AuthorizedPickupsField
          values={values.authorized_pickups}
          disabled={submitting}
          onChange={(authorized_pickups) =>
            updateField('authorized_pickups', authorized_pickups)
          }
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          {success}
        </p>
      )}

      {rejectConfirmOpen && (
        <ConfirmPanel
          title="Reject this registration?"
          confirmLabel="Reject"
          tone="red"
          loading={submitting}
          onConfirm={() => void handleReject()}
          onCancel={() => setRejectConfirmOpen(false)}
        >
          Reject registration for{' '}
          <strong>
            {formatParticipantName(values.first_name, values.last_initial) ||
              'this boy'}
          </strong>
          ? No participant will be created.
        </ConfirmPanel>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleApprove()}
          className={`${btnPrimary} flex-1`}
        >
          {submitting ? 'Saving…' : 'Approve'}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => setRejectConfirmOpen(true)}
          className={`${btnGhost} flex-1 border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100`}
        >
          Reject
        </button>
      </div>
    </article>
  )
}
