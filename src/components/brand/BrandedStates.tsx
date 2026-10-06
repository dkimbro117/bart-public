import type { ReactNode } from 'react'
import BadgeIllustration from './BadgeIllustration'
import './brandStates.css'

type BrandedLoadingProps = {
  message?: string
  className?: string
}

export default function BrandedLoading({
  message = 'Loading…',
  className = '',
}: BrandedLoadingProps) {
  return (
    <div
      className={`branded-loading flex flex-col items-center justify-center gap-4 py-12 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="branded-loading__badge">
        <BadgeIllustration className="h-[4.75rem] w-[3.55rem]" />
      </div>
      <p className="font-stamp text-sm font-medium uppercase tracking-wide text-ink-700">
        {message}
      </p>
    </div>
  )
}

type BrandedEmptyStateProps = {
  children: ReactNode
  title?: string
  className?: string
}

export function BrandedEmptyState({
  children,
  title,
  className = '',
}: BrandedEmptyStateProps) {
  return (
    <div
      className={[
        'branded-empty rounded-[20px] border border-dashed border-cream-300 bg-margin-white px-4 py-10 text-center shadow-card',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mx-auto flex h-16 w-12 items-center justify-center opacity-90">
        <BadgeIllustration className="h-16 w-12" />
      </div>
      {title && (
        <p className="mt-4 text-base font-semibold text-ink-900">{title}</p>
      )}
      <div
        className={[
          'text-sm leading-relaxed text-ink-500',
          title ? 'mt-2' : 'mt-4',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  )
}
