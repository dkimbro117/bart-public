import { btnGhost, btnSecondary, inputClass, labelClass } from '../../ui/classes'

type AuthorizedPickupsFieldProps = {
  values: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
}

export default function AuthorizedPickupsField({
  values,
  onChange,
  disabled = false,
}: AuthorizedPickupsFieldProps) {
  function updatePickup(index: number, value: string) {
    const next = [...values]
    next[index] = value
    onChange(next)
  }

  function addPickup() {
    onChange([...values, ''])
  }

  function removePickup(index: number) {
    if (values.length === 1) {
      onChange([''])
      return
    }
    onChange(values.filter((_, currentIndex) => currentIndex !== index))
  }

  return (
    <fieldset className="space-y-3">
      <legend className={labelClass}>Additional authorized adults</legend>
      <p className="text-sm text-slate-600">
        People besides the primary guardian who may pick this boy up after the
        family authorizes them.
      </p>
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={(event) => updatePickup(index, event.target.value)}
            placeholder="Additional adult authorized to pick up"
            className={`flex-1 ${inputClass}`}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => removePickup(index)}
            className={`min-w-12 px-3 text-sm ${btnSecondary}`}
            aria-label={`Remove pickup ${index + 1}`}
          >
            −
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={addPickup}
        className={`w-full border border-dashed border-cream-300 ${btnGhost}`}
      >
        + Add authorized adult
      </button>
    </fieldset>
  )
}
