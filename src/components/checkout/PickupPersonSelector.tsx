import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDisplayId, formatParticipantName } from '../../lib/format'
import type { Participant } from '../../lib/participants'
import { getPickupOptions } from '../../lib/checkOut'
import { btnGhost, btnPrimary, surfaceCard } from '../../ui/classes'

type PickupPersonSelectorProps = {
  participant: Participant
  submitting: boolean
  selectedPickup: string | null
  onSelect: (pickupName: string) => void
  onCancel: () => void
}

export default function PickupPersonSelector({
  participant,
  submitting,
  selectedPickup,
  onSelect,
  onCancel,
}: PickupPersonSelectorProps) {
  const [pendingPickup, setPendingPickup] = useState<string | null>(null)
  const pickupOptions = getPickupOptions(participant)
  const boyName = formatParticipantName(
    participant.first_name,
    participant.last_initial,
    participant.last_name,
  )

  if (pendingPickup) {
    return (
      <div className={`${surfaceCard} border border-amber-200 p-5`}>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
          Confirm pickup
        </p>
        <p className="mt-4 text-xl font-bold text-slate-900">
          {boyName} ({formatDisplayId(participant.display_id)})
        </p>
        <p className="mt-4 text-lg text-slate-800">
          Leaving with{' '}
          <span className="font-bold text-amber-800">{pendingPickup}</span>?
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Tap confirm only if you verified this person in person.
        </p>

        <button
          type="button"
          disabled={submitting}
          onClick={() => onSelect(pendingPickup)}
          className={`${btnPrimary} mt-6 min-h-16 w-full bg-amber-600 text-lg hover:bg-amber-700`}
        >
          {submitting && selectedPickup === pendingPickup
            ? 'Checking out…'
            : `Confirm — ${pendingPickup}`}
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={() => setPendingPickup(null)}
          className={`${btnGhost} mt-3 min-h-14 w-full text-lg`}
        >
          Choose someone else
        </button>
      </div>
    )
  }

  return (
    <div className={`${surfaceCard} border border-crimson-200 p-5`}>
      <p className="text-sm font-semibold uppercase tracking-wide text-crimson-600">
        Verify pickup person
      </p>
      <p className="mt-3 font-mono text-sm text-slate-600">
        {formatDisplayId(participant.display_id)}
      </p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{boyName}</p>
      <p className="mt-4 text-base text-slate-700">Who is collecting him?</p>

      {pickupOptions.length === 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm text-amber-900">
            No authorized pickups on file for this boy.
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Tap <strong>Refresh roster</strong> in the menu, or ask an admin to
            update his record.
          </p>
          <Link
            to={`/roster/${participant.id}`}
            className={`${btnPrimary} mt-4 inline-flex min-h-12`}
          >
            Edit participant
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {pickupOptions.map((pickupName) => (
            <button
              key={pickupName}
              type="button"
              disabled={submitting}
              onClick={() => setPendingPickup(pickupName)}
              className={`${btnPrimary} min-h-16 w-full justify-start px-4 py-4 text-left text-lg`}
            >
              {pickupName}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={onCancel}
        className={`${btnGhost} mt-6 min-h-14 w-full text-lg`}
      >
        Cancel
      </button>
    </div>
  )
}
