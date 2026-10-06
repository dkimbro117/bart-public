import { useEffect } from 'react'
import ReadingBadge from '../brand/ReadingBadge'
import Button from '../ui/Button'
import { playSuccessChime } from '../../lib/sound'

type QuizCompleteProps = {
  firstName: string
  allCorrect: boolean
  correctCount?: number
  totalCount?: number
  pendingSync?: boolean
  bucksBalance?: number | null
  onNext: () => void
  nextLabel?: string
}

export default function QuizComplete({
  firstName,
  allCorrect,
  correctCount,
  totalCount,
  pendingSync,
  bucksBalance,
  onNext,
  nextLabel = 'Next',
}: QuizCompleteProps) {
  useEffect(() => {
    playSuccessChime()
  }, [])

  const stampValue =
    typeof correctCount === 'number' && typeof totalCount === 'number'
      ? `${correctCount}/${totalCount}`
      : undefined

  const scoreLine =
    typeof correctCount === 'number' && typeof totalCount === 'number'
      ? allCorrect
        ? `You got all ${correctCount} questions!`
        : `You got ${correctCount} out of ${totalCount}!`
      : undefined

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center py-6">
      <ReadingBadge
        variant="quiz-success"
        readerName={firstName}
        stampValue={stampValue}
        stampLabel="QUIZ"
        headline="You finished!"
        subhead={scoreLine ?? `Great effort, ${firstName}!`}
        showRewards={Boolean(allCorrect)}
        animateStamp
      />

      {typeof bucksBalance === 'number' && (
        <p className="mt-4 text-center text-lg font-semibold text-crimson-700">
          You have {bucksBalance} Bucks
        </p>
      )}

      {pendingSync && (
        <p className="mt-4 max-w-xs text-center text-base text-ink-700">
          Saved. It will send when Wi‑Fi is back.
        </p>
      )}

      <div className="mt-6 w-full max-w-xs">
        <Button fullWidth onClick={onNext}>
          {nextLabel}
        </Button>
      </div>
    </div>
  )
}
