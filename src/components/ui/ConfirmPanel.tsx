import type { ReactNode } from 'react'
import Button from './Button'

type ConfirmPanelProps = {
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  /** Optional third action (e.g. Append alongside Replace). */
  altConfirmLabel?: string
  onAltConfirm?: () => void
  loading?: boolean
  tone?: 'amber' | 'red'
}

const toneClasses = {
  amber: 'border-amber-200 bg-amber-50',
  red: 'border-red-200 bg-red-50',
} as const

const titleClasses = {
  amber: 'text-amber-900',
  red: 'text-red-900',
} as const

export default function ConfirmPanel({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  altConfirmLabel,
  onAltConfirm,
  loading = false,
  tone = 'amber',
}: ConfirmPanelProps) {
  return (
    <div
      className={`rounded-[20px] border px-4 py-4 shadow-card ${toneClasses[tone]}`}
      role="alertdialog"
      aria-labelledby="confirm-panel-title"
    >
      <p id="confirm-panel-title" className={`font-semibold ${titleClasses[tone]}`}>
        {title}
      </p>
      <div className={`mt-2 text-sm ${tone === 'red' ? 'text-red-800' : 'text-amber-900'}`}>
        {children}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={loading} onClick={onConfirm}>
          {loading ? 'Working…' : confirmLabel}
        </Button>
        {altConfirmLabel && onAltConfirm && (
          <Button variant="secondary" disabled={loading} onClick={onAltConfirm}>
            {altConfirmLabel}
          </Button>
        )}
        <Button variant="secondary" disabled={loading} onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  )
}
