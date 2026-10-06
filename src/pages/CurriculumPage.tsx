import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrandedEmptyState } from '../components/brand/BrandedStates'
import ConfirmPanel from '../components/ui/ConfirmPanel'
import ConsolePageLayout from '../components/ui/ConsolePageLayout'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { useConsoleSelection } from '../hooks/useConsoleSelection'
import { useInputMode } from '../hooks/useInputMode'
import { isStaffAdmin } from '../lib/auth'
import { CURRICULUM_UNIT_LIST, QUIZ_BY_UNIT } from '../lib/curriculumColumns'
import {
  buildKioskWinnerBySessionId,
  deleteCurriculumUnit,
  formatCurriculumUnitSessionLabel,
  summarizeText,
  type CurriculumUnitListRow,
} from '../lib/curriculum'
import { formatDateTime, formatSessionLabel } from '../lib/dates'
import { isTrueFalseFormat, normalizeQuizFormat } from '../lib/quizFormat'
import { sessionSupportsReading } from '../lib/sessions'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  alertSuccess,
  btnDanger,
  btnPrimary,
  consoleListButton,
  consoleListButtonActive,
  consolePanelPlaceholder,
  headingPage,
  inputClass,
  labelClass,
  listCard,
  listRowLink,
  proseLight,
  sectionCard,
  textMuted,
  textSubtle,
} from '../ui/classes'

type QuizStatus = {
  format: string
  questionCount: number
}

function formatQuizStatusLabel(status: QuizStatus | undefined): string {
  if (!status) {
    return 'No quiz yet'
  }

  const format = isTrueFalseFormat(normalizeQuizFormat(status.format))
    ? 'True/False'
    : 'Multiple choice'
  const count = status.questionCount
  const countLabel = `${count} question${count === 1 ? '' : 's'}`
  return `${countLabel} · ${format}`
}

function matchesUnitSearch(
  unit: CurriculumUnitListRow,
  query: string,
  sessionLabel: string | null,
): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  return (
    unit.title.toLowerCase().includes(normalized) ||
    (unit.description ?? '').toLowerCase().includes(normalized) ||
    (unit.reading_assignment ?? '').toLowerCase().includes(normalized) ||
    (sessionLabel ?? '').toLowerCase().includes(normalized)
  )
}

