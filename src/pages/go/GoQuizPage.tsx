import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ReadingBadge from '../../components/brand/ReadingBadge'
import KioskHelperScreen from '../../components/kiosk/KioskHelperScreen'
import KioskTrueFalseQuiz from '../../components/kiosk/KioskTrueFalseQuiz'
import QuizComplete from '../../components/kiosk/QuizComplete'
import QuizQuestionCard from '../../components/kiosk/QuizQuestionCard'
import Button from '../../components/ui/Button'
import { formatParticipantName } from '../../lib/format'
import { confirmHaptic } from '../../lib/haptics'
import { primeSound } from '../../lib/sound'
import { fetchPortalBucksBalance } from '../../lib/bucks'
import type { Participant } from '../../lib/participants'
import {
  fetchParticipantPortalContext,
  fetchParticipantPortalQuestions,
  submitParticipantPortalQuiz,
  type ParticipantPortalContext,
  type ParticipantPortalQuestion,
} from '../../lib/participantPortal'
import {
  normalizeParticipantGoToken,
  participantGoProfileUrl,
  readParticipantGoToken,
  signOutParticipantGo,
  writeParticipantGoToken,
} from '../../lib/participantGoToken'
import { isTrueFalseFormat } from '../../lib/quizFormat'
import { recordQuizAnswer, type QuizAnswerMap } from '../../lib/quizAttempts'
import { optionsFromJson } from '../../lib/quizzes'
import type { Tables, Json } from '../../types/database'

type GoQuizView =
  | { mode: 'loading' }
  | { mode: 'error'; message: string }
  | { mode: 'no_token' }
  | { mode: 'already_attempted'; context: ParticipantPortalContext }
  | {
      mode: 'question'
      context: ParticipantPortalContext
      questions: ParticipantPortalQuestion[]
      questionIndex: number
      answers: QuizAnswerMap
    }
  | {
      mode: 'complete'
      context: ParticipantPortalContext
      allCorrect: boolean
      correctCount: number
      totalCount: number
      bucksBalance: number | null
    }

function ProgressDots({
  total,
  current,
}: {
  total: number
  current: number
}) {
  return (
    <div
      className="flex justify-center gap-2"
      aria-label={`Question ${current + 1} of ${total}`}
    >
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

function participantFromContext(context: ParticipantPortalContext): Participant {
  return {
    id: context.participant_id,
    display_id: context.display_id,
    first_name: context.first_name,
    last_initial: context.last_initial,
    qr_token: '',
    active: true,
    guardian_name: '',
    authorized_pickups: [],
    created_at: '',
  }
}

function questionsForTrueFalse(
  questions: ParticipantPortalQuestion[],
): Tables<'quiz_questions'>[] {
  return questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options as Json,
    position: question.position,
    quiz_id: '',
    correct_index: 0,
    ai_drafted: false,
  }))
}

