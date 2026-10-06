import QrScanner from './QrScanner'
import ScanErrorBoundary from './ScanErrorBoundary'

type StaffQrScannerProps = {
  resetKey?: number
  onScan: (qrToken: string) => void
  onCameraError: (message: string) => void
  onCameraFailure?: () => void
}

export default function StaffQrScanner({
  onScan,
  onCameraError,
  onCameraFailure,
  resetKey,
}: StaffQrScannerProps) {
  function handleCameraError(message: string) {
    onCameraFailure?.()
    onCameraError(message)
  }

  return (
    <ScanErrorBoundary onFailure={onCameraFailure}>
      <QrScanner
        resetKey={resetKey}
        onScan={onScan}
        onCameraError={handleCameraError}
      />
    </ScanErrorBoundary>
  )
}
