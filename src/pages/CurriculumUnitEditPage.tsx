import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminAccessNotice from '../components/AdminAccessNotice'
import ConfirmPanel from '../components/ui/ConfirmPanel'
import QuizEditor from '../components/curriculum/QuizEditor'
import QuizEditorTrueFalse from '../components/curriculum/QuizEditorTrueFalse'
import QuizPreview from '../components/curriculum/QuizPreview'
import { useAuth } from '../contexts/AuthContext'
import { useKioskMode } from '../contexts/KioskModeContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { useInputMode } from '../hooks/useInputMode'
import { isStaffAdmin } from '../lib/auth'
import { fetchAiSettings } from '../lib/aiSettings'
import { isFeatureEnabled } from '../lib/features'
import {
  CURRICULUM_UNIT_DETAIL,
  CURRICULUM_UNIT_LIST,
  QUIZ_BY_UNIT,
  QUIZ_QUESTION_LIST,
} from '../lib/curriculumColumns'
import {
  curriculumUnitToFormValues,
  deleteCurriculumUnit,
  findConflictingUnitForSession,
  formValuesToCurriculumUnitUpdate,
  type CurriculumUnit,
  type CurriculumUnitFormValues,
  type CurriculumUnitListRow,
} from '../lib/curriculum'
import { formatSessionLabel } from '../lib/dates'
import { isTrueFalseFormat } from '../lib/quizFormat'
import {
  convertQuizEditorFormat,
  emptyQuizEditorFormValues,
  quizEditorHasConvertibleContent,
  quizToEditorFormValues,
  saveQuizEditor,
  type Quiz,
  type QuizEditorFormValues,
  type QuizFormat,
  type QuizQuestion,
} from '../lib/quizzes'
import { draftQuestionsToFormValues, draftQuizQuestions } from '../lib/quizDraft'
import { sessionSupportsReading } from '../lib/sessions'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  btnDanger,
  btnPrimary,
  btnSecondary,
  headingPage,
  inputClass,
  labelClass,
  linkBack,
  sectionCard,
  textareaClass,
  textMuted,
  textSubtle,
} from '../ui/classes'

function snapshotKey(
  unitValues: CurriculumUnitFormValues,
  quizValues: QuizEditorFormValues,
): string {
  return JSON.stringify({ unitValues, quizValues })
}

