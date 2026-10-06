import {
  appendReadingMinutesDigit,
  backspaceReadingMinutes,
} from '../../lib/readingLogs'

const padButtonClassName =
  'min-h-20 touch-manipulation rounded-2xl border border-cream-200 bg-white text-3xl font-semibold text-slate-900 shadow-sm hover:bg-cream-100 active:bg-cream-200 disabled:cursor-not-allowed disabled:opacity-60'

type KioskMinutesPadProps = {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

export default function KioskMinutesPad({
  value,
  disabled = false,
  onChange,
}: KioskMinutesPadProps) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cream-200 bg-white px-4 py-8 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-600">
          Minutes read
        </p>
        <p className="mt-2 font-mono text-7xl font-bold tabular-nums text-crimson-600">
          {value || '0'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
          className={`${padButtonClassName} text-xl`}
        >
          Delete
        </button>
      </div>

      <button
        type="button"
        disabled={disabled || !value}
        onClick={() => onChange('')}
        className="w-full py-3 text-lg font-semibold text-crimson-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        Clear
      </button>
    </div>
  )
}
