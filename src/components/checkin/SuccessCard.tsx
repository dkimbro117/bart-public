type SuccessCardProps = {
  title: string
  message: string
  detail?: string
  actionLabel?: string
  onAction: () => void
}

export default function SuccessCard({
  title,
  message,
  detail,
  actionLabel = 'Next scan',
  onAction,
}: SuccessCardProps) {
  return (
    <div
      className="rounded-2xl border border-cream-200 bg-cream-100 p-6 shadow-xl ring-1 ring-cream-200"
      role="status"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crimson-600 text-xl text-cream-50"
        >
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold text-crimson-700">{title}</p>
          <p className="mt-2 text-base text-slate-800">{message}</p>
          {detail && <p className="mt-2 text-sm text-slate-600">{detail}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="mt-6 min-h-14 w-full touch-manipulation rounded-xl bg-crimson-600 px-4 text-lg font-semibold text-cream-50 hover:bg-crimson-500"
      >
        {actionLabel}
      </button>
    </div>
  )
}
