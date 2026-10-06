import { formatDisplayId, formatParticipantName } from '../../lib/format'
import type { Participant } from '../../lib/participants'
import { btnGhost, btnPrimary } from '../../ui/classes'
import { CheckInCardShell } from './CheckInAlertCard'

type CheckInConfirmCardProps = {
  participant: Participant
  submitting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function CheckInConfirmCard({
  participant,
  submitting,
  onConfirm,
  onCancel,
}: CheckInConfirmCardProps) {
  return (
    <CheckInCardShell className="border-crimson-200">
      <p className="text-sm font-semibold uppercase tracking-wide text-crimson-600">
        Confirm check-in
      </p>
      <p className="mt-3 font-mono text-sm text-slate-600">
        {formatDisplayId(participant.display_id)}
      </p>
      <p className="mt-1 text-3xl font-bold text-slate-900">
        {formatParticipantName(
          participant.first_name,
          participant.last_initial,
          participant.last_name,
        )}
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={onConfirm}
          className={`${btnPrimary} min-h-14 w-full text-lg`}
        >
          {submitting ? 'Checking in…' : 'Confirm check-in'}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onCancel}
          className={`${btnGhost} min-h-14 w-full text-lg`}
        >
          Cancel
        </button>
      </div>
    </CheckInCardShell>
  )
}
