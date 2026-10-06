import { useCallback, useEffect, useMemo, useState } from 'react'
import ManualCheckInSearch from '../../components/checkin/ManualCheckInSearch'
import ReadingBadge from '../../components/brand/ReadingBadge'
import KioskCameraAlert from '../../components/kiosk/KioskCameraAlert'
import KioskHelperScreen from '../../components/kiosk/KioskHelperScreen'
import KioskQrScanner from '../../components/kiosk/KioskQrScanner'
import QuizComplete from '../../components/kiosk/QuizComplete'
import KioskTrueFalseQuiz from '../../components/kiosk/KioskTrueFalseQuiz'
import QuizQuestionCard from '../../components/kiosk/QuizQuestionCard'
import QuizWrongFeedback from '../../components/kiosk/QuizWrongFeedback'
import RosterCacheGate from '../../components/RosterCacheGate'
import Button from '../../components/ui/Button'
import { useSyncStatus } from '../../contexts/SyncContext'
import { useCameraAvailability } from '../../hooks/useCameraAvailability'
import { useKioskParticipants } from '../../hooks/useKioskParticipants'
import { useKioskPreviewMode } from '../../hooks/useKioskPreviewMode'
import {
  isRosterNotCachedError,
  lookupParticipantByQrToken,
} from '../../lib/checkIn'
import { formatParticipantName } from '../../lib/format'
import type { Participant } from '../../lib/participants'
import { optionsFromJson } from '../../lib/quizzes'
import { isTrueFalseFormat } from '../../lib/quizFormat'
import {
  fetchQuizForSession,
  getQuizAttemptForSession,
  scoreQuizAnswers,
  recordQuizAnswer,
  submitQuizAttempt,
  type QuizAnswerMap,
  type QuizForSession,
} from '../../lib/quizAttempts'
import type { Tables } from '../../types/database'

type KioskQuizView =
  | { mode: 'loading' }
  | { mode: 'no_quiz' }
  | { mode: 'offline_unavailable' }
  | { mode: 'scanning' }
  | {
      mode: 'question'
      participant: Participant
      questionIndex: number
      answers: QuizAnswerMap
      showWrong: boolean
      /** The option just tapped, so the choice is visible before feedback. */
      choice: number | null
    }
  | {
      mode: 'complete'
      participant: Participant
      allCorrect: boolean
      correctCount: number
      totalCount: number
      pendingSync: boolean
    }
  | { mode: 'already_attempted'; participant: Participant }
  | { mode: 'helper'; title: string; message: string }

