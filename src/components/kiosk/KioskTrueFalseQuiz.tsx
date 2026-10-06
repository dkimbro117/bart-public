import { useCallback, useRef, useState } from 'react'
import { formatParticipantName } from '../../lib/format'
import { confirmHaptic } from '../../lib/haptics'
import type { Participant } from '../../lib/participants'
import {
  TRUE_FALSE_OPTION_LABELS,
  TRUE_FALSE_SWIPE_THRESHOLD_PX,
} from '../../lib/quizFormat'
import { recordQuizAnswer, type QuizAnswerMap } from '../../lib/quizAttempts'
import type { Tables } from '../../types/database'
import { btnGhost } from '../../ui/classes'

type KioskTrueFalseQuizProps = {
  participant: Participant
  questions: Tables<'quiz_questions'>[]
  submitting: boolean
  onComplete: (answers: QuizAnswerMap) => void
}

/** Both answers get identical weight: a filled button reads as "press me". */
const answerButtonClassName =
  'min-h-16 touch-manipulation rounded-2xl border-2 border-slate-400 bg-white px-4 text-2xl font-bold text-slate-900 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-60'

function ProgressLabel({
  current,
  total,
}: {
  current: number
  total: number
}) {
  return (
    <p
      className="text-center text-lg font-medium text-slate-600"
      aria-live="polite"
    >
      Question {current + 1} of {total}
    </p>
  )
}

export default function KioskTrueFalseQuiz({
  participant,
  questions,
  submitting,
  onComplete,
}: KioskTrueFalseQuizProps) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswerMap>({})
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(
    null,
  )
  const pointerStartX = useRef(0)

  const currentQuestion = questions[questionIndex]

  const recordAnswer = useCallback(
    (selectedIndex: number) => {
      if (!currentQuestion || submitting || exitDirection) {
        return
      }

      const nextAnswers = recordQuizAnswer(
        answers,
        currentQuestion.id,
        selectedIndex,
      )

      confirmHaptic()
      const animateOut = selectedIndex === 0 ? 'right' : 'left'
      setExitDirection(animateOut)

      window.setTimeout(() => {
        if (questionIndex >= questions.length - 1) {
          onComplete(nextAnswers)
          return
        }

        setAnswers(nextAnswers)
        setQuestionIndex((index) => index + 1)
        setDragX(0)
        setExitDirection(null)
      }, 220)
    },
    [
      answers,
      currentQuestion,
      exitDirection,
      onComplete,
      questionIndex,
      questions.length,
      submitting,
    ],
  )

  /** Answers are keyed by question id, so re-answering overwrites. */
  const goBack = useCallback(() => {
    if (submitting || exitDirection || questionIndex === 0) {
      return
    }
    setQuestionIndex((index) => index - 1)
    setDragX(0)
  }, [exitDirection, questionIndex, submitting])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (submitting || exitDirection) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    pointerStartX.current = event.clientX
    setIsDragging(true)
    setDragX(0)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || submitting || exitDirection) {
      return
    }

    setDragX(event.clientX - pointerStartX.current)
  }

  const handlePointerUp = () => {
    if (!isDragging || submitting || exitDirection) {
      return
    }

    setIsDragging(false)

    if (dragX >= TRUE_FALSE_SWIPE_THRESHOLD_PX) {
      recordAnswer(0)
      return
    }

    if (dragX <= -TRUE_FALSE_SWIPE_THRESHOLD_PX) {
      recordAnswer(1)
      return
    }

    setDragX(0)
  }

  if (!currentQuestion) {
    return null
  }

  const cardTransform = exitDirection
    ? exitDirection === 'right'
      ? 'translateX(120%) rotate(8deg)'
      : 'translateX(-120%) rotate(-8deg)'
    : `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`

  const dragProgress = Math.min(
    1,
    Math.abs(dragX) / TRUE_FALSE_SWIPE_THRESHOLD_PX,
  )
  const dragLabel =
    dragX > 0
      ? TRUE_FALSE_OPTION_LABELS[0]
      : dragX < 0
        ? TRUE_FALSE_OPTION_LABELS[1]
        : null
  const willCommit = Math.abs(dragX) >= TRUE_FALSE_SWIPE_THRESHOLD_PX

  return (
    <section className="space-y-6">
      <ProgressLabel current={questionIndex} total={questions.length} />
      <p className="text-center text-lg text-slate-600">
        {formatParticipantName(
          participant.first_name,
          participant.last_initial,
        )}
      </p>

      <div className="flex items-center justify-between px-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <span>← {TRUE_FALSE_OPTION_LABELS[1]}</span>
        <span>{TRUE_FALSE_OPTION_LABELS[0]} →</span>
      </div>

      <div
        className="touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <article
          className={[
            'relative overflow-hidden rounded-3xl border-2 bg-white px-6 py-10 shadow-card transition-transform duration-200 ease-out',
            willCommit ? 'border-crimson-600' : 'border-cream-200',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
          ].join(' ')}
          style={{ transform: cardTransform }}
        >
          {dragLabel && (
            <span
              aria-hidden
              className={`absolute top-4 text-3xl font-black tracking-wide text-crimson-600 ${
                dragX > 0 ? 'right-5' : 'left-5'
              }`}
              style={{ opacity: dragProgress }}
            >
              {dragLabel}
            </span>
          )}
          <p className="text-center text-2xl font-semibold leading-snug text-slate-900">
            {currentQuestion.prompt}
          </p>
          <p className="mt-6 text-center text-base text-slate-500">
            Swipe the card or tap a button
          </p>
        </article>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <button
          type="button"
          disabled={submitting || Boolean(exitDirection)}
          onClick={() => recordAnswer(1)}
          className={answerButtonClassName}
        >
          {TRUE_FALSE_OPTION_LABELS[1]}
        </button>
        <button
          type="button"
          disabled={submitting || Boolean(exitDirection)}
          onClick={() => recordAnswer(0)}
          className={answerButtonClassName}
        >
          {TRUE_FALSE_OPTION_LABELS[0]}
        </button>
      </div>

      {questionIndex > 0 && (
        <button
          type="button"
          disabled={submitting || Boolean(exitDirection)}
          onClick={goBack}
          className={`${btnGhost} min-h-12 w-full text-base`}
        >
          Back
        </button>
      )}
    </section>
  )
}
