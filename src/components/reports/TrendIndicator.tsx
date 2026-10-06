import type { TrendDirection } from '../../lib/reports'

const trendMeta: Record<
  TrendDirection,
  { label: string; className: string; symbol: string }
> = {
  up: {
    label: 'Up from prior session',
    className: 'text-emerald-700',
    symbol: '↑',
  },
  down: {
    label: 'Down from prior session',
    className: 'text-amber-700',
    symbol: '↓',
  },
  same: {
    label: 'Same as prior session',
    className: 'text-slate-500',
    symbol: '→',
  },
  none: {
    label: 'No quiz data',
    className: 'text-slate-600',
    symbol: '—',
  },
  first: {
    label: 'First session in history',
    className: 'text-slate-500',
    symbol: '•',
  },
}

type TrendIndicatorProps = {
  direction: TrendDirection
}

export default function TrendIndicator({ direction }: TrendIndicatorProps) {
  const meta = trendMeta[direction]

  return (
    <span
      className={`inline-flex min-w-6 items-center justify-center font-semibold ${meta.className}`}
      aria-label={meta.label}
      title={meta.label}
    >
      {meta.symbol}
    </span>
  )
}
