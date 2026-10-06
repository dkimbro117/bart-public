import BartWordmark from '../../components/brand/BartWordmark'
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline'
import { Link, NavLink, useLocation } from 'react-router-dom'
import type { StaffNavGroup, StaffNavItem } from '../../lib/staffNav'
import type { FloatingNavItem } from './FloatingNav'

type DesktopSideNavProps = {
  groups?: StaffNavGroup[]
  items?: FloatingNavItem[]
  brandLink?: string
}

function itemClassName(active: boolean) {
  return [
    'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium touch-manipulation transition-colors',
    active
      ? 'bg-crimson-600 text-cream-50'
      : 'text-cream-100/80 hover:bg-crimson-900 hover:text-cream-50',
  ].join(' ')
}

function NavItemRow({ item }: { item: StaffNavItem }) {
  const location = useLocation()
  const { id, label, icon: Icon, match, fieldRoute, badge } = item
  const active =
    (match?.(location.pathname) ?? false) ||
    ('to' in item && item.to ? location.pathname === item.to : false)

  const content = (
    <>
      <Icon
        aria-hidden
        className={`h-5 w-5 shrink-0 ${active ? 'text-cream-50' : 'text-cream-100/80'}`}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {fieldRoute && (
        <DevicePhoneMobileIcon
          aria-hidden
          title="Best on tablet"
          className={`h-4 w-4 shrink-0 ${active ? 'text-cream-100/80' : 'text-cream-100/50'}`}
        />
      )}
      {badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-crimson-500 px-2 py-0.5 text-xs font-semibold text-cream-50">
          {badge}
        </span>
      )}
    </>
  )

  if ('onSelect' in item && item.onSelect) {
    return (
      <li key={id}>
        <button type="button" onClick={item.onSelect} className={itemClassName(active)}>
          {content}
        </button>
      </li>
    )
  }

  return (
    <li key={id}>
      <NavLink to={item.to} className={itemClassName(active)}>
        {content}
      </NavLink>
    </li>
  )
}

function NavGroupSection({ group }: { group: StaffNavGroup }) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="mb-1 px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-cream-100/50">
        {group.label}
      </p>
      <ul className="flex flex-col gap-0.5">
        {group.items.map((item) => (
          <NavItemRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  )
}

function FlatNavList({ items }: { items: FloatingNavItem[] }) {
  return (
    <ul className="mt-6 flex flex-1 flex-col gap-1">
      {items.map((item) => (
        <NavItemRow key={item.id} item={item} />
      ))}
    </ul>
  )
}

export default function DesktopSideNav({ groups, items, brandLink }: DesktopSideNavProps) {
  return (
    <nav
      className="desktop-side-nav no-print hidden w-56 shrink-0 flex-col border-r border-crimson-900 bg-crimson-950 px-3 py-5 lg:flex"
      aria-label="Main navigation"
    >
      {brandLink ? (
        <Link to={brandLink} className="block px-3 hover:opacity-90">
          <BartWordmark size="sm" tone="on-dark" />
        </Link>
      ) : (
        <div className="px-3">
          <BartWordmark size="sm" tone="on-dark" />
        </div>
      )}
      <p className="mt-1 px-3 text-xs text-cream-100/70">Staff console</p>

      <div className="mt-6 flex flex-1 flex-col overflow-y-auto pb-4">
        {groups
          ? groups.map((group) => <NavGroupSection key={group.id} group={group} />)
          : items && <FlatNavList items={items} />}
      </div>
    </nav>
  )
}
