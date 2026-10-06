import { useMemo } from 'react'

export type StampProps = {
  date?: Date
  value: string
  label?: string
  /** When true, plays thunk animation unless user prefers reduced motion. */
  animate?: boolean
}

function formatStampDate(date: Date): string {
  return date
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase()
}

export default function Stamp({
  date = new Date(),
  value,
  label,
  animate = true,
}: StampProps) {
  const dateLabel = useMemo(() => formatStampDate(date), [date])

  return (
    <div
      className={[
        'stamp-block',
        animate ? 'stamp-block--animate' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label={
        label
          ? `${label}: ${value} on ${dateLabel}`
          : `${value} on ${dateLabel}`
      }
    >
      {label && (
        <p className="stamp-block__label font-stamp text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-crimson-700">
          {label}
        </p>
      )}
      <p className="stamp-block__date font-stamp text-sm font-medium uppercase tracking-wide text-crimson-800">
        {dateLabel}
      </p>
      <p className="stamp-block__value font-stamp text-2xl font-semibold uppercase tracking-tight text-crimson-600">
        {value}
      </p>
    </div>
  )
}