function CurriculumDetailPanel({
  unit,
  sessionLabel,
  quizStatus,
  kioskBadge,
  canEdit,
  deleting,
  onRequestDelete,
}: {
  unit: CurriculumUnitListRow
  sessionLabel: string | null
  quizStatus: QuizStatus | undefined
  kioskBadge: string | null
  canEdit: boolean
  deleting: boolean
  onRequestDelete: () => void
}) {
  return (
    <div className={`${sectionCard} space-y-5`}>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{unit.title}</h2>
        {unit.created_at && (
          <p className={`mt-1 text-sm ${textMuted}`}>
            Created {formatDateTime(unit.created_at)}
          </p>
        )}
        {sessionLabel && (
          <p className="mt-2 text-sm font-medium text-crimson-600">
            Session: {sessionLabel}
          </p>
        )}
        <p className={`mt-2 text-sm ${textSubtle}`}>
          {formatQuizStatusLabel(quizStatus)}
        </p>
        {kioskBadge && (
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-crimson-700">
            {kioskBadge}
          </p>
        )}
      </div>

      {unit.description && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Description
          </p>
          <p className={`${proseLight} mt-2 text-sm text-slate-700`}>
            {unit.description}
          </p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Reading assignment
        </p>
        <p className={`${proseLight} mt-2 text-sm text-slate-700`}>
          {unit.reading_assignment ?? 'No reading assignment yet.'}
        </p>
      </div>

      {canEdit && (
        <div className="space-y-3">
          <Link to={`/curriculum/${unit.id}`} className={`${btnPrimary} w-full`}>
            Edit unit & quiz
          </Link>
          <button
            type="button"
            disabled={deleting}
            onClick={onRequestDelete}
            className={`${btnDanger} w-full`}
          >
            {deleting ? 'Deleting…' : 'Delete unit'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function CurriculumPage() {
  const { profile } = useAuth()
  const { sessions } = useSyncStatus()
  const { isDesktopViewport } = useInputMode()
  const isAdmin = isStaffAdmin(profile)
  const [searchParams, setSearchParams] = useSearchParams()
  const [units, setUnits] = useState<CurriculumUnitListRow[]>([])
  const [quizStatusByUnitId, setQuizStatusByUnitId] = useState<
    Map<string, QuizStatus>
  >(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sessionFilter, setSessionFilter] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CurriculumUnitListRow | null>(
    null,
  )
  const [savedBanner, setSavedBanner] = useState<string | null>(null)

  const readingSessions = useMemo(
    () => sessions.filter(sessionSupportsReading),
    [sessions],
  )

  const kioskWinners = useMemo(
    () => buildKioskWinnerBySessionId(units),
    [units],
  )

  useEffect(() => {
    const saved = searchParams.get('saved')
    if (!saved) {
      return
    }
    setSavedBanner(saved)
    const next = new URLSearchParams(searchParams)
    next.delete('saved')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const loadUnits = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('curriculum_units')
      .select(CURRICULUM_UNIT_LIST)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setUnits([])
      setQuizStatusByUnitId(new Map())
      setLoading(false)
      return
    }

    const rows = data ?? []
    setUnits(rows)

    if (rows.length === 0) {
      setQuizStatusByUnitId(new Map())
      setLoading(false)
      return
    }

    const unitIds = rows.map((row) => row.id)
    const { data: quizzes, error: quizError } = await supabase
      .from('quizzes')
      .select(`${QUIZ_BY_UNIT}, quiz_questions(count)`)
      .in('unit_id', unitIds)

    if (quizError) {
      setQuizStatusByUnitId(new Map())
      setLoading(false)
      return
    }

    const statusMap = new Map<string, QuizStatus>()
    for (const quiz of quizzes ?? []) {
      const countRaw = quiz.quiz_questions as
        | { count: number }[]
        | null
        | undefined
      const questionCount = Array.isArray(countRaw)
        ? Number(countRaw[0]?.count ?? 0)
        : 0
      statusMap.set(quiz.unit_id, {
        format: quiz.format,
        questionCount,
      })
    }
    setQuizStatusByUnitId(statusMap)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadUnits()
  }, [loadUnits])

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      if (sessionFilter === '__none__') {
        if (unit.session_id) return false
      } else if (sessionFilter && unit.session_id !== sessionFilter) {
        return false
      }

      const sessionLabel = formatCurriculumUnitSessionLabel(
        unit.session_id,
        sessions,
      )
      return matchesUnitSearch(unit, search, sessionLabel)
    })
  }, [units, search, sessionFilter, sessions])

  const getUnitId = useCallback((unit: CurriculumUnitListRow) => unit.id, [])

  const { selected, setSelectedId } = useConsoleSelection(
    filteredUnits,
    getUnitId,
    isDesktopViewport,
  )

  function kioskBadgeFor(unit: CurriculumUnitListRow): string | null {
    if (!unit.session_id) {
      return null
    }
    const winnerId = kioskWinners.get(unit.session_id)
    if (!winnerId) {
      return null
    }
    if (winnerId === unit.id) {
      return 'Used on kiosk for this session'
    }
    return 'Not used — newer unit linked'
  }

  async function handleDelete(unit: CurriculumUnitListRow) {
    setDeletingId(unit.id)
    setError(null)
    setPendingDelete(null)

    try {
      await deleteCurriculumUnit(unit.id)
      setUnits((current) => current.filter((row) => row.id !== unit.id))
      if (selected?.id === unit.id) {
        setSelectedId(null)
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete this unit.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  const selectedSessionLabel = selected
    ? formatCurriculumUnitSessionLabel(selected.session_id, sessions)
    : null

  const countLabel = loading
    ? 'Loading units…'
    : `${filteredUnits.length} unit${filteredUnits.length === 1 ? '' : 's'}`

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className={headingPage}>Curriculum</h1>
        <p className={`mt-1 ${textSubtle}`}>{countLabel}</p>
        <p className={`mt-1 text-sm ${textMuted}`}>
          Author reading assignments and quizzes (multiple choice or true/false).
        </p>
      </div>
      {isAdmin && (
        <Link to="/curriculum/new" className={btnPrimary}>
          New unit
        </Link>
      )}
    </div>
  )

  const filters = (
    <div className="space-y-4">
      <label className="block">
        <span className={labelClass}>Search units</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Title, description, reading, or session"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className={labelClass}>Filter by session</span>
        <select
          value={sessionFilter}
          onChange={(event) => setSessionFilter(event.target.value)}
          className={inputClass}
        >
          <option value="">Any session</option>
          <option value="__none__">No session</option>
          {readingSessions.map((session) => (
            <option key={session.id} value={session.id}>
              {formatSessionLabel(session.title, session.session_date)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )

  const emptyMessage = search || sessionFilter
    ? 'No units match your filters.'
    : isAdmin
      ? 'No curriculum units yet. Create one to attach reading and a quiz.'
      : 'No curriculum units yet.'

  const confirmPanel = pendingDelete && (
    <ConfirmPanel
      title="Delete curriculum unit?"
      confirmLabel="Delete unit"
      tone="red"
      loading={deletingId === pendingDelete.id}
      onConfirm={() => void handleDelete(pendingDelete)}
      onCancel={() => setPendingDelete(null)}
    >
      Permanently delete <strong>{pendingDelete.title}</strong>? This removes the
      unit, its quiz, and quiz questions. Boys&apos; past quiz scores for this unit
      will also be removed.
    </ConfirmPanel>
  )

  const successBanner = savedBanner && (
    <div className={alertSuccess}>
      <p className="text-sm font-medium text-emerald-900">
        Saved “{savedBanner}”.
      </p>
      <button
        type="button"
        className="mt-2 text-sm font-semibold text-emerald-800 underline"
        onClick={() => setSavedBanner(null)}
      >
        Dismiss
      </button>
    </div>
  )

  function renderUnitButton(unit: CurriculumUnitListRow, active: boolean) {
    const sessionLabel = formatCurriculumUnitSessionLabel(
      unit.session_id,
      sessions,
    )
    const badge = kioskBadgeFor(unit)
    const quizLabel = formatQuizStatusLabel(quizStatusByUnitId.get(unit.id))

    return (
      <button
        type="button"
        onClick={() => setSelectedId(unit.id)}
        className={active ? consoleListButtonActive : consoleListButton}
      >
        <span className="min-w-0 flex-1 text-left">
          <span className="block font-semibold text-slate-900">{unit.title}</span>
          <span className={`mt-0.5 block text-sm ${textMuted}`}>
            {summarizeText(unit.reading_assignment, 72)}
          </span>
          <span className={`mt-0.5 block text-sm ${textSubtle}`}>{quizLabel}</span>
          {sessionLabel && (
            <span className="mt-1 block text-xs font-medium text-crimson-600">
              {sessionLabel}
            </span>
          )}
          {badge && (
            <span className="mt-1 block text-xs font-semibold text-crimson-700">
              {badge}
            </span>
          )}
        </span>
      </button>
    )
  }

  function renderUnitLink(unit: CurriculumUnitListRow) {
    const sessionLabel = formatCurriculumUnitSessionLabel(
      unit.session_id,
      sessions,
    )
    const badge = kioskBadgeFor(unit)
    const quizLabel = formatQuizStatusLabel(quizStatusByUnitId.get(unit.id))

    const body = (
      <>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <span className="text-lg font-semibold text-slate-900">
            {unit.title}
          </span>
          {unit.created_at && (
            <span className={`shrink-0 text-sm ${textMuted}`}>
              {formatDateTime(unit.created_at)}
            </span>
          )}
        </div>
        <p className={`text-sm ${textMuted}`}>
          {summarizeText(unit.description)}
        </p>
        <p className={`text-sm ${textMuted}`}>
          Reading: {summarizeText(unit.reading_assignment)}
        </p>
        <p className={`text-sm ${textSubtle}`}>{quizLabel}</p>
        {sessionLabel && (
          <p className="text-sm font-medium text-crimson-600">
            Session: {sessionLabel}
          </p>
        )}
        {badge && (
          <p className="text-xs font-semibold text-crimson-700">{badge}</p>
        )}
      </>
    )

    if (isAdmin) {
      return (
        <Link to={`/curriculum/${unit.id}`} className={listRowLink}>
          {body}
        </Link>
      )
    }

    return <div className={`${listRowLink} cursor-default`}>{body}</div>
  }

  if (isDesktopViewport) {
    return (
      <ConsolePageLayout
        header={
          <>
            {header}
            {successBanner}
            {confirmPanel}
            {error && <p className={alertErrorInline}>{error}</p>}
          </>
        }
        list={
          <>
            {filters}
            {!loading && !error && filteredUnits.length === 0 ? (
              <BrandedEmptyState>{emptyMessage}</BrandedEmptyState>
            ) : (
              <ul className={listCard}>
                {filteredUnits.map((unit) => (
                  <li key={unit.id}>
                    {renderUnitButton(unit, selected?.id === unit.id)}
                  </li>
                ))}
              </ul>
            )}
          </>
        }
        panel={
          selected ? (
            <CurriculumDetailPanel
              unit={selected}
              sessionLabel={selectedSessionLabel}
              quizStatus={quizStatusByUnitId.get(selected.id)}
              kioskBadge={kioskBadgeFor(selected)}
              canEdit={isAdmin}
              deleting={deletingId === selected.id}
              onRequestDelete={() => setPendingDelete(selected)}
            />
          ) : (
            <div className={consolePanelPlaceholder}>
              {loading
                ? 'Loading units…'
                : filteredUnits.length === 0
                  ? emptyMessage
                  : 'Select a unit from the list.'}
            </div>
          )
        }
      />
    )
  }

  return (
    <section className="space-y-6">
      {header}
      {successBanner}
      {confirmPanel}
      {filters}
      {error && <p className={alertErrorInline}>{error}</p>}
      {!loading && !error && filteredUnits.length === 0 && (
        <BrandedEmptyState>{emptyMessage}</BrandedEmptyState>
      )}
      <ul className={listCard}>
        {filteredUnits.map((unit) => (
          <li key={unit.id}>{renderUnitLink(unit)}</li>
        ))}
      </ul>
    </section>
  )
}
