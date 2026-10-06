import { useEffect } from 'react'
import ReadingBadge from '../brand/ReadingBadge'
import Button from '../ui/Button'

type KioskSuccessProps = {
  firstName: string
  minutes: number
  onNext: () => void
}

export default function KioskSuccess({
  firstName,
  minutes,
  onNext,
}: KioskSuccessProps) {
  useEffect(() => {
    const timer = window.setTimeout(onNext, 4000)
    return () => window.clearTimeout(timer)
  }, [onNext])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center py-6">
      <ReadingBadge
        variant="reading-success"
        readerName={firstName}
        stampValue={`${minutes} MIN`}
        stampLabel="READING LOG"
        headline={`Nice reading, ${firstName}!`}
        showRewards
        animateStamp
      />

      <div className="mt-6 w-full max-w-xs">
        <Button fullWidth onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  )
}
