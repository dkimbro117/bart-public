import QrScanner from '../checkin/QrScanner'
import ScanErrorBoundary from '../checkin/ScanErrorBoundary'
import KioskCameraAlert from './KioskCameraAlert'

type KioskQrScannerProps = {
  resetKey?: number
  onScan: (qrToken: string) => void
  onCameraError: (message: string) => void
}

export default function KioskQrScanner({
  onScan,
  onCameraError,
  resetKey,
}: KioskQrScannerProps) {
  return (
    <ScanErrorBoundary
      onFailure={() =>
        onCameraError(
          'The scanner stopped unexpectedly. Find your name below or try again.',
        )
      }
      fallback={(retry) => (
        <KioskCameraAlert
          message="The scanner stopped unexpectedly. Find your name below or try again."
          onRetry={retry}
        />
      )}
    >
      <QrScanner
        resetKey={resetKey}
        onScan={onScan}
        onCameraError={onCameraError}
      />
    </ScanErrorBoundary>
  )
}
