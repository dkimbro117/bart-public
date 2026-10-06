import {
  appendReadingMinutesDigit,
  backspaceReadingMinutes,
} from '../../lib/readingLogs'
import { btnGhost } from '../../ui/classes'

const padButtonClassName = `${btnGhost} min-h-16 text-2xl`

type ReadingMinutesPadProps = {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

export default function ReadingMinutesPad({
  value,
  disabled = false,
  onChange,
}: ReadingMinutesPadProps) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-cream-200 bg-cream-50/80 px-4 py-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Minutes read
        </p>
        <p className="mt-2 font-mono text-6xl font-bold tabular-nums text-slate-900">
          {value || '0'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {digits.map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={disabled}
            onClick={() => onChange(appendReadingMinutesDigit(value, digit))}
            className={padButtonClassName}
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('0')}
          className={padButtonClassName}
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled || !value}
          onClick={() => onChange(backspaceReadingMinutes(value))}
          className={padButtonClassName}
        >
          ⌫
        </button>

        <button
          type="button"
          disabled={disabled || !value}
          onClick={() => onChange('')}
          className={padButtonClassName}
        >
          Clear
        </button>
      </div>
    </div>
  )
}
