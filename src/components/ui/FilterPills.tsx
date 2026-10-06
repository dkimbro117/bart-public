import { filterPill, filterPillActive } from '../../ui/classes'

type FilterPillsProps = {
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}

export default function FilterPills({ options, value, onChange }: FilterPillsProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      role="tablist"
      aria-label="Filter"
    >
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={active ? filterPillActive : filterPill}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
