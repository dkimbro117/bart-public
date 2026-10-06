import { useEffect, useMemo, useState } from 'react'
import ConfirmPanel from '../ui/ConfirmPanel'
import { formatDateTime } from '../../lib/dates'
import {
  createReminderSettings,
  DEFAULT_REMINDER_SETTINGS,
  fetchReminderSettings,
  previewReminderBody,
  previewReminderSubject,
  reminderSettingsToFormValues,
  saveReminderSettings,
  triggerSessionReminders,
  type ReminderSettings,
  type ReminderSettingsFormValues,
} from '../../lib/reminders'
import { REMINDER_PLACEHOLDERS } from '../../lib/reminderTemplates'
import { markdownToHtml } from '../../lib/markdown'
import {
  btnPrimary,
  btnSecondary,
  choiceRow,
  headingSection,
  inputClass,
  labelClass,
  proseLight,
  sectionCard,
  textareaClass,
} from '../../ui/classes'

type ReminderSettingsPanelProps = {
  onSaved?: () => void
  onError?: (message: string) => void
}

export default function ReminderSettingsPanel({ onSaved, onError }: ReminderSettingsPanelProps) {
  const [settings, setSettings] = useState<ReminderSettings | null>(null)
  const [values, setValues] = useState<ReminderSettingsFormValues>(DEFAULT_REMINDER_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [runConfirmOpen, setRunConfirmOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [runMessage, setRunMessage] = useState<string | null>(null)

  const reportError = (message: string) => {
    onError?.(message)
  }

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)

      try {
        const row = await fetchReminderSettings()
        if (!mounted) return

        if (row) {
          setSettings(row)
          setValues(reminderSettingsToFormValues(row))
        }
      } catch (loadError) {
        if (!mounted) return
        reportError(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load reminder settings.',
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  const previewSubject = useMemo(
    () => previewReminderSubject(values.subject_template),
    [values.subject_template],
  )

  const previewBodyHtml = useMemo(
    () => markdownToHtml(previewReminderBody(values.body_template)),
    [values.body_template],
  )

  const updateField = <K extends keyof ReminderSettingsFormValues>(
    key: K,
    value: ReminderSettingsFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }))
    setSaveMessage(null)
    setRunMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)

    try {
      const saved = settings
        ? await saveReminderSettings(settings.id, values)
        : await createReminderSettings(values)
      setSettings(saved)
      setValues(reminderSettingsToFormValues(saved))
      setSaveMessage('Reminder settings saved.')
      onSaved?.()
    } catch (saveError) {
      reportError(
        saveError instanceof Error ? saveError.message : 'Failed to save reminder settings.',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleRunNow = async () => {
    setRunning(true)
    setRunMessage(null)
    setRunConfirmOpen(false)

    try {
      const result = await triggerSessionReminders()
      const sentCount = result.results.filter(
        (row: { status: string }) => row.status === 'sent',
      ).length
      setRunMessage(
        result.enabled
          ? `Processed ${result.sessions_matched} session(s) for ${result.target_session_date}. ${sentCount} reminder broadcast(s) sent.`
          : 'Reminders are disabled — no emails sent.',
      )
      onSaved?.()
    } catch (runError) {
      reportError(
        runError instanceof Error ? runError.message : 'Failed to run session reminders.',
      )
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return <p className="text-slate-500">Loading reminder settings…</p>
  }

  return (
    <div className={`space-y-6 ${sectionCard}`}>
      <div>
        <h2 className={headingSection}>Session reminders</h2>
        <p className="mt-1 text-sm text-slate-500">
          Automatically email all active guardians before each session. A daily cron job runs
          at 14:00 UTC and sends when a session is exactly the configured number of days
          away.
        </p>
      </div>

      <label className={choiceRow}>
        <input
          type="checkbox"
          checked={values.enabled}
          onChange={(event) => updateField('enabled', event.target.checked)}
        />
        <span className="font-medium text-slate-900">Enable automated session reminders</span>
      </label>

      <label className="block">
        <span className={labelClass}>
          Days before session
        </span>
        <input
          type="number"
          min={1}
          max={30}
          value={values.days_before}
          onChange={(event) =>
            updateField('days_before', Math.max(1, Number(event.target.value) || 1))
          }
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>
          Subject template
        </span>
        <input
          type="text"
          value={values.subject_template}
          onChange={(event) => updateField('subject_template', event.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Body template</span>
        <textarea
          value={values.body_template}
          onChange={(event) => updateField('body_template', event.target.value)}
          className={`min-h-32 ${textareaClass}`}
        />
        <p className="mt-2 text-xs text-slate-500">
          Markdown supported. Placeholders:{' '}
          {REMINDER_PLACEHOLDERS.map((placeholder) => `{{${placeholder}}}`).join(', ')}
        </p>
      </label>

      <div className="rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-4">
        <p className="text-sm font-medium text-slate-700">Template preview</p>
        <p className="mt-2 font-semibold text-slate-900">{previewSubject}</p>
        <div
          className={`mt-3 text-sm ${proseLight}`}
          dangerouslySetInnerHTML={{ __html: previewBodyHtml }}
        />
        {settings?.updated_at && (
          <p className="mt-3 text-xs text-slate-500">
            Last saved {formatDateTime(settings.updated_at)}
          </p>
        )}
      </div>

      {runConfirmOpen && (
        <ConfirmPanel
          title="Run session reminders now?"
          confirmLabel="Run now"
          tone="amber"
          loading={running}
          onConfirm={() => void handleRunNow()}
          onCancel={() => setRunConfirmOpen(false)}
        >
          This sends emails for any matching sessions — same as the daily cron job.
        </ConfirmPanel>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className={btnPrimary}
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        <button
          type="button"
          disabled={running}
          onClick={() => setRunConfirmOpen(true)}
          className={btnSecondary}
        >
          {running ? 'Running…' : 'Run reminders now'}
        </button>
      </div>

      {saveMessage && <p className="text-sm text-emerald-700">{saveMessage}</p>}
      {runMessage && <p className="text-sm text-slate-600">{runMessage}</p>}
    </div>
  )
}
