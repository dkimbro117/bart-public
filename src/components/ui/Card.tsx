import type { HTMLAttributes, ReactNode } from 'react'
import { cardKiosk, cardPadding, surfaceCard } from '../../ui/classes'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  variant?: 'staff' | 'kiosk'
  padded?: boolean
}

export default function Card({
  children,
  variant = 'staff',
  padded = true,
  className = '',
  ...props
}: CardProps) {
  const base =
    variant === 'kiosk'
      ? cardKiosk
      : [surfaceCard, padded ? cardPadding : ''].filter(Boolean).join(' ')

  return (
    <div className={[base, className].join(' ')} {...props}>
      {children}
    </div>
  )
}
