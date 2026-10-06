import type { ReactNode } from 'react'
import BadgeIllustration from './BadgeIllustration'
import BookmarkMarks from './BookmarkMarks'
import { BART_CHAPTER_NAME } from './BartWordmark'
import Stamp from './Stamp'
import './readingBadge.css'

export type ReadingBadgeVariant = 'idle' | 'reading-success' | 'quiz-success'

export type ReadingBadgeProps = {
  variant: ReadingBadgeVariant
  readerName?: string
  stampDate?: Date
  stampValue?: string
  stampLabel?: string
  idlePrompt?: string
  headline?: string
  subhead?: string
  showRewards?: boolean
  animateStamp?: boolean
  footer?: ReactNode
  className?: string
}

const CHAPTER_SUBTITLE = BART_CHAPTER_NAME

export default function ReadingBadge({
  variant,
  readerName,
  stampDate,
  stampValue,
  stampLabel,
  idlePrompt = 'Scan your badge',
  headline,
  subhead,
  showRewards = false,
  animateStamp = true,
  footer,
  className = '',
}: ReadingBadgeProps) {
  const isIdle = variant === 'idle'
  const isSuccess = variant === 'reading-success' || variant === 'quiz-success'

  const resolvedStampLabel =
    stampLabel ?? (variant === 'quiz-success' ? 'QUIZ' : 'READING LOG')

  return (
    <div className={`relative mx-auto w-full max-w-[16rem] ${className}`}>
      {showRewards && <BookmarkMarks />}

      <article
        className="reading-badge reading-badge--screen lanyard-card"
        aria-label={
          isIdle
            ? idlePrompt
            : `Reading badge for ${readerName ?? 'participant'}`
        }
      >
        <header className="reading-badge__header lanyard-card-header">
          <p className="font-wordmark text-lg font-bold tracking-wide">B.A.R.T.</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
            {CHAPTER_SUBTITLE}
          </p>
        </header>

        <div className="reading-badge__body reading-badge__ruled reading-badge__paper">
          {isIdle && (
            <>
              <div className="reading-badge__scan-frame">
                <BadgeIllustration className="reading-badge__scan-illustration" />
              </div>
              <p className="reading-badge__idle-prompt">{idlePrompt}</p>
            </>
          )}

          {isSuccess && readerName && (
            <>
              <p className="reading-badge__bookplate">This reader</p>
              <p className="reading-badge__reader">{readerName}</p>
            </>
          )}

          {isSuccess && stampValue && (
            <Stamp
              date={stampDate}
              value={stampValue}
              label={resolvedStampLabel}
              animate={animateStamp}
            />
          )}

          {isSuccess && headline && (
            <p className="reading-badge__headline">{headline}</p>
          )}

          {isSuccess && subhead && (
            <p className="reading-badge__subhead">{subhead}</p>
          )}
        </div>

        <div aria-hidden className="reading-badge__perforation" />
      </article>

      {footer && <div className="mt-6">{footer}</div>}
    </div>
  )
}
