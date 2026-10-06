type KioskHelperScreenProps = {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export default function KioskHelperScreen({
  title,
  message,
  actionLabel,
  onAction,
}: KioskHelperScreenProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-cream-200 bg-white px-6 py-10 text-center">
      <p className="text-3xl font-bold text-crimson-700">{title}</p>
      <p className="mt-4 text-xl leading-relaxed text-slate-700">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-8 min-h-12 touch-manipulation rounded-xl bg-crimson-600 px-6 text-lg font-semibold text-cream-50 hover:bg-crimson-500"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
