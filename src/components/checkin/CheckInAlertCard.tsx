import type { ReactNode } from 'react'
import { alertError, alertWarning, surfaceCard } from '../../ui/classes'
import Button from '../ui/Button'

type CheckInAlertCardProps = {
  title: string
  message: string
  detail?: string
  tone?: 'error' | 'warning' | 'success'
  actionLabel?: string
  onAction: () => void
}

const toneClasses = {
  error: alertError,
  warning: alertWarning,
  success:
    'rounded-[20px] border border-emerald-200 bg-emerald-50 p-5 shadow-card',
} as const

const titleClasses = {
  error: 'text-red-900',
  warning: 'text-amber-900',
  success: 'text-emerald-900',
} as const

export default function CheckInAlertCard({
  title,
  message,
  detail,
  tone = 'error',
  actionLabel = 'Back to scanner',
  onAction,
}: CheckInAlertCardProps) {
  return (
    <div className={toneClasses[tone]} role="alert">
      <p className={`text-lg font-bold ${titleClasses[tone]}`}>{title}</p>
      <p className="mt-2 text-base text-slate-800">{message}</p>
      {detail && <p className="mt-2 text-sm text-slate-600">{detail}</p>}
      <Button
        variant="secondary"
        fullWidth
        onClick={onAction}
        className="mt-6 min-h-14 text-lg"
      >
        {actionLabel}
      </Button>
    </div>
  )
}

export function CheckInCardShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`${surfaceCard} border border-cream-200 p-5 ${className}`}>
      {children}
    </div>
  )
}
