import { useMemo, useState } from 'react'
import { formatDisplayId } from '../../lib/format'
import { matchesVolunteerLookup, type Volunteer } from '../../lib/volunteers'
import {
  choiceRowLg,
  headingSection,
  inputClassLg,
  sectionCard,
  textMuted,
} from '../../ui/classes'

type VolunteerManualSearchProps = {
  volunteers: Volunteer[]
  disabled?: boolean
  autoFocus?: boolean
  onSelect: (volunteer: Volunteer) => void
}

export default function VolunteerManualSearch({
  volunteers,
  disabled = false,
  autoFocus = false,
  onSelect,
}: VolunteerManualSearchProps) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) {
      return []
    }

    return volunteers
      .filter((volunteer) => matchesVolunteerLookup(volunteer, query))
      .slice(0, 8)
  }, [volunteers, query])

  return (
    <section className={sectionCard}>
      <h2 className={headingSection}>Search volunteers</h2>
      <p className={`mt-1 text-sm ${textMuted}`}>
        Pick a name if a badge QR is unavailable.
      </p>

      <input
        type="search"
        value={query}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="e.g. Denise or #0003"
        className={`mt-4 ${inputClassLg}`}
      />

      {query.trim() && results.length === 0 && (
        <p className={`mt-3 text-sm ${textMuted}`}>No matching volunteers.</p>
      )}

      <ul className="mt-3 space-y-2">
        {results.map((volunteer) => (
          <li key={volunteer.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setQuery('')
                onSelect(volunteer)
              }}
              className={choiceRowLg}
            >
              <span className="text-lg font-semibold text-slate-900">
                {volunteer.full_name}
              </span>
              <span className="font-mono text-sm text-crimson-600">
                {formatDisplayId(volunteer.display_id)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
