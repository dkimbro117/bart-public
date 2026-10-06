import './bartWordmark.css'

export type BartWordmarkSize = 'sm' | 'md' | 'lg'

export type BartWordmarkProps = {
  size?: BartWordmarkSize
  /** `default` for cream surfaces; `on-dark` for crimson nav bars. */
  tone?: 'default' | 'on-dark'
  className?: string
}

const sizeClass: Record<BartWordmarkSize, string> = {
  sm: 'bart-wordmark__text--sm',
  md: 'bart-wordmark__text--md',
  lg: 'bart-wordmark__text--lg',
}

export default function BartWordmark({
  size = 'lg',
  tone = 'default',
  className = '',
}: BartWordmarkProps) {
  const onDark = tone === 'on-dark'

  return (
    <div className={`bart-wordmark ${className}`} aria-label="B.A.R.T.">
      <div
        className={[
          'bart-wordmark__plate',
          onDark ? 'bart-wordmark__plate--on-dark' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <p
          className={[
            'bart-wordmark__text',
            sizeClass[size],
            onDark ? 'bart-wordmark__text--on-dark' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span
            aria-hidden
            className={[
              'bart-wordmark__bleed',
              onDark ? 'bart-wordmark__bleed--on-dark' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            B.A.R.T.
          </span>
          B.A.R.T.
        </p>
      </div>
    </div>
  )
}

export const BART_MISSION = 'Boys Are Readers Too'

export const BART_CHAPTER_NAME = 'Community Chapter'

export const BART_CHAPTER_LINE = `${BART_CHAPTER_NAME} · Youth literacy program`