function ProgressDots({
  total,
  current,
}: {
  total: number
  current: number
}) {
  return (
    <div className="flex justify-center gap-2" aria-label={`Question ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={[
            'h-3 w-3 rounded-full',
            index <= current ? 'bg-crimson-600' : 'bg-cream-200',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

export default function KioskQuizPage() {
  const { selectedSessionId, connectionState, pendingCount } = useSyncStatus()
  const isPreview = useKioskPreviewMode()
  const [quizData, setQuizData] = useState<QuizForSession | null>(null)
  const [view, setView] = useState<KioskQuizView>({ mode: 'loading' })
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [scanKey, setScanKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const scannerEnabled = !isPreview
  const {
    cameraState,
    cameraUnavailable,
    cameraChecking,
    cameraMessage,
    retryCameraProbe,
  } = useCameraAvailability(scannerEnabled)
  const manualLookupEnabled =
    isPreview || cameraUnavailable || Boolean(scannerError)
  const { participants, loading: participantsLoading, error: participantsError } =
    useKioskParticipants(manualLookupEnabled && view.mode === 'scanning')

  const questions = quizData?.questions ?? []

  useEffect(() => {
    let mounted = true

    async function loadQuiz() {
      if (!selectedSessionId) {
        if (!mounted) return
        setView({ mode: 'no_quiz' })
        return
      }

      setView({ mode: 'loading' })

      try {
        const result = await fetchQuizForSession(selectedSessionId)
        if (!mounted) return

        if (result.status === 'offline_unavailable') {
          setQuizData(null)
          setView({ mode: 'offline_unavailable' })
          return
        }

        if (result.status === 'none') {
          setQuizData(null)
          setView({ mode: 'no_quiz' })
          return
        }

        setQuizData(result.data)
        setView({ mode: 'scanning' })
      } catch {
        if (!mounted) return
        setView({ mode: 'offline_unavailable' })
      }
    }

    void loadQuiz()

    return () => {
      mounted = false
    }
  }, [selectedSessionId])

  const resetToScanner = useCallback(() => {
    if (!quizData) {
      setView({ mode: 'offline_unavailable' })
      return
    }
    setView({ mode: 'scanning' })
    setScannerError(null)
    setSubmitting(false)
    setScanKey((key) => key + 1)
  }, [quizData])

  const beginQuizForParticipant = useCallback(
    async (participant: Participant) => {
      if (!quizData || !selectedSessionId) {
        setView({
          mode: 'helper',
          title: 'One moment',
          message: 'Ask a helper to pick the session first.',
        })
        return
      }

      try {
        const existing = await getQuizAttemptForSession({
          participantId: participant.id,
          quizId: quizData.quiz.id,
          sessionId: selectedSessionId,
        })

        if (existing) {
          setView({ mode: 'already_attempted', participant })
          return
        }

        setView({
          mode: 'question',
          participant,
          questionIndex: 0,
          answers: {},
          showWrong: false,
          choice: null,
        })
      } catch {
        setView({
          mode: 'helper',
          title: 'Ask a helper',
          message:
            "We're offline right now — ask a helper to check your badge, or try again soon.",
        })
      }
    },
    [quizData, selectedSessionId],
  )

  const handleScan = useCallback(
    async (qrToken: string) => {
      if (!selectedSessionId || !quizData) {
        setView({
          mode: 'helper',
          title: 'Ask a helper',
          message: 'Ask a volunteer to pick a session first.',
        })
        return
      }

      try {
        const participant = await lookupParticipantByQrToken(qrToken)

        if (!participant) {
          setView({
            mode: 'helper',
            title: 'Try again',
            message: 'Badge not recognized. Try scanning again or ask a helper.',
          })
          return
        }

        await beginQuizForParticipant(participant)
      } catch (error) {
        if (isRosterNotCachedError(error)) {
          setView({
            mode: 'helper',
            title: 'Ask a helper',
            message:
              "We're getting ready — ask a volunteer to refresh the roster, then try again.",
          })
          return
        }

        setView({
          mode: 'helper',
          title: 'Ask a helper',
          message:
            "We're offline right now — ask a helper to scan your badge, or try again soon.",
        })
      }
    },
    [beginQuizForParticipant, quizData, selectedSessionId],
  )

  const finishQuiz = useCallback(
    async (participant: Participant, answers: QuizAnswerMap) => {
      if (!quizData || !selectedSessionId) {
        return
      }

      const { score, total } = scoreQuizAnswers(questions, answers)
      const pendingSync =
        connectionState !== 'online' || pendingCount > 0

      setView({
        mode: 'complete',
        participant,
        allCorrect: score === total,
        correctCount: score,
        totalCount: total,
        pendingSync,
      })

      setSubmitting(true)

      try {
        await submitQuizAttempt({
          participantId: participant.id,
          quizId: quizData.quiz.id,
          sessionId: selectedSessionId,
          questions,
          answers,
        })
      } catch (error) {
        if (error instanceof Error && error.message === 'ALREADY_ATTEMPTED') {
          setView({ mode: 'already_attempted', participant })
          return
        }

        setView({
          mode: 'helper',
          title: 'Nice work!',
          message:
            "We saved your answers on this tablet. Ask a helper if your score doesn't show up on the roster later.",
        })
      } finally {
        setSubmitting(false)
      }
    },
    [connectionState, pendingCount, questions, quizData, selectedSessionId],
  )

  const handleAnswer = useCallback(
    (selectedIndex: number) => {
      if (view.mode !== 'question' || submitting) {
        return
      }

      const question = questions[view.questionIndex]
      if (!question) {
        return
      }

      if (selectedIndex !== question.correct_index) {
        setView({ ...view, showWrong: true, choice: selectedIndex })
        return
      }

      const nextAnswers = recordQuizAnswer(
        view.answers,
        question.id,
        selectedIndex,
      )

      if (view.questionIndex >= questions.length - 1) {
        void finishQuiz(view.participant, nextAnswers)
        return
      }

      setView({
        ...view,
        questionIndex: view.questionIndex + 1,
        answers: nextAnswers,
        showWrong: false,
        choice: null,
      })
    },
    [finishQuiz, questions, submitting, view],
  )

  const currentQuestion: Tables<'quiz_questions'> | undefined = useMemo(() => {
    if (view.mode !== 'question') {
      return undefined
    }
    return questions[view.questionIndex]
  }, [questions, view])

  useEffect(() => {
    if (view.mode === 'helper') {
      const timer = window.setTimeout(resetToScanner, 4000)
      return () => window.clearTimeout(timer)
    }
  }, [resetToScanner, view.mode])

  const handleCameraError = useCallback((message: string) => {
    setScannerError(message)
  }, [])

  const handleRetryCamera = useCallback(() => {
    setScannerError(null)
    retryCameraProbe()
    setScanKey((key) => key + 1)
  }, [retryCameraProbe])

  const scannerVisible =
    view.mode === 'scanning' &&
    scannerEnabled &&
    cameraState === 'available' &&
    !scannerError

  const idlePrompt = isPreview
    ? 'Find your name to start the quiz'
    : manualLookupEnabled
      ? 'Scan your badge or find your name'
      : 'Scan your badge to start the quiz'

  if (view.mode === 'loading') {
    return <p className="text-center text-xl text-slate-600">Loading quiz…</p>
  }

  if (view.mode === 'offline_unavailable') {
    return (
      <KioskHelperScreen
        title="We're offline right now"
        message="Ask a helper to connect Wi‑Fi and refresh the roster, then try again soon."
      />
    )
  }

  if (view.mode === 'no_quiz') {
    return (
      <KioskHelperScreen
        title="No quiz yet"
        message="There isn't a quiz for this session yet. Ask a volunteer."
      />
    )
  }

  if (view.mode === 'scanning') {
    return (
      <section className="space-y-6">
        <ReadingBadge variant="idle" idlePrompt={idlePrompt} />

        {manualLookupEnabled && (
          <ManualCheckInSearch
            participants={participants}
            disabled={participantsLoading || Boolean(participantsError)}
            autoFocus={isPreview || cameraUnavailable}
            title={isPreview ? 'Find your name' : 'Or find your name'}
            description={
              isPreview
                ? 'Type your name or badge number.'
                : 'Type your name if the camera is not working.'
            }
            onSelect={(participant) => void beginQuizForParticipant(participant)}
          />
        )}

        {participantsLoading && manualLookupEnabled && (
          <p className="text-center text-sm text-slate-600">Loading roster…</p>
        )}

        {participantsError && manualLookupEnabled && (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            {participantsError}
          </p>
        )}

        {scannerEnabled && (
          <RosterCacheGate>
            {cameraChecking && !manualLookupEnabled && (
              <p className="text-center text-lg text-slate-600">
                Checking camera…
              </p>
            )}

            {cameraUnavailable && !scannerError && cameraMessage && (
              <KioskCameraAlert message={cameraMessage} onRetry={handleRetryCamera} />
            )}

            {scannerVisible && (
              <KioskQrScanner
                resetKey={scanKey}
                onScan={(token) => void handleScan(token)}
                onCameraError={handleCameraError}
              />
            )}

            {scannerError && cameraState === 'available' && (
              <KioskCameraAlert
                message={scannerError}
                onRetry={handleRetryCamera}
              />
            )}
          </RosterCacheGate>
        )}
      </section>
    )
  }

  if (view.mode === 'already_attempted') {
    return (
      <div className="space-y-6 text-center">
        <p className="text-3xl font-bold text-crimson-700">
          You already did this quiz today!
        </p>
        <p className="text-xl text-slate-700">
          Nice work, {view.participant.first_name}!
        </p>
        <Button fullWidth onClick={resetToScanner}>
          Next
        </Button>
      </div>
    )
  }

  if (view.mode === 'complete') {
    return (
      <QuizComplete
        firstName={view.participant.first_name}
        allCorrect={view.allCorrect}
        correctCount={view.correctCount}
        totalCount={view.totalCount}
        pendingSync={view.pendingSync}
        onNext={resetToScanner}
      />
    )
  }

  if (view.mode === 'helper') {
    return (
      <KioskHelperScreen title={view.title} message={view.message} />
    )
  }

  if (view.mode === 'question' && currentQuestion && quizData) {
    if (isTrueFalseFormat(quizData.quiz.format)) {
      return (
        <KioskTrueFalseQuiz
          participant={view.participant}
          questions={questions}
          submitting={submitting}
          onComplete={(answers) => void finishQuiz(view.participant, answers)}
        />
      )
    }

    const options = optionsFromJson(currentQuestion.options)

    return (
      <section className="space-y-6">
        <ProgressDots total={questions.length} current={view.questionIndex} />
        <p className="text-center text-lg text-slate-600">
          {formatParticipantName(
            view.participant.first_name,
            view.participant.last_initial,
          )}
        </p>
        {view.showWrong && <QuizWrongFeedback />}
        <QuizQuestionCard
          prompt={currentQuestion.prompt}
          options={options}
          selectedIndex={view.choice}
          disabled={submitting}
          onSelect={handleAnswer}
        />
      </section>
    )
  }

  return null
}
