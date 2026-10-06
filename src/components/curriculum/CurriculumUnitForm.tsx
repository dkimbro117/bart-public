import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSyncStatus } from '../../contexts/SyncContext'
import {
  findConflictingUnitForSession,
  type CurriculumUnitFormValues,
  type CurriculumUnitListRow,
} from '../../lib/curriculum'
import { CURRICULUM_UNIT_LIST } from '../../lib/curriculumColumns'
import { formatSessionLabel } from '../../lib/dates'
import { sessionSupportsReading } from '../../lib/sessions'
import { supabase } from '../../lib/supabase'
import {
  alertErrorInline,
  btnPrimary,
  btnSecondary,
  inputClass,
  labelClass,
  textareaClass,
} from '../../ui/classes'

type CurriculumUnitFormProps = {
  initialValues: CurriculumUnitFormValues
  submitLabel: string
  onSubmit: (values: CurriculumUnitFormValues) => Promise<void>
  onCancel: () => void
  currentUnitId?: string | null
}

export default function CurriculumUnitForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  currentUnitId = null,
}: CurriculumUnitFormProps) {
  const { sessions } = useSyncStatus()
  const readingSessions = useMemo(
    () => sessions.filter(sessionSupportsReading),
    [sessions],
  )
  const [values, setValues] = useState(initialValues)
  const [peerUnits, setPeerUnits] = useState<CurriculumUnitListRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadPeers() {
      const { data } = await supabase
        .from('curriculum_units')
        .select(CURRICULUM_UNIT_LIST)
      if (mounted) {
        setPeerUnits(data ?? [])
      }
    }

    void loadPeers()
    return () => {
      mounted = false
    }
  }, [])

  const sessionConflict = values.session_id
    ? findConflictingUnitForSession(
        values.session_id,
        currentUnitId,
        peerUnits,
      )
    : null

  function updateField<K extends keyof CurriculumUnitFormValues>(
    key: K,
    value: CurriculumUnitFormValues[K],
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
        <span className={labelClass}>Title</span>
        <input
          type="text"
          required
          disabled={submitting}
          value={values.title}
          onChange={(event) => updateField('title', event.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Description</span>
        <textarea
          disabled={submitting}
          value={values.description}
          onChange={(event) => updateField('description', event.target.value)}
          placeholder="What this unit covers"
          className={`min-h-28 ${textareaClass}`}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Reading assignment</span>
        <textarea
          disabled={submitting}
          value={values.reading_assignment}
          onChange={(event) =>
            updateField('reading_assignment', event.target.value)
          }
          placeholder="Pages, chapters, or links boys should read"
          className={`min-h-28 ${textareaClass}`}
        />
        <p className="mt-2 text-sm text-slate-500">
          Staff reference for now — boys see the unit title on the reading kiosk;
          assignment text isn’t shown on-device yet.
        </p>
      </label>

      <label className="block">
        <span className={labelClass}>Session (optional)</span>
        <select
          disabled={submitting || readingSessions.length === 0}
          value={values.session_id}
          onChange={(event) => updateField('session_id', event.target.value)}
          className={inputClass}
        >
          <option value="">No session attached</option>
          {readingSessions.map((session) => (
            <option key={session.id} value={session.id}>
              {formatSessionLabel(session.title, session.session_date)}
            </option>
          ))}
        </select>
        {readingSessions.length === 0 && (
          <p className="mt-2 text-sm text-slate-500">
            Sync a reading-capable session first to attach this unit.
          </p>
        )}
        {sessionConflict && (
          <p className="mt-2 text-sm text-amber-800">
            “{sessionConflict.title}” is also linked to this session. The newest
            unit is used on the kiosk.
          </p>
        )}
      </label>

      {error && <p className={alertErrorInline}>{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={submitting}
          className={`flex-1 ${btnPrimary}`}
        >
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
