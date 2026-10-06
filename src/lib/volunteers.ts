import type { Tables, TablesInsert, TablesUpdate } from '../types/database'
import { formatDisplayId } from './format'

export type Volunteer = Tables<'volunteers'>
export type VolunteerInsert = TablesInsert<'volunteers'>
export type VolunteerUpdate = TablesUpdate<'volunteers'>

/** Roster list row — matches VOLUNTEER_ROSTER_LIST select (M-11). */
export type VolunteerRosterRow = Pick<
  Volunteer,
  'id' | 'display_id' | 'full_name' | 'email' | 'phone' | 'active'
>

export type VolunteerFormValues = Pick<
  VolunteerInsert,
  'full_name' | 'email' | 'phone' | 'active'
> & {
  email: string
  phone: string
}

export const emptyVolunteerFormValues: VolunteerFormValues = {
  full_name: '',
  email: '',
  phone: '',
  active: true,
}

export function volunteerToFormValues(volunteer: Volunteer): VolunteerFormValues {
  return {
    full_name: volunteer.full_name,
    email: volunteer.email ?? '',
    phone: volunteer.phone ?? '',
    active: volunteer.active,
  }
}

export function formValuesToVolunteerInsert(
  values: VolunteerFormValues,
): Pick<VolunteerInsert, 'full_name' | 'email' | 'phone'> {
  return {
    full_name: values.full_name.trim(),
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
  }
}

export function formValuesToVolunteerUpdate(
  values: VolunteerFormValues,
): Pick<VolunteerUpdate, 'full_name' | 'email' | 'phone' | 'active'> {
  return {
    ...formValuesToVolunteerInsert(values),
    active: values.active,
  }
}

export function parseVolunteerDisplayIdQuery(query: string): number | null {
  const normalized = query.trim().replace(/^#/, '')
  if (!/^\d+$/.test(normalized)) {
    return null
  }
  return Number.parseInt(normalized, 10)
}

export function formatVolunteerContact(
  email: string | null,
  phone: string | null,
): string {
  const parts = [email?.trim(), phone?.trim()].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'No contact on file'
}

export function matchesVolunteerLookup(
  volunteer: Pick<Volunteer, 'display_id' | 'full_name' | 'email' | 'phone'>,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  const displayId = parseVolunteerDisplayIdQuery(query)
  if (displayId !== null && volunteer.display_id === displayId) {
    return true
  }

  return (
    volunteer.full_name.toLowerCase().includes(normalized) ||
    formatDisplayId(volunteer.display_id).toLowerCase().includes(normalized) ||
    (volunteer.email?.toLowerCase().includes(normalized) ?? false) ||
    (volunteer.phone?.toLowerCase().includes(normalized) ?? false)
  )
}
