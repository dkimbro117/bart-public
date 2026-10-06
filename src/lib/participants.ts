import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

/** Staff-tracked form consents on each participant (roster edit checkboxes). */
export const PARTICIPANT_FORM_CONSENTS = [
  {
    key: 'parental_guardian_affirmation',
    label: 'Parental/Guardian Affirmation, Waiver and Release',
  },
  { key: 'media_release', label: 'Media Release on File' },
  {
    key: 'youth_code_of_conduct',
    label: 'Youth Code of Conduct for In-Person Meetings',
  },
  {
    key: 'youth_pickup_authorization',
    label: 'Youth Pick-Up Authorization',
  },
  {
    key: 'transportation_permission',
    label: 'Transportation Permission',
  },
  { key: 'off_site_permission', label: 'Off-Site Permission' },
  {
    key: 'medical_emergency_form',
    label: 'Medical/Emergency Form',
  },
  {
    key: 'virtual_meeting_performance_agreement',
    label:
      'Youth Initiative Virtual Meeting/Event Participant Agreement',
  },
] as const

export type ParticipantFormConsentKey =
  (typeof PARTICIPANT_FORM_CONSENTS)[number]['key']

/** Normalize yes/true/1-style values from sheets or JotForm into a boolean. */
export function normalizeConsentFlag(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value === 1
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return (
      normalized === 'yes' ||
      normalized === 'y' ||
      normalized === 'true' ||
      normalized === '1' ||
      normalized === 'on' ||
      normalized === 'checked'
    )
  }
  return false
}

const emptyConsents = Object.fromEntries(
  PARTICIPANT_FORM_CONSENTS.map(({ key }) => [key, false]),
) as Record<ParticipantFormConsentKey, boolean>

/** App-facing participant row — kiosk/roster views may omit jotform link when not selected. */
export type Participant = Pick<
  Tables<'participants'>,
  | 'id'
  | 'display_id'
  | 'first_name'
  | 'last_initial'
  | 'qr_token'
  | 'active'
  | 'guardian_name'
  | 'authorized_pickups'
  | 'created_at'
> & {
  jotform_submission_id?: string | null
  parental_guardian_affirmation?: boolean
  media_release?: boolean
  youth_code_of_conduct?: boolean
  youth_pickup_authorization?: boolean
  transportation_permission?: boolean
  off_site_permission?: boolean
  medical_emergency_form?: boolean
  virtual_meeting_performance_agreement?: boolean
  /** Staff-only roster fields; absent from scan/lanyard/roster-list selects. */
  last_name?: string | null
  grade?: string | null
  school?: string | null
  shirt_size?: string | null
  cy_ref?: string | null
  age?: number | null
  enrollment_status?: string | null
  how_heard?: string | null
  registration_date?: string | null
}
export type ParticipantInsert = TablesInsert<'participants'>
export type ParticipantUpdate = TablesUpdate<'participants'>
export type GuardianContact = Tables<'participant_guardian_contacts'>
export type GuardianContactInsert = TablesInsert<'participant_guardian_contacts'>
export type GuardianContactUpdate = TablesUpdate<'participant_guardian_contacts'>

/** Form shape: participant fields plus contact fields stored in a separate table (C-1). */
export type ParticipantFormValues = Pick<
  ParticipantInsert,
  | 'first_name'
  | 'last_initial'
  | 'guardian_name'
  | 'active'
  | ParticipantFormConsentKey
> & {
  guardian_email: string
  guardian_phone: string
  authorized_pickups: string[]
  last_name: string
  grade: string
  school: string
  shirt_size: string
  age: string
  enrollment_status: string
  how_heard: string
  registration_date: string
}

export const emptyParticipantFormValues: ParticipantFormValues = {
  first_name: '',
  last_initial: '',
  last_name: '',
  grade: '',
  school: '',
  shirt_size: '',
  age: '',
  enrollment_status: '',
  how_heard: '',
  registration_date: '',
  guardian_name: '',
  guardian_email: '',
  guardian_phone: '',
  authorized_pickups: [''],
  active: true,
  ...emptyConsents,
}

/** The roster sheet carries full surnames; boy-facing surfaces show only this. */
export function deriveLastInitial(lastName: string): string {
  return lastName.trim().toUpperCase().slice(0, 1)
}

/** Parse a form age string into an integer, or null when blank / not a number. */
export function parseAge(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const n = Number(trimmed)
  if (!Number.isInteger(n)) {
    return null
  }
  return n
}

