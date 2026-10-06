import Button from '../ui/Button'

type KioskCameraAlertProps = {
  message: string
  onRetry?: () => void
}

export default function KioskCameraAlert({
  message,
  onRetry,
}: KioskCameraAlertProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-lg text-amber-900">
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" fullWidth onClick={onRetry}>
          Try camera again
        </Button>
      )}
    </div>
  )
}