export default function GoQuizPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState<GoQuizView>({ mode: 'loading' })
  const [submitting, setSubmitting] = useState(false)
  /** Held briefly so a boy sees his tap land before the next question. */
  const [pendingChoice, setPendingChoice] = useState<number | null>(null)
  const advanceTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current)
      }
    },
    [],
  )

  const qrToken = useMemo(() => {
    const fromQuery = searchParams.get('t')
    if (fromQuery) {
      return normalizeParticipantGoToken(fromQuery)
    }
    return readParticipantGoToken()
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get('t')) {
      const token = normalizeParticipantGoToken(searchParams.get('t') ?? '')
      if (token) {
        writeParticipantGoToken(token)
      }
    }
  }, [searchParams])

  const loadQuiz = useCallback(async () => {
    if (!qrToken) {
      setView({ mode: 'no_token' })
      return
    }

    setView({ mode: 'loading' })

    try {
      const context = await fetchParticipantPortalContext(qrToken)

      if (context.already_attempted) {
        setView({ mode: 'already_attempted', context })
        return
      }

      const questions = await fetchParticipantPortalQuestions(qrToken, context.session_id)

      if (questions.length === 0) {
        setView({
          mode: 'error',
          message: 'No quiz yet. Come back after reading time.',
        })
        return
      }

      setView({
        mode: 'question',
        context,
        questions,
        questionIndex: 0,
        answers: {},
      })
    } catch (error) {
      setView({
        mode: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Try again, or ask a leader.',
      })
    }
  }, [qrToken])

  useEffect(() => {
    void loadQuiz()
  }, [loadQuiz])

  const returnToScanner = useCallback(() => {
    signOutParticipantGo()
    navigate('/go', { replace: true })
  }, [navigate])

  /** Keep badge session so the boy returns to profile without re-entering #. */
  const returnToProfile = useCallback(() => {
    if (qrToken) {
      writeParticipantGoToken(qrToken)
      navigate(participantGoProfileUrl(qrToken), { replace: true })
      return
    }
    navigate('/go/profile', { replace: true })
  }, [navigate, qrToken])

  const finishQuiz = useCallback(
    async (context: ParticipantPortalContext, answers: QuizAnswerMap) => {
      if (!qrToken) {
        return
      }

      setSubmitting(true)

      try {
        const result = await submitParticipantPortalQuiz({
          qrToken,
          answers,
          sessionId: context.session_id,
        })

        const bucksBalance = await fetchPortalBucksBalance(qrToken)

        setView({
          mode: 'complete',
          context,
          allCorrect: result.all_correct,
          correctCount: result.score,
          totalCount: result.total,
          bucksBalance,
        })
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'We could not save your quiz. Ask a leader.'

        if (message.includes('already completed')) {
          setView({ mode: 'already_attempted', context })
          return
        }

        setView({ mode: 'error', message })
      } finally {
        setSubmitting(false)
      }
    },
    [qrToken],
  )

  const handleMcAnswer = useCallback(
    (selectedIndex: number) => {
      if (view.mode !== 'question' || submitting || pendingChoice !== null) {
        return
      }

      const question = view.questions[view.questionIndex]
      if (!question) {
        return
      }

      const nextAnswers = recordQuizAnswer(
        view.answers,
        question.id,
        selectedIndex,
      )

      confirmHaptic()
      primeSound()
      setPendingChoice(selectedIndex)

      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null
        setPendingChoice(null)

        if (view.questionIndex >= view.questions.length - 1) {
          void finishQuiz(view.context, nextAnswers)
          return
        }

        setView({
          ...view,
          questionIndex: view.questionIndex + 1,
          answers: nextAnswers,
        })
      }, 350)
    },
    [finishQuiz, pendingChoice, submitting, view],
  )

  /** Answers are keyed by question id, so re-answering overwrites. */
  const handleMcBack = useCallback(() => {
    if (view.mode !== 'question' || submitting || pendingChoice !== null) {
      return
    }
    if (view.questionIndex === 0) {
      return
    }

    setView({ ...view, questionIndex: view.questionIndex - 1 })
  }, [pendingChoice, submitting, view])

  if (view.mode === 'loading') {
    return <p className="text-center text-xl text-slate-600">Loading quiz…</p>
  }

  if (view.mode === 'no_token') {
    return (
      <div className="space-y-6 text-center">
        <p className="text-xl text-slate-700">Scan your badge to start the quiz.</p>
        <Button fullWidth className="min-h-16 text-xl" onClick={returnToScanner}>
          Scan badge
        </Button>
      </div>
    )
  }

  if (view.mode === 'error') {
    return (
      <div className="space-y-6">
        <KioskHelperScreen title="One moment" message={view.message} />
        <div className="flex flex-col gap-3">
          <Button fullWidth className="min-h-16 text-xl" onClick={() => void loadQuiz()}>
            Try again
          </Button>
          <Button fullWidth variant="secondary" onClick={returnToScanner}>
            Start over
          </Button>
        </div>
      </div>
    )
  }

  if (view.mode === 'already_attempted') {
    const scoreLine =
      view.context.quiz_score != null && view.context.quiz_total != null
        ? `You got ${view.context.quiz_score} of ${view.context.quiz_total} right.`
        : null

    return (
      <div className="space-y-6 text-center">
        <p className="text-3xl font-bold text-crimson-700">
          You already did this quiz today!
        </p>
        <p className="text-xl text-slate-700">
          Nice work, {view.context.first_name}!
        </p>
        {scoreLine && <p className="text-lg text-slate-600">{scoreLine}</p>}
        <p className="text-base text-slate-500">
          Tell a leader your reading minutes.
        </p>
        <Button fullWidth className="min-h-16 text-xl" onClick={returnToProfile}>
          Back to my page
        </Button>
        <Button fullWidth variant="secondary" onClick={returnToScanner}>
          Not you? Start over
        </Button>
      </div>
    )
  }

  if (view.mode === 'complete') {
    return (
      <div className="space-y-4">
        <QuizComplete
          firstName={view.context.first_name}
          allCorrect={view.allCorrect}
          correctCount={view.correctCount}
          totalCount={view.totalCount}
          pendingSync={false}
          bucksBalance={view.bucksBalance}
          nextLabel="Back to my page"
          onNext={returnToProfile}
        />
        <p className="text-center text-base text-slate-500">
          Tell a leader your reading minutes.
        </p>
        <Button fullWidth variant="secondary" onClick={returnToScanner}>
          Not you? Start over
        </Button>
      </div>
    )
  }

  if (view.mode === 'question') {
    const participant = participantFromContext(view.context)
    const { context, questions } = view

    if (isTrueFalseFormat(context.quiz_format)) {
      return (
        <section className="space-y-4">
          <ReadingBadge variant="idle" idlePrompt={context.quiz_title} />
          <KioskTrueFalseQuiz
            participant={participant}
            questions={questionsForTrueFalse(questions)}
            submitting={submitting}
            onComplete={(answers) => void finishQuiz(context, answers)}
          />
        </section>
      )
    }

    const currentQuestion = questions[view.questionIndex]
    if (!currentQuestion) {
      return null
    }

    const options = optionsFromJson(currentQuestion.options as Json)

    const answered = view.answers[currentQuestion.id]

    return (
      <section className="space-y-6">
        <ProgressDots total={questions.length} current={view.questionIndex} />
        <p className="text-center text-lg text-slate-600">
          {formatParticipantName(participant.first_name, participant.last_initial)}
        </p>
        <p className="text-center text-sm font-medium text-slate-500">
          {context.quiz_title}
        </p>
        <QuizQuestionCard
          prompt={currentQuestion.prompt}
          options={options}
          selectedIndex={pendingChoice ?? answered ?? null}
          disabled={submitting || pendingChoice !== null}
          onSelect={handleMcAnswer}
        />
        {view.questionIndex > 0 ? (
          <Button
            fullWidth
            variant="secondary"
            disabled={submitting || pendingChoice !== null}
            onClick={handleMcBack}
          >
            Back
          </Button>
        ) : (
          <Button
            fullWidth
            variant="secondary"
            disabled={submitting || pendingChoice !== null}
            onClick={returnToProfile}
          >
            Back to my page
          </Button>
        )}
      </section>
    )
  }

  return null
}