export default function CurriculumUnitEditPage() {
  const { profile } = useAuth()
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const { sessions } = useSyncStatus()
  const { requestEnterKioskPreview } = useKioskMode()
  const { isDesktopViewport } = useInputMode()
  const isAdmin = isStaffAdmin(profile)
  const [unit, setUnit] = useState<CurriculumUnit | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [peerUnits, setPeerUnits] = useState<CurriculumUnitListRow[]>([])
  const [unitValues, setUnitValues] = useState<CurriculumUnitFormValues | null>(
    null,
  )
  const [quizValues, setQuizValues] = useState<QuizEditorFormValues | null>(
    null,
  )
  const [baselineKey, setBaselineKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [quizDraftingEnabled, setQuizDraftingEnabled] = useState(false)
  const [draftQuestionCount, setDraftQuestionCount] = useState(5)
  const [draftAgeRange, setDraftAgeRange] = useState('9–14')
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [draftReplaceConfirmOpen, setDraftReplaceConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pendingFormat, setPendingFormat] = useState<QuizFormat | null>(null)
  const [clearQuizConfirmOpen, setClearQuizConfirmOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [pendingLeaveTo, setPendingLeaveTo] = useState<string | null>(null)
  const [allowLeave, setAllowLeave] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(true)

  const readingSessions = useMemo(
    () => sessions.filter(sessionSupportsReading),
    [sessions],
  )

  const isDirty =
    Boolean(unitValues && quizValues && baselineKey) &&
    snapshotKey(unitValues!, quizValues!) !== baselineKey

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }

    if (!unitId) {
      setError('Unit not found.')
      setLoading(false)
      return
    }

    let mounted = true

    async function loadUnit() {
      if (!unitId) return

      setLoading(true)
      setError(null)

      const [unitResult, peersResult] = await Promise.all([
        supabase
          .from('curriculum_units')
          .select(CURRICULUM_UNIT_DETAIL)
          .eq('id', unitId)
          .single(),
        supabase.from('curriculum_units').select(CURRICULUM_UNIT_LIST),
      ])

      if (!mounted) return

      if (unitResult.error) {
        setError(unitResult.error.message)
        setUnit(null)
        setQuiz(null)
        setQuestions([])
        setUnitValues(null)
        setQuizValues(null)
        setLoading(false)
        return
      }

      setPeerUnits(peersResult.data ?? [])

      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select(QUIZ_BY_UNIT)
        .eq('unit_id', unitId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!mounted) return

      if (quizError) {
        setError(quizError.message)
        setUnit(null)
        setQuiz(null)
        setQuestions([])
        setUnitValues(null)
        setQuizValues(null)
        setLoading(false)
        return
      }

      let questionRows: QuizQuestion[] = []
      if (quizData) {
        const { data: questionData, error: questionError } = await supabase
          .from('quiz_questions')
          .select(QUIZ_QUESTION_LIST)
          .eq('quiz_id', quizData.id)
          .order('position', { ascending: true })

        if (!mounted) return

        if (questionError) {
          setError(questionError.message)
          setUnit(null)
          setQuiz(null)
          setQuestions([])
          setUnitValues(null)
          setQuizValues(null)
          setLoading(false)
          return
        }

        questionRows = questionData ?? []
      }

      const nextUnit = unitResult.data
      const nextUnitValues = curriculumUnitToFormValues(nextUnit)
      const nextQuizValues = quizData
        ? quizToEditorFormValues(quizData, questionRows)
        : emptyQuizEditorFormValues(`${nextUnit.title} quiz`)

      setUnit(nextUnit)
      setQuiz(quizData)
      setQuestions(questionRows)
      setUnitValues(nextUnitValues)
      setQuizValues(nextQuizValues)
      setBaselineKey(snapshotKey(nextUnitValues, nextQuizValues))
      setDetailsOpen(questionRows.length === 0)
      setLoading(false)
    }

    void loadUnit()

    return () => {
      mounted = false
    }
  }, [unitId, isAdmin])

  useEffect(() => {
    if (!isAdmin || !isFeatureEnabled('ai')) {
      return
    }

    let mounted = true

    async function loadAiSettings() {
      try {
        const settings = await fetchAiSettings()
        if (mounted) {
          setQuizDraftingEnabled(settings.quiz_drafting)
        }
      } catch {
        if (mounted) {
          setQuizDraftingEnabled(false)
        }
      }
    }

    void loadAiSettings()

    return () => {
      mounted = false
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isDirty || allowLeave) {
      return
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty, allowLeave])

  const aiDraftingAvailable =
    isFeatureEnabled('ai') &&
    quizDraftingEnabled &&
    !isTrueFalseFormat(quizValues?.format ?? 'multiple_choice')

  const attachedSession = unitValues?.session_id
    ? sessions.find((session) => session.id === unitValues.session_id)
    : undefined
  const sessionMissing =
    Boolean(unitValues?.session_id) && !attachedSession
  const sessionNotReading =
    Boolean(attachedSession) && !sessionSupportsReading(attachedSession!)
  const sessionPickerSessions = useMemo(() => {
    const base = [...readingSessions]
    if (
      attachedSession &&
      !base.some((session) => session.id === attachedSession.id)
    ) {
      base.unshift(attachedSession)
    }
    return base
  }, [readingSessions, attachedSession])

  const sessionConflict =
    unitValues?.session_id && unitId
      ? findConflictingUnitForSession(
          unitValues.session_id,
          unitId,
          peerUnits,
        )
      : null

  async function runQuizDraft(replaceExisting: boolean) {
    if (!unitValues || !quizValues) {
      return
    }

    const readingAssignment = unitValues.reading_assignment.trim()
    if (!readingAssignment) {
      setDraftError('Add a reading assignment before drafting questions.')
      return
    }

    setDrafting(true)
    setDraftError(null)

    try {
      const drafted = await draftQuizQuestions({
        unitTitle: unitValues.title.trim() || 'Unit quiz',
        readingAssignment,
        questionCount: draftQuestionCount,
        ageRange: draftAgeRange.trim() || '9–14',
      })

      const draftedQuestions = draftQuestionsToFormValues(drafted)
      setQuizValues((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          questions: replaceExisting
            ? draftedQuestions
            : [...current.questions, ...draftedQuestions],
        }
      })
    } catch (draftFailure) {
      setDraftError(
        draftFailure instanceof Error
          ? draftFailure.message
          : 'Failed to draft quiz questions.',
      )
    } finally {
      setDrafting(false)
      setDraftReplaceConfirmOpen(false)
    }
  }

  function handleDraftQuestions() {
    if (!quizValues) {
      return
    }

    if (quizValues.questions.length > 0) {
      setDraftReplaceConfirmOpen(true)
      return
    }

    void runQuizDraft(true)
  }

  function requestLeave(to: string) {
    if (!isDirty || allowLeave) {
      navigate(to)
      return
    }
    setPendingLeaveTo(to)
    setLeaveConfirmOpen(true)
  }

  async function persistSave() {
    if (!unit || !unitValues || !quizValues) {
      return
    }

    setSubmitting(true)
    setSaveError(null)

    try {
      const { error: unitError } = await supabase
        .from('curriculum_units')
        .update(formValuesToCurriculumUnitUpdate(unitValues))
        .eq('id', unit.id)

      if (unitError) {
        throw new Error(unitError.message)
      }

      await saveQuizEditor(
        unit.id,
        quiz?.id ?? null,
        questions.map((question) => question.id),
        quizValues,
      )

      setAllowLeave(true)
      setBaselineKey(snapshotKey(unitValues, quizValues))
      navigate(
        `/curriculum?saved=${encodeURIComponent(unitValues.title.trim() || unit.title)}`,
      )
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong. Please try again.'
      setSaveError(message)
    } finally {
      setSubmitting(false)
      setClearQuizConfirmOpen(false)
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!unit || !unitValues || !quizValues) {
      return
    }

    const clearingExistingQuiz =
      quizValues.questions.length === 0 && Boolean(quiz?.id)

    if (clearingExistingQuiz) {
      setClearQuizConfirmOpen(true)
      return
    }

    await persistSave()
  }

  function requestFormatChange(nextFormat: QuizFormat) {
    if (!quizValues || quizValues.format === nextFormat) {
      return
    }

    if (!quizEditorHasConvertibleContent(quizValues)) {
      setQuizValues(convertQuizEditorFormat(quizValues, nextFormat))
      return
    }

    setPendingFormat(nextFormat)
  }

  async function handleDeleteUnit() {
    if (!unitId || !unit) {
      return
    }

    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteCurriculumUnit(unitId)
      setAllowLeave(true)
      navigate('/curriculum')
    } catch (deleteFailure) {
      setDeleteError(
        deleteFailure instanceof Error
          ? deleteFailure.message
          : 'Unable to delete this unit.',
      )
      setDeleteConfirmOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  if (!isAdmin) {
    return (
      <AdminAccessNotice
        title="Edit curriculum unit"
        actionLabel="create or edit curriculum units"
        backTo="/curriculum"
        backLabel="Back to curriculum"
      />
    )
  }

  if (loading) {
    return (
      <section>
        <p className={textSubtle}>Loading unit…</p>
      </section>
    )
  }

  if (error || !unit || !unitValues || !quizValues) {
    return (
      <section className="space-y-4">
        <p className={alertErrorInline}>{error ?? 'Unit not found.'}</p>
        <Link to="/curriculum" className={btnSecondary}>
          Back to curriculum
        </Link>
      </section>
    )
  }

  const hasQuestions = quizValues.questions.length > 0

  return (
    <section className="relative mx-auto max-w-3xl space-y-6 pb-28">
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => requestLeave('/curriculum')}
          className={linkBack}
        >
          ← Back to curriculum
        </button>
        <div>
          <h1 className={headingPage}>{unit.title}</h1>
          <p className={`mt-1 ${textSubtle}`}>
            Update the unit, then author or edit its quiz for the kiosk.
          </p>
          {isDirty && (
            <p className={`mt-2 text-sm font-medium text-amber-800`}>
              Unsaved changes
            </p>
          )}
        </div>
      </div>

      <form
        id="curriculum-unit-edit-form"
        onSubmit={(event) => void handleSave(event)}
        className="space-y-6"
      >
        <div className={`${sectionCard} space-y-4`}>
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-slate-900">Unit details</h2>
            <span className={`text-sm ${textMuted}`}>
              {detailsOpen ? 'Hide' : 'Show'}
            </span>
          </button>

          {detailsOpen && (
            <div className="space-y-5">
              <label className="block">
                <span className={labelClass}>Title</span>
                <input
                  type="text"
                  required
                  disabled={submitting}
                  value={unitValues.title}
                  onChange={(event) =>
                    setUnitValues((current) =>
                      current
                        ? { ...current, title: event.target.value }
                        : current,
                    )
                  }
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Description</span>
                <textarea
                  disabled={submitting}
                  value={unitValues.description}
                  onChange={(event) =>
                    setUnitValues((current) =>
                      current
                        ? { ...current, description: event.target.value }
                        : current,
                    )
                  }
                  className={`min-h-28 ${textareaClass}`}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Reading assignment</span>
                <textarea
                  disabled={submitting}
                  value={unitValues.reading_assignment}
                  onChange={(event) =>
                    setUnitValues((current) =>
                      current
                        ? {
                            ...current,
                            reading_assignment: event.target.value,
                          }
                        : current,
                    )
                  }
                  placeholder="Pages, chapters, or links boys should read"
                  className={`min-h-28 ${textareaClass}`}
                />
                <p className={`mt-2 text-sm ${textMuted}`}>
                  Staff reference for now — boys see the unit title on the reading
                  kiosk; assignment text isn’t shown on-device yet.
                </p>
              </label>

              <label className="block">
                <span className={labelClass}>Session (optional)</span>
                <select
                  disabled={submitting || sessionPickerSessions.length === 0}
                  value={unitValues.session_id}
                  onChange={(event) =>
                    setUnitValues((current) =>
                      current
                        ? { ...current, session_id: event.target.value }
                        : current,
                    )
                  }
                  className={inputClass}
                >
                  <option value="">No session attached</option>
                  {sessionPickerSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {formatSessionLabel(session.title, session.session_date)}
                      {!sessionSupportsReading(session)
                        ? ' (not reading-capable)'
                        : ''}
                    </option>
                  ))}
                </select>
                {readingSessions.length === 0 && (
                  <p className={`mt-2 text-sm ${textMuted}`}>
                    Sync a reading-capable session first to attach this unit.
                  </p>
                )}
                {(sessionMissing || sessionNotReading) && (
                  <p className="mt-2 text-sm text-amber-800">
                    This session isn’t reading-capable — reattach or clear.
                  </p>
                )}
                {sessionConflict && (
                  <p className="mt-2 text-sm text-amber-800">
                    “{sessionConflict.title}” is also linked to this session. The
                    newest unit is used on the kiosk.
                  </p>
                )}
              </label>
            </div>
          )}
        </div>

        {aiDraftingAvailable && (
          <div className="space-y-4 rounded-[20px] border border-cream-200 bg-cream-50/80 p-4 shadow-card sm:p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Draft questions with AI
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Generates editable multiple-choice drafts from the reading
                assignment. Review every question before saving — nothing is
                published until you click Save.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Question count</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  disabled={drafting || submitting}
                  value={draftQuestionCount}
                  onChange={(event) =>
                    setDraftQuestionCount(
                      Math.min(10, Math.max(1, Number(event.target.value) || 5)),
                    )
                  }
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Age range</span>
                <input
                  type="text"
                  disabled={drafting || submitting}
                  value={draftAgeRange}
                  onChange={(event) => setDraftAgeRange(event.target.value)}
                  placeholder="e.g. 9–14"
                  className={inputClass}
                />
              </label>
            </div>

            {draftError && <p className={alertErrorInline}>{draftError}</p>}

            <button
              type="button"
              disabled={drafting || submitting}
              onClick={() => handleDraftQuestions()}
              className={btnSecondary}
            >
              {drafting ? 'Drafting…' : 'Draft questions with AI'}
            </button>
          </div>
        )}

        <div className={`${sectionCard} space-y-3`}>
          <label className="block">
            <span className={labelClass}>Quiz format</span>
            <select
              disabled={submitting}
              value={quizValues.format}
              onChange={(event) =>
                requestFormatChange(event.target.value as QuizFormat)
              }
              className={inputClass}
            >
              <option value="multiple_choice">Multiple choice</option>
              <option value="true_false">True / False (swipe)</option>
            </select>
          </label>
          <p className={`text-sm ${textMuted}`}>
            Switching format clears answer options and resets correct answers.
          </p>
        </div>

        {pendingFormat && (
          <ConfirmPanel
            title="Switch quiz format?"
            confirmLabel="Switch format"
            loading={false}
            onConfirm={() => {
              setQuizValues((current) =>
                current && pendingFormat
                  ? convertQuizEditorFormat(current, pendingFormat)
                  : current,
              )
              setPendingFormat(null)
            }}
            onCancel={() => setPendingFormat(null)}
          >
            Switching format clears answer options and resets correct answers.
            Continue?
          </ConfirmPanel>
        )}

        {isTrueFalseFormat(quizValues.format) ? (
          <QuizEditorTrueFalse
            values={quizValues}
            onChange={setQuizValues}
            disabled={submitting}
          />
        ) : (
          <QuizEditor
            values={quizValues}
            onChange={setQuizValues}
            disabled={submitting}
          />
        )}

        <QuizPreview values={quizValues} />

        {hasQuestions && (
          <div className={`${sectionCard} space-y-3`}>
            <p className={`text-sm ${textSubtle}`}>
              Preview the boy-facing quiz UI before session night.
            </p>
            <button
              type="button"
              onClick={() => requestEnterKioskPreview('/kiosk/preview/quiz')}
              className={btnSecondary}
            >
              Preview quiz UI
              {!isDesktopViewport ? ' (best on a large screen)' : ''}
            </button>
          </div>
        )}

        {saveError && <p className={alertErrorInline}>{saveError}</p>}
      </form>

      {unitValues.session_id && (
        <div className={`${sectionCard} space-y-3`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Session night
          </h2>
          <p className={`text-sm ${textSubtle}`}>
            Boys take this quiz on their phone at{' '}
            <span className="font-medium text-slate-900">/go</span> (scan their
            lanyard). Tablets stay on reading minutes and check-in so leaders can
            verify.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/check-in" className={`flex-1 ${btnSecondary}`}>
              Go to event
            </Link>
            <Link to="/go" className={`flex-1 ${btnPrimary}`}>
              Open phone quiz (/go)
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-cream-200 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          Danger zone
        </h2>
        <p className="text-sm text-ink-700">
          Deleting removes this unit, its quiz, and boys&apos; quiz scores tied to
          it. Reading logs keep their minutes but lose the unit link.
        </p>
        {deleteError && <p className={alertErrorInline}>{deleteError}</p>}
        {!deleteConfirmOpen ? (
          <button
            type="button"
            disabled={submitting || deleting}
            onClick={() => setDeleteConfirmOpen(true)}
            className={`${btnDanger} w-full sm:w-auto`}
          >
            Delete unit
          </button>
        ) : (
          <ConfirmPanel
            title="Delete curriculum unit?"
            confirmLabel="Delete unit"
            tone="red"
            loading={deleting}
            onConfirm={() => void handleDeleteUnit()}
            onCancel={() => setDeleteConfirmOpen(false)}
          >
            Permanently delete <strong>{unit.title}</strong>? This cannot be
            undone.
          </ConfirmPanel>
        )}
      </div>

      {clearQuizConfirmOpen && (
        <ConfirmPanel
          title="Remove this quiz from the unit?"
          confirmLabel="Remove quiz and save"
          tone="red"
          loading={submitting}
          onConfirm={() => void persistSave()}
          onCancel={() => setClearQuizConfirmOpen(false)}
        >
          Boys will not see quiz questions until you add new ones. Past attempts
          for this quiz are removed with the quiz.
        </ConfirmPanel>
      )}

      {draftReplaceConfirmOpen && (
        <ConfirmPanel
          title="Draft more questions?"
          confirmLabel="Replace existing"
          altConfirmLabel="Append to existing"
          loading={drafting}
          onConfirm={() => void runQuizDraft(true)}
          onAltConfirm={() => void runQuizDraft(false)}
          onCancel={() => setDraftReplaceConfirmOpen(false)}
        >
          Replace clears questions already in the editor. Append keeps them and
          adds the new drafts. Review before saving.
        </ConfirmPanel>
      )}

      {leaveConfirmOpen && (
        <ConfirmPanel
          title="Discard unsaved changes?"
          confirmLabel="Discard"
          tone="red"
          onConfirm={() => {
            setAllowLeave(true)
            setLeaveConfirmOpen(false)
            if (pendingLeaveTo) {
              navigate(pendingLeaveTo)
            }
          }}
          onCancel={() => {
            setLeaveConfirmOpen(false)
            setPendingLeaveTo(null)
          }}
        >
          You have unsaved unit or quiz edits. Leave without saving?
        </ConfirmPanel>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-white/95 px-4 py-3 backdrop-blur"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            form="curriculum-unit-edit-form"
            disabled={submitting}
            className={`flex-1 ${btnPrimary}`}
          >
            {submitting ? 'Saving…' : 'Save unit and quiz'}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => requestLeave('/curriculum')}
            className={`flex-1 ${btnSecondary}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  )
}
