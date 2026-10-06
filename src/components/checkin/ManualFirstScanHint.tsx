import { btnSecondary, insetCard } from '../../ui/classes'

type ManualFirstScanHintProps = {
  onEnableScan?: () => void
}

export default function ManualFirstScanHint({
  onEnableScan,
}: ManualFirstScanHintProps) {
  return (
    <div className={`${insetCard} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
      <p className="text-sm text-slate-700">
        Search by name or <span className="font-mono">#display_id</span> below.
        For QR scanning at the door, use a phone or tablet — or enable your
        webcam here.
      </p>
      {onEnableScan && (
        <button type="button" onClick={onEnableScan} className={`${btnSecondary} shrink-0 text-sm`}>
          Enable camera
        </button>
      )}
    </div>
  )
}
