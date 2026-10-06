import { FormEvent, useCallback, useEffect, useState } from 'react'
import SessionBanner from '../components/SessionBanner'
import { useSyncStatus } from '../contexts/SyncContext'
import { formatDateTime } from '../lib/dates'
import {
  addDoorHelperName,
  endDoorNight,
  fetchDoorGrants,
  fetchDoorHelperNames,
  fetchDoorNight,
  removeDoorHelperName,
  startDoorNight,
  type SessionDoorGrant,
  type SessionDoorHelperName,
  type SessionDoorNight,
} from '../lib/doorGrants'
import {
  alertErrorInline,
  alertSuccessInline,
  btnDanger,
  btnPrimary,
  btnSecondary,
  headingPage,
  inputClass,
  labelClass,
  sectionCard,
  textSubtle,
} from '../ui/classes'

export default function DoorHelpersPage() {
  const { selectedSessionId } = useSyncStatus()
  const [night, setNight] = useState<SessionDoorNight | null>(null)
  const [names, setNames] = useState<SessionDoorHelperName[]>([])
  const [grants, setGrants] = useState<SessionDoorGrant[]>([])
  const [helperName, setHelperName] = useState('')
  const [latestPin, setLatestPin] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!selectedSessionId) {
      setNight(null)
      setNames([])
      setGrants([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [nextNight, nextNames, nextGrants] = await Promise.all([
        fetchDoorNight(selectedSessionId),
        fetchDoorHelperNames(selectedSessionId),
        fetchDoorGrants(selectedSessionId),
      ])
      setNight(nextNight)
      setNames(nextNames)
      setGrants(nextGrants)
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load door night.',
      )
    } finally {
      setLoading(false)
    }
  }, [selectedSessionId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleStart(regenerate: boolean) {
    if (!selectedSessionId) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await startDoorNight({
        sessionId: selectedSessionId,
        regenerate,
      })
      setLatestPin(result.pin)
      await load()
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : 'Could not start door night.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEndNight() {
    if (!selectedSessionId) return
    setSubmitting(true)
    setError(null)
    setLatestPin(null)
    try {
      await endDoorNight(selectedSessionId)
      await load()
    } catch (endError) {
      setError(
        endError instanceof Error ? endError.message : 'Could not end door night.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddName(event: FormEvent) {
    event.preventDefault()
    if (!selectedSessionId || !helperName.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await addDoorHelperName({
        sessionId: selectedSessionId,
        helperName,
      })
      setHelperName('')
      await load()
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Could not add name.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemoveName(id: string) {
    setSubmitting(true)
    setError(null)
    try {
      await removeDoorHelperName(id)
      await load()
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : 'Could not remove name.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const activeSignedIn = grants.filter(
    (grant) => !grant.revoked_at && new Date(grant.expires_at) > new Date(),
  )

  return (
    <section className="space-y-6">
      <div>
        <h1 className={headingPage}>BART Volunteers</h1>
        <p className={`mt-1 text-sm ${textSubtle}`}>
          Start door night to get one shared PIN. BART Volunteers enter it plus
          their name at /door. Access is check-in, check-out, and live roster
          only — and it ends when you end door night (or the PIN expires).
          Starting or regenerating always issues a new unique PIN.
        </p>
      </div>

      <SessionBanner verb="Door night for" />

      {error && <p className={alertErrorInline}>{error}</p>}

      {latestPin && (
        <div className={alertSuccessInline}>
          <p className="font-semibold">Tonight’s door PIN (copy and share):</p>
          <p className="mt-1 font-mono text-2xl tracking-[0.3em]">{latestPin}</p>
          <p className={`mt-2 text-sm ${textSubtle}`}>
            Shown now only. If you leave this page, regenerate to get a new PIN.
          </p>
        </div>
      )}

      <div className={`${sectionCard} space-y-4 p-5`}>
        <h2 className="text-lg font-semibold text-slate-900">Door night PIN</h2>
        {loading ? (
          <p className={textSubtle}>Loading…</p>
        ) : night ? (
          <>
            <p className="text-sm text-slate-700">
              Door night is <strong>active</strong> until{' '}
              {formatDateTime(night.expires_at)}.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!selectedSessionId || submitting}
                onClick={() => void handleStart(true)}
                className={btnSecondary}
              >
                {submitting ? 'Working…' : 'Regenerate PIN'}
              </button>
              <button
                type="button"
                disabled={!selectedSessionId || submitting}
                onClick={() => void handleEndNight()}
                className={btnDanger}
              >
                End door night
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={`text-sm ${textSubtle}`}>
              No active door PIN for this session yet.
            </p>
            <button
              type="button"
              disabled={!selectedSessionId || submitting}
              onClick={() => void handleStart(false)}
              className={btnPrimary}
            >
              {submitting ? 'Starting…' : 'Start door night'}
            </button>
          </>
        )}
      </div>

      <div className={`${sectionCard} space-y-4 p-5`}>
        <h2 className="text-lg font-semibold text-slate-900">
          Helper names (optional)
        </h2>
        <p className={`text-sm ${textSubtle}`}>
          Pre-list expected helpers so they can pick their name faster. Walk-ups
          can still type a name at sign-in.
        </p>
        <form onSubmit={(event) => void handleAddName(event)} className="flex flex-col gap-3 sm:flex-row">
          <label className="block flex-1">
            <span className={labelClass}>Name</span>
            <input
              className={inputClass}
              value={helperName}
              onChange={(event) => setHelperName(event.target.value)}
              placeholder="First and last name"
              disabled={!selectedSessionId || submitting}
            />
          </label>
          <button
            type="submit"
            disabled={!selectedSessionId || submitting || !helperName.trim()}
            className={`${btnSecondary} sm:self-end`}
          >
            Add name
          </button>
        </form>
        {names.length === 0 ? (
          <p className={`text-sm ${textSubtle}`}>No names listed yet.</p>
        ) : (
          <ul className="divide-y divide-cream-200 rounded-xl border border-cream-200">
            {names.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="font-medium text-slate-900">{row.helper_name}</span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleRemoveName(row.id)}
                  className="text-sm font-semibold text-crimson-700 hover:text-crimson-800"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={sectionCard}>
        <h2 className="px-5 pt-4 text-lg font-semibold">Signed in tonight</h2>
        {loading ? (
          <p className={`px-5 py-4 ${textSubtle}`}>Loading…</p>
        ) : activeSignedIn.length === 0 ? (
          <p className={`px-5 py-4 ${textSubtle}`}>
            No helpers have signed in with tonight’s PIN yet.
          </p>
        ) : (
          <ul className="divide-y divide-cream-200">
            {activeSignedIn.map((grant) => (
              <li key={grant.id} className="px-5 py-4">
                <p className="font-semibold text-slate-900">{grant.helper_name}</p>
                <p className={`text-sm ${textSubtle}`}>
                  Signed in {formatDateTime(grant.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
