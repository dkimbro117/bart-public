import type { ComponentType } from 'react'
import type { FloatingNavItem } from '../components/ui/FloatingNav'

export type StaffNavItem = FloatingNavItem & {
  /** Best on a phone or tablet — show hint in desktop side nav. */
  fieldRoute?: boolean
  /** Pending count badge (e.g. registrations queue). */
  badge?: number
}

export type StaffNavGroup = {
  id: string
  label: string
  items: StaffNavItem[]
}

export type StaffNavIcon = ComponentType<{ className?: string }>