function consentsFromParticipant(
  participant: Participant,
): Record<ParticipantFormConsentKey, boolean> {
  return Object.fromEntries(
    PARTICIPANT_FORM_CONSENTS.map(({ key }) => [
      key,
      participant[key] ?? false,
    ]),
  ) as Record<ParticipantFormConsentKey, boolean>
}

function consentsFromFormValues(
  values: ParticipantFormValues,
): Record<ParticipantFormConsentKey, boolean> {
  return Object.fromEntries(
    PARTICIPANT_FORM_CONSENTS.map(({ key }) => [key, values[key]]),
  ) as Record<ParticipantFormConsentKey, boolean>
}

export function participantToFormValues(
  participant: Participant,
  contact?: Pick<GuardianContact, 'guardian_email' | 'guardian_phone'> | null,
): ParticipantFormValues {
  return {
    first_name: participant.first_name,
    last_initial: participant.last_initial,
    last_name: participant.last_name ?? '',
    grade: participant.grade ?? '',
    school: participant.school ?? '',
    shirt_size: participant.shirt_size ?? '',
    age: participant.age != null ? String(participant.age) : '',
    enrollment_status: participant.enrollment_status ?? '',
    how_heard: participant.how_heard ?? '',
    registration_date: participant.registration_date ?? '',
    guardian_name: participant.guardian_name,
    guardian_email: contact?.guardian_email ?? '',
    guardian_phone: contact?.guardian_phone ?? '',
    authorized_pickups:
      participant.authorized_pickups.length > 0
        ? participant.authorized_pickups
        : [''],
    active: participant.active,
    ...consentsFromParticipant(participant),
  }
}

export function formValuesToParticipantInsert(
  values: ParticipantFormValues,
): Pick<
  ParticipantInsert,
  | 'first_name'
  | 'last_initial'
  | 'last_name'
  | 'grade'
  | 'school'
  | 'shirt_size'
  | 'age'
  | 'enrollment_status'
  | 'how_heard'
  | 'registration_date'
  | 'guardian_name'
  | 'authorized_pickups'
  | ParticipantFormConsentKey
> {
  const lastName = values.last_name.trim()
  const age = parseAge(values.age)
  if (values.age.trim() && age === null) {
    throw new Error('Age must be a whole number, or left blank.')
  }
  if (age !== null && (age < 4 || age > 18)) {
    throw new Error('Age must be between 4 and 18.')
  }

  return {
    first_name: values.first_name.trim(),
    // Fall back to the typed initial when no surname was captured.
    last_initial:
      deriveLastInitial(lastName) || deriveLastInitial(values.last_initial),
    last_name: lastName || null,
    grade: values.grade.trim() || null,
    school: values.school.trim() || null,
    shirt_size: values.shirt_size.trim() || null,
    age,
    enrollment_status: values.enrollment_status.trim() || null,
    how_heard: values.how_heard.trim() || null,
    registration_date: values.registration_date.trim() || null,
    guardian_name: values.guardian_name.trim(),
    authorized_pickups: values.authorized_pickups
      .map((name) => name.trim())
      .filter(Boolean),
    ...consentsFromFormValues(values),
  }
}

export function formValuesToContactInsert(
  participantId: string,
  values: ParticipantFormValues,
): GuardianContactInsert {
  return {
    participant_id: participantId,
    guardian_email: values.guardian_email.trim() || null,
    guardian_phone: values.guardian_phone.trim() || null,
  }
}

export function formValuesToContactUpdate(
  values: ParticipantFormValues,
): Pick<GuardianContactUpdate, 'guardian_email' | 'guardian_phone'> {
  return {
    guardian_email: values.guardian_email.trim() || null,
    guardian_phone: values.guardian_phone.trim() || null,
  }
}

export function formValuesToParticipantUpdate(
  values: ParticipantFormValues,
): Pick<
  ParticipantUpdate,
  | 'first_name'
  | 'last_initial'
  | 'last_name'
  | 'grade'
  | 'school'
  | 'shirt_size'
  | 'age'
  | 'enrollment_status'
  | 'how_heard'
  | 'registration_date'
  | 'guardian_name'
  | 'authorized_pickups'
  | 'active'
  | ParticipantFormConsentKey
> {
  return {
    ...formValuesToParticipantInsert(values),
    active: values.active,
  }
}

/** @deprecated Use formValuesToParticipantInsert */
export function formValuesToInsert(values: ParticipantFormValues) {
  return formValuesToParticipantInsert(values)
}

/** @deprecated Use formValuesToParticipantUpdate */
export function formValuesToUpdate(values: ParticipantFormValues) {
  return formValuesToParticipantUpdate(values)
}
