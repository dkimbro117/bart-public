import type { ComponentType } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSoftKeyboardOpen } from '../../hooks/useSoftKeyboardOpen'

type FloatingNavLinkItem = {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  to: string
  match?: (pathname: string) => boolean
  onSelect?: never
}

type FloatingNavActionItem = {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  onSelect: () => void
  match?: (pathname: string) => boolean
  to?: never
}

export type FloatingNavItem = FloatingNavLinkItem | FloatingNavActionItem

type FloatingNavProps = {
  items: FloatingNavItem[]
}

function itemClassName(active: boolean) {
  return [
    'flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-xs font-medium touch-manipulation transition-colors',
    active ? 'bg-crimson-600 text-cream-50' : 'text-cream-100 hover:text-white',
  ].join(' ')
}

export default function FloatingNav({ items }: FloatingNavProps) {
  const location = useLocation()
  const keyboardOpen = useSoftKeyboardOpen()

  /** iOS floats fixed elements above the keyboard, over the page content. */
  if (keyboardOpen) {
    return null
  }

  return (
    <nav
      className="event-nav no-print fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-full bg-crimson-950 p-2 shadow-nav lg:hidden"
      aria-label="Main navigation"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around gap-1">
        {items.map((item) => {
          const { id, label, icon: Icon, match } = item
          const active =
            (match?.(location.pathname) ?? false) ||
            ('to' in item && item.to ? location.pathname === item.to : false)

          const content = (
            <>
              <Icon
                aria-hidden
                className={`h-6 w-6 shrink-0 ${active ? 'text-cream-50' : 'text-cream-100'}`}
              />
              <span className="truncate">{label}</span>
            </>
          )

          if ('onSelect' in item && item.onSelect) {
            return (
              <button
                key={id}
                type="button"
                onClick={item.onSelect}
                className={itemClassName(active)}
              >
                {content}
              </button>
            )
          }

          return (
            <NavLink key={id} to={item.to} className={itemClassName(active)}>
              {content}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
