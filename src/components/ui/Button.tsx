import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { btnDanger, btnGhost, btnPrimary, btnSecondary } from '../../ui/classes'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children: ReactNode
  fullWidth?: boolean
}

const variantClass: Record<ButtonVariant, string> = {
  primary: btnPrimary,
  secondary: btnSecondary,
  ghost: btnGhost,
  danger: btnDanger,
}

export default function Button({
  variant = 'primary',
  children,
  fullWidth = false,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[variantClass[variant], fullWidth ? 'w-full' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
