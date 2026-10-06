import { useMemo, useState } from 'react'
import { formatDisplayId, formatParticipantName } from '../../lib/format'
import { matchesParticipantLookup } from '../../lib/checkIn'
import type { Participant } from '../../lib/participants'
import { inputClass, listRow, surfaceCard } from '../../ui/classes'

type ManualCheckInSearchProps = {
  participants: Participant[]
  disabled?: boolean
  title?: string
  description?: string
  autoFocus?: boolean
  onSelect: (participant: Participant) => void
}

export default function ManualCheckInSearch({
  participants,
  disabled = false,
  title = 'Manual check-in',
  description = 'Search by name or badge number if the QR is damaged.',
  autoFocus = false,
  onSelect,
}: ManualCheckInSearchProps) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) {
      return []
    }

    return participants
      .filter((participant) => matchesParticipantLookup(participant, query))
      .slice(0, 8)
  }, [participants, query])

  return (
    <section className={`${surfaceCard} border border-cream-200 p-4`}>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>

      <input
        type="search"
        value={query}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="e.g. Marcus or #2601"
        className={`${inputClass} mt-4 min-h-14 text-lg`}
      />

      {query.trim() && results.length === 0 && (
        <p className="mt-3 text-sm text-slate-600">No matching participants.</p>
      )}

      <ul className="mt-3 overflow-hidden rounded-xl border border-cream-200">
        {results.map((participant) => (
          <li key={participant.id} className="border-b border-cream-200 last:border-b-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setQuery('')
                onSelect(participant)
              }}
              className={`${listRow} min-h-14 justify-between border-b-0 px-4 hover:bg-cream-50 disabled:opacity-60`}
            >
              <span className="text-lg font-semibold text-slate-900">
                {formatParticipantName(
                  participant.first_name,
                  participant.last_initial,
                  participant.last_name,
                )}
              </span>
              <span className="font-mono text-sm text-crimson-600">
                {formatDisplayId(participant.display_id)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
