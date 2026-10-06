import type { InputHTMLAttributes } from 'react'
import { inputClass } from '../../ui/classes'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export default function Input({
  label,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined)

  return (
    <label className="block">
      {label && (
        <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      )}
      <input id={inputId} className={[inputClass, className].join(' ')} {...props} />
    </label>
  )
}
