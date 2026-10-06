import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminAccessNotice from '../components/AdminAccessNotice'
import { BrandedEmptyState } from '../components/brand/BrandedStates'
import ConsolePageLayout from '../components/ui/ConsolePageLayout'
import { useAuth } from '../contexts/AuthContext'
import { useConsoleSelection } from '../hooks/useConsoleSelection'
import { useInputMode } from '../hooks/useInputMode'
import { isStaffAdmin } from '../lib/auth'
import {
  balanceLabel,
  fetchBucksBalances,
  fetchBucksSettings,
  fetchParticipantLedger,
  formatBucksAmount,
  formatBucksReason,
  recordBucksAdjustment,
  saveBucksSettings,
  settingsToFormValues,
  type BucksLedgerRow,
  type BucksSettingsFormValues,
  type ParticipantBucksBalance,
} from '../lib/bucks'
import { formatDateTime } from '../lib/dates'
import { formatDisplayId } from '../lib/format'
import {
  alertErrorInline,
  alertSuccessInline,
  btnPrimary,
  btnSecondary,
  consoleListButton,
  consoleListButtonActive,
  consolePanelPlaceholder,
  headingPage,
  inputClass,
  labelClass,
  listCard,
  sectionCard,
  textAccent,
  textMuted,
  textSubtle,
} from '../ui/classes'

