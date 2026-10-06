import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTime } from '../lib/dates'
import {
  aiSettingsToFormValues,
  fetchAiSettings,
  saveAiSettings,
  type AiSettingsFormValues,
} from '../lib/aiSettings'
import {
  alertInfo,
  alertWarning,
  btnPrimary,
  headingPage,
  sectionCard,
  textSubtle,
} from '../ui/classes'

type AiFeatureToggle = {
  key: keyof AiSettingsFormValues
  label: string
  description: string
  status: 'ready' | 'blocked'
}

const featureToggles: AiFeatureToggle[] = [
  {
    key: 'quiz_drafting',
    label: 'Quiz drafting',
    description:
      'Draft multiple-choice questions from a unit’s reading assignment. Staff review and edit before saving.',
    status: 'ready',
  },
  {
    key: 'intake_cleanup',
    label: 'Registration intake cleanup',
    description:
      'Normalize messy JotForm submissions and flag ambiguous fields in the review queue. Requires JotForm to be connected.',
    status: 'blocked',
  },
  {
    key: 'report_phrasing',
    label: 'Guardian report phrasing',
    description:
      'Optional warm intro sentences on session summary emails. Requires Resend to be configured.',
    status: 'blocked',
  },
  {
    key: 'nl_query',
    label: 'Natural-language reports',
    description:
      'Plain-English questions on the reports dashboard. Ships last with strict guardrails.',
    status: 'blocked',
  },
]

export default function AiSettingsPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [values, setValues] = useState<AiSettingsFormValues | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const settings = await fetchAiSettings()
      setValues(aiSettingsToFormValues(settings))
      setUpdatedAt(settings.updated_at)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load AI settings.',
      )
      setValues(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      void loadSettings()
    }
  }, [isAdmin, loadSettings])

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  async function handleSave() {
    if (!values) {
      return
    }

    setSaving(true)
    setError(null)
    setSaveMessage(null)

    try {
      const saved = await saveAiSettings(values)
      setValues(aiSettingsToFormValues(saved))
      setUpdatedAt(saved.updated_at)
      setSaveMessage('AI settings saved.')
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to save AI settings.',
      )
    } finally {
      setSaving(false)
    }
  }

  function updateToggle(key: keyof AiSettingsFormValues, enabled: boolean) {
    setValues((current) => (current ? { ...current, [key]: enabled } : current))
    setSaveMessage(null)
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link
          to="/"
          className="inline-flex min-h-12 touch-manipulation items-center text-sm font-medium text-crimson-700 hover:text-crimson-600"
        >
          ← Back to home
        </Link>
        <div>
          <h1 className={headingPage}>AI automations</h1>
          <p className={`mt-1 ${textSubtle}`}>
            Enable Claude-powered helpers for staff workflows. Every automation
            requires human review before anything is saved or sent.
          </p>
        </div>
      </div>

      <div className={alertWarning}>
        <p className="text-sm text-amber-900">
          Some automations send participant-entered data (names, guardian contact)
          to the Anthropic API. Confirm your chapter is comfortable with that
          before enabling intake cleanup or quiz drafting on real data.
        </p>
      </div>

      <div className={`space-y-4 ${sectionCard}`}>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Feature toggles</h2>
          <p className={`mt-1 text-sm ${textSubtle}`}>
            Disabled features fall back to the existing manual workflow with no
            errors for staff.
          </p>
        </div>

        {loading ? (
          <p className="text-slate-500">Loading settings…</p>
        ) : !values ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
            {error ?? 'Settings unavailable.'}
          </p>
        ) : (
          <ul className="space-y-4">
            {featureToggles.map((feature) => (
              <li
                key={feature.key}
                className="flex flex-col gap-3 rounded-xl border border-cream-200 bg-cream-50/50 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">{feature.label}</p>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                  {feature.status === 'blocked' && (
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                      Not built yet — toggle reserved for a later phase
                    </p>
                  )}
                </div>
                <label className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">
                    {values[feature.key] ? 'On' : 'Off'}
                  </span>
                  <input
                    type="checkbox"
                    className="h-6 w-6 rounded border-cream-300 text-crimson-600 focus:ring-crimson-500"
                    checked={values[feature.key]}
                    disabled={saving || feature.status === 'blocked'}
                    onChange={(event) =>
                      updateToggle(feature.key, event.target.checked)
                    }
                  />
                </label>
              </li>
            ))}
          </ul>
        )}

        {error && values && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
            {error}
          </p>
        )}

        {saveMessage && (
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
            {saveMessage}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {updatedAt && (
            <p className="text-sm text-slate-500">
              Last saved {formatDateTime(updatedAt)}
            </p>
          )}
          <button
            type="button"
            disabled={saving || loading || !values}
            onClick={() => void handleSave()}
            className={`${btnPrimary} sm:ml-auto`}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>

      <div className={`space-y-3 ${alertInfo}`}>
        <h2 className="text-base font-semibold text-slate-900">Server setup</h2>
        <p className="text-sm text-slate-600">
          Set the Anthropic API key as a Supabase secret, then deploy the edge
          functions:
        </p>
        <pre className="overflow-x-auto rounded-xl bg-cream-100 p-4 text-xs text-slate-800">
          {`supabase secrets set ANTHROPIC_API_KEY='…'
supabase functions deploy draft-quiz`}
        </pre>
      </div>
    </section>
  )
}
