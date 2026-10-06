import ReadingMinutesPad from './ReadingMinutesPad'
import { formatDisplayId, formatParticipantName } from '../../lib/format'
import type { Participant } from '../../lib/participants'
import { btnPrimary, btnSecondary, cardPadding, surfaceCard } from '../../ui/classes'

type ReadingMinutesCardProps = {
  participant: Participant
  minutes: string
  unitTitle?: string | null
  submitting: boolean
  onMinutesChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export default function ReadingMinutesCard({
  participant,
  minutes,
  unitTitle,
  submitting,
  onMinutesChange,
  onConfirm,
  onCancel,
}: ReadingMinutesCardProps) {
  const parsedMinutes = Number.parseInt(minutes || '0', 10)
  const canConfirm = Number.isInteger(parsedMinutes) && parsedMinutes >= 0

  return (
    <div
      className={`space-y-5 ${surfaceCard} ${cardPadding} ring-1 ring-crimson-200`}
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-crimson-700">
          Log reading minutes
        </p>
        <p className="mt-3 font-mono text-sm text-slate-500">
          {formatDisplayId(participant.display_id)}
        </p>
        <p className="mt-1 text-3xl font-bold text-slate-900">
          {formatParticipantName(participant.first_name, participant.last_initial, participant.last_name)}
        </p>
        {unitTitle && (
          <p className="mt-2 text-sm text-slate-600">
            Unit: <span className="font-medium text-slate-900">{unitTitle}</span>
          </p>
        )}
      </div>

      <ReadingMinutesPad
        value={minutes}
        disabled={submitting}
        onChange={onMinutesChange}
      />

      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={submitting || !canConfirm}
          onClick={onConfirm}
          className={`min-h-14 text-lg ${btnPrimary}`}
        >
          {submitting ? 'Saving…' : 'Confirm minutes'}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onCancel}
          className={`min-h-14 text-lg ${btnSecondary}`}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