export default function BucksPage() {
  const { profile, loading: authLoading } = useAuth()
  const isAdmin = isStaffAdmin(profile)
  const { isDesktopViewport } = useInputMode()
  const [balances, setBalances] = useState<ParticipantBucksBalance[]>([])
  const [ledger, setLedger] = useState<BucksLedgerRow[]>([])
  const [settingsForm, setSettingsForm] =
    useState<BucksSettingsFormValues | null>(null)
  const [loading, setLoading] = useState(true)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [adjustReason, setAdjustReason] = useState<
    'cash' | 'participation' | 'adjustment'
  >('cash')
  const [adjusting, setAdjusting] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  const loadBalances = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextBalances, settings] = await Promise.all([
        fetchBucksBalances(true),
        isAdmin ? fetchBucksSettings() : Promise.resolve(null),
      ])
      setBalances(nextBalances)
      if (settings) {
        setSettingsForm(settingsToFormValues(settings))
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load BART Bucks.',
      )
      setBalances([])
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    void loadBalances()
  }, [loadBalances])

  const getId = useCallback(
    (row: ParticipantBucksBalance) => row.participant_id ?? '',
    [],
  )
  const { selected, setSelectedId } = useConsoleSelection(
    balances,
    getId,
    isDesktopViewport,
  )

  useEffect(() => {
    if (!selected?.participant_id) {
      setLedger([])
      return
    }

    let mounted = true
    setLedgerLoading(true)
    void fetchParticipantLedger(selected.participant_id)
      .then((rows) => {
        if (mounted) setLedger(rows)
      })
      .catch((ledgerError) => {
        if (mounted) {
          setError(
            ledgerError instanceof Error
              ? ledgerError.message
              : 'Failed to load ledger.',
          )
        }
      })
      .finally(() => {
        if (mounted) setLedgerLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [selected?.participant_id])

  const totalOutstanding = useMemo(
    () => balances.reduce((sum, row) => sum + (row.balance ?? 0), 0),
    [balances],
  )

  async function handleAdjust(event: FormEvent) {
    event.preventDefault()
    if (!selected?.participant_id || !isAdmin) return

    const amount = Number.parseInt(adjustAmount, 10)
    if (!Number.isFinite(amount) || amount === 0) {
      setError('Enter a non-zero whole number (negative to redeem).')
      return
    }

    setAdjusting(true)
    setError(null)
    setNotice(null)
    try {
      await recordBucksAdjustment({
        participantId: selected.participant_id,
        amount,
        note: adjustNote,
        reason: amount < 0 ? 'spend' : adjustReason,
      })
      setAdjustAmount('')
      setAdjustNote('')
      setNotice(
        amount < 0
          ? `Redeemed ${Math.abs(amount)} bucks.`
          : `Added ${amount} bucks.`,
      )
      await loadBalances()
      const rows = await fetchParticipantLedger(selected.participant_id)
      setLedger(rows)
    } catch (adjustError) {
      setError(
        adjustError instanceof Error
          ? adjustError.message
          : 'Adjustment failed.',
      )
    } finally {
      setAdjusting(false)
    }
  }

  async function handleSaveSettings(event: FormEvent) {
    event.preventDefault()
    if (!settingsForm || !isAdmin) return
    setSavingSettings(true)
    setError(null)
    setNotice(null)
    try {
      await saveBucksSettings(settingsForm)
      setNotice('Earn rates saved. New activity uses the updated rates.')
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Failed to save rates.',
      )
    } finally {
      setSavingSettings(false)
    }
  }

  if (authLoading) {
    return (
      <section className="mx-auto max-w-2xl">
        <p className={textSubtle}>Loading account…</p>
      </section>
    )
  }

  if (!isAdmin) {
    return <AdminAccessNotice title="BART Bucks" actionLabel="manage BART Bucks" />
  }

  const header = (
    <>
      <div>
        <h1 className={headingPage}>BART Bucks</h1>
        <p className={`mt-1 ${textSubtle}`}>
          Server-tracked ledger. Boys earn on check-in, reading minutes, and
          quizzes.
        </p>
        <p className={`mt-2 ${textMuted}`}>
          Active roster total: <span className={textAccent}>{totalOutstanding}</span>{' '}
          bucks
        </p>
      </div>
      {error && <p className={alertErrorInline}>{error}</p>}
      {notice && <p className={alertSuccessInline}>{notice}</p>}
    </>
  )

  const list = (
    <div className={listCard}>
      {loading ? (
        <p className={`${textSubtle} p-4`}>Loading…</p>
      ) : balances.length === 0 ? (
        <BrandedEmptyState>
          No balances yet. Check-ins, reading logs, and quizzes create entries
          automatically.
        </BrandedEmptyState>
      ) : (
        <ul className="divide-y divide-cream-200">
          {balances.map((row) => {
            const id = row.participant_id ?? ''
            const active = selected?.participant_id === id
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(id)}
                  className={active ? consoleListButtonActive : consoleListButton}
                >
                  <span className={`w-14 shrink-0 ${textAccent}`}>
                    {formatDisplayId(row.display_id ?? 0)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">
                    {balanceLabel(row)}
                  </span>
                  <span className="shrink-0 font-mono font-semibold text-crimson-700">
                    {row.balance ?? 0}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )

  const panel = selected?.participant_id ? (
    <div className="space-y-5">
      <div className={sectionCard}>
        <p className={textAccent}>
          {formatDisplayId(selected.display_id ?? 0)}
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">
          {balanceLabel(selected)}
        </h2>
        <p className="mt-2 text-3xl font-bold text-crimson-700">
          {selected.balance ?? 0}{' '}
          <span className="text-base font-medium text-ink-500">bucks</span>
        </p>
        <Link
          to={`/roster/${selected.participant_id}`}
          className={`${btnSecondary} mt-4 inline-flex`}
        >
          Open roster profile
        </Link>
      </div>

      <form onSubmit={(event) => void handleAdjust(event)} className={sectionCard}>
        <h3 className="text-base font-semibold text-slate-900">
          End of day / cash allotment
        </h3>
        <p className={`mt-1 text-sm ${textMuted}`}>
          After counting physical BART Bucks, add the total here. Use
          Participation for a session stamp, Cash for in-person allotments.
          Negative amounts redeem.
        </p>
        <label className="mt-4 block">
          <span className={labelClass}>Reason</span>
          <select
            className={inputClass}
            disabled={adjusting}
            value={adjustReason}
            onChange={(event) =>
              setAdjustReason(
                event.target.value as 'cash' | 'participation' | 'adjustment',
              )
            }
          >
            <option value="cash">Cash / in-person count</option>
            <option value="participation">Participation</option>
            <option value="adjustment">Other adjustment</option>
          </select>
        </label>
        <label className="mt-4 block">
          <span className={labelClass}>Amount</span>
          <input
            type="number"
            required
            disabled={adjusting}
            value={adjustAmount}
            onChange={(event) => setAdjustAmount(event.target.value)}
            className={inputClass}
            placeholder="-25"
          />
        </label>
        <label className="mt-3 block">
          <span className={labelClass}>Note (optional)</span>
          <input
            type="text"
            disabled={adjusting}
            value={adjustNote}
            onChange={(event) => setAdjustNote(event.target.value)}
            className={inputClass}
            placeholder="Prize redemption"
          />
        </label>
        <button type="submit" disabled={adjusting} className={`${btnPrimary} mt-4`}>
          {adjusting ? 'Saving…' : 'Post to ledger'}
        </button>
      </form>

      <div className={sectionCard}>
        <h3 className="text-base font-semibold text-slate-900">Recent ledger</h3>
        {ledgerLoading ? (
          <p className={`mt-3 ${textSubtle}`}>Loading…</p>
        ) : ledger.length === 0 ? (
          <p className={`mt-3 ${textMuted}`}>No ledger entries yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-cream-200">
            {ledger.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {formatBucksReason(entry.reason)}
                  </p>
                  <p className={`text-sm ${textMuted}`}>
                    {formatDateTime(entry.created_at)}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-mono font-semibold ${
                    entry.amount > 0 ? 'text-emerald-700' : 'text-crimson-700'
                  }`}
                >
                  {formatBucksAmount(entry.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  ) : (
    <div className={consolePanelPlaceholder}>
      Select a boy to view his ledger and post adjustments.
    </div>
  )

  const settingsCard = settingsForm && (
    <form
      onSubmit={(event) => void handleSaveSettings(event)}
      className={`${sectionCard} space-y-4`}
    >
      <div>
        <h3 className="text-base font-semibold text-slate-900">Earn rates</h3>
        <p className={`mt-1 text-sm ${textMuted}`}>
          Applied by the database when new check-ins, reading logs, and quizzes
          are saved.
        </p>
      </div>
      {(
        [
          ['points_per_check_in', 'Points per check-in'],
          ['points_per_reading_minute', 'Points per reading minute'],
          ['points_per_quiz_attempt', 'Points per quiz attempt'],
          ['points_quiz_perfect_bonus', 'Perfect quiz bonus'],
          ['points_per_participation', 'Points per participation'],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="block">
          <span className={labelClass}>{label}</span>
          <input
            type="number"
            min={0}
            required
            disabled={savingSettings}
            value={settingsForm[key]}
            onChange={(event) =>
              setSettingsForm((current) =>
                current
                  ? {
                      ...current,
                      [key]: Number.parseInt(event.target.value, 10) || 0,
                    }
                  : current,
              )
            }
            className={inputClass}
          />
        </label>
      ))}
      <button type="submit" disabled={savingSettings} className={btnPrimary}>
        {savingSettings ? 'Saving…' : 'Save rates'}
      </button>
    </form>
  )

  if (isDesktopViewport) {
    return (
      <div className="space-y-6">
        <ConsolePageLayout header={header} list={list} panel={panel} />
        {settingsCard}
      </div>
    )
  }

  return (
    <section className="space-y-6">
      {header}
      {list}
      {selected && panel}
      {settingsCard}
    </section>
  )
}
