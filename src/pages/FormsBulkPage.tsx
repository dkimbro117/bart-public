import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDisplayId, formatParticipantName } from '../lib/format'
import {
  PARTICIPANT_FORM_CONSENTS,
  type ParticipantFormConsentKey,
} from '../lib/participants'
import { PARTICIPANT_ROSTER_LIST } from '../lib/participantColumns'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  alertSuccess,
  btnPrimary,
  btnSecondary,
  headingPage,
  inputClass,
  labelClass,
  linkBack,
  listCard,
  textMuted,
  textSubtle,
} from '../ui/classes'

type RosterBoy = {
  id: string
  display_id: number
  first_name: string
  last_initial: string
  last_name: string | null
  active: boolean
}

export default function FormsBulkPage() {
  const [boys, setBoys] = useState<RosterBoy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedForms, setSelectedForms] = useState<
    Set<ParticipantFormConsentKey>
  >(new Set())
  const [markValue, setMarkValue] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadBoys = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('participants')
      .select(PARTICIPANT_ROSTER_LIST)
      .eq('active', true)
      .order('display_id', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setBoys([])
    } else {
      setBoys(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadBoys()
  }, [loadBoys])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return boys
    return boys.filter((boy) => {
      const name = formatParticipantName(
        boy.first_name,
        boy.last_initial,
        boy.last_name,
      ).toLowerCase()
      return (
        name.includes(q) ||
        boy.first_name.toLowerCase().includes(q) ||
        String(boy.display_id).includes(q)
      )
    })
  }, [boys, search])

  function toggleBoy(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleForm(key: ParticipantFormConsentKey) {
    setSelectedForms((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function selectAllFiltered() {
    setSelectedIds(new Set(filtered.map((boy) => boy.id)))
  }

  function clearBoys() {
    setSelectedIds(new Set())
  }

  async function handleApply() {
    if (selectedIds.size === 0 || selectedForms.size === 0) {
      setError('Select at least one boy and one form.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    const patch = Object.fromEntries(
      [...selectedForms].map((key) => [key, markValue]),
    ) as Partial<Record<ParticipantFormConsentKey, boolean>>

    const { error: updateError } = await supabase
      .from('participants')
      .update(patch)
      .in('id', [...selectedIds])

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    const formWord = selectedForms.size === 1 ? 'form' : 'forms'
    const boyWord = selectedIds.size === 1 ? 'boy' : 'boys'
    setSuccess(
      `Marked ${selectedForms.size} ${formWord} ${
        markValue ? 'on file' : 'not on file'
      } for ${selectedIds.size} ${boyWord}.`,
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <Link to="/roster" className={linkBack}>
          ← Boys roster
        </Link>
        <h1 className={`mt-3 ${headingPage}`}>Mark forms in bulk</h1>
        <p className={`mt-1 text-sm ${textSubtle}`}>
          Select forms and boys, then apply. Active roster only.
        </p>
      </div>

      {error && <p className={alertErrorInline}>{error}</p>}
      {success && (
        <div className={alertSuccess}>
          <p className="text-sm text-emerald-900">{success}</p>
        </div>
      )}

      <div className="space-y-3">
        <p className={labelClass}>Forms to update</p>
        <ul className={`${listCard} divide-y divide-cream-200`}>
          {PARTICIPANT_FORM_CONSENTS.map(({ key, label }) => {
            const checked = selectedForms.has(key)
            return (
              <li key={key}>
                <label className="flex min-h-12 cursor-pointer items-start gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 rounded border-cream-300 text-crimson-600"
                    checked={checked}
                    onChange={() => toggleForm(key)}
                  />
                  <span className="text-sm font-medium text-ink-900">{label}</span>
                </label>
              </li>
            )
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondary}
            onClick={() =>
              setSelectedForms(
                new Set(PARTICIPANT_FORM_CONSENTS.map(({ key }) => key)),
              )
            }
          >
            Select all forms
          </button>
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setSelectedForms(new Set())}
          >
            Clear forms
          </button>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className={labelClass}>Mark as</legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex min-h-12 items-center gap-2">
            <input
              type="radio"
              name="mark-value"
              checked={markValue}
              onChange={() => setMarkValue(true)}
            />
            <span className="text-sm font-medium text-ink-900">On file</span>
          </label>
          <label className="flex min-h-12 items-center gap-2">
            <input
              type="radio"
              name="mark-value"
              checked={!markValue}
              onChange={() => setMarkValue(false)}
            />
            <span className="text-sm font-medium text-ink-900">Not on file</span>
          </label>
        </div>
      </fieldset>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="block flex-1">
            <span className={labelClass}>Boys</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or #"
              className={inputClass}
            />
          </label>
          <p className={`text-sm ${textMuted}`}>
            {selectedIds.size} selected
            {loading ? ' · Loading…' : ` · ${filtered.length} shown`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={selectAllFiltered}>
            Select all shown
          </button>
          <button type="button" className={btnSecondary} onClick={clearBoys}>
            Clear boys
          </button>
        </div>
        <ul className={`${listCard} max-h-96 divide-y divide-cream-200 overflow-y-auto`}>
          {filtered.map((boy) => {
            const checked = selectedIds.has(boy.id)
            return (
              <li key={boy.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2.5">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-cream-300 text-crimson-600"
                    checked={checked}
                    onChange={() => toggleBoy(boy.id)}
                  />
                  <span className="w-14 shrink-0 font-mono text-sm font-semibold text-crimson-600">
                    {formatDisplayId(boy.display_id)}
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium text-ink-900">
                    {formatParticipantName(
                      boy.first_name,
                      boy.last_initial,
                      boy.last_name,
                    )}
                  </span>
                </label>
              </li>
            )
          })}
          {!loading && filtered.length === 0 && (
            <li className={`px-4 py-8 text-center text-sm ${textMuted}`}>
              No boys match.
            </li>
          )}
        </ul>
      </div>

      <button
        type="button"
        disabled={saving || selectedIds.size === 0 || selectedForms.size === 0}
        onClick={() => void handleApply()}
        className={btnPrimary}
      >
        {saving ? 'Saving…' : 'Apply to selected boys'}
      </button>
    </section>
  )
}
