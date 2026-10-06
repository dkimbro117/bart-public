import type { Json, Tables } from '../types/database'
import {
  deriveLastInitial,
  formValuesToContactInsert,
  formValuesToParticipantInsert,
  normalizeConsentFlag,
  PARTICIPANT_FORM_CONSENTS,
  type ParticipantFormConsentKey,
  type ParticipantFormValues,
} from './participants'
import { supabase } from './supabase'

export type PendingRegistration = Tables<'pending_registrations'>

export type RegistrationQueueRow = Pick<
  PendingRegistration,
  'id' | 'submission_id' | 'mapped' | 'raw_payload' | 'received_at' | 'status' | 'form_id'
> & {
  jotform_forms: { label: string } | null
}

export const REGISTRATIONS_CHANGED_EVENT = 'bart:registrations-changed'

export function notifyRegistrationsChanged() {
  window.dispatchEvent(new Event(REGISTRATIONS_CHANGED_EVENT))
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function mappedToFormValues(mapped: Json): ParticipantFormValues {
  const record =
    mapped && typeof mapped === 'object' && !Array.isArray(mapped)
      ? (mapped as Record<string, unknown>)
      : {}

  const authorized_pickups = Array.isArray(record.authorized_pickups)
    ? record.authorized_pickups
      .map((entry) => String(entry).trim())
      .filter(Boolean)
    : []

  const last_name = readString(record.last_name)

  return {
    first_name: readString(record.first_name),
    last_initial:
      deriveLastInitial(last_name) ||
      deriveLastInitial(readString(record.last_initial)),
    last_name,
    grade: readString(record.grade),
    school: readString(record.school),
    shirt_size: readString(record.shirt_size),
    age: record.age != null && record.age !== '' ? String(record.age) : '',
    enrollment_status: readString(record.enrollment_status),
    how_heard: readString(record.how_heard),
    registration_date: readString(record.registration_date),
    guardian_name: readString(record.guardian_name),
    guardian_email: readString(record.guardian_email),
    guardian_phone: readString(record.guardian_phone),
    authorized_pickups: authorized_pickups.length > 0 ? authorized_pickups : [''],
    active: true,
    ...Object.fromEntries(
      PARTICIPANT_FORM_CONSENTS.map(({ key }) => [
        key,
        normalizeConsentFlag(record[key]),
      ]),
    ) as Record<ParticipantFormConsentKey, boolean>,
  }
}

export function formValuesToMapped(values: ParticipantFormValues): Json {
  return {
    ...formValuesToParticipantInsert(values),
    guardian_email: values.guardian_email.trim() || null,
    guardian_phone: values.guardian_phone.trim() || null,
  }
}

export function formatGuardianContactSummary(values: ParticipantFormValues): string {
  const parts = [values.guardian_email.trim(), values.guardian_phone.trim()].filter(
    Boolean,
  )
  return parts.length > 0 ? parts.join(' · ') : 'No contact on file'
}

export async function fetchPendingRegistrationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('pending_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) {
    throw new Error(error.message)
  }

  return count ?? 0
}

export async function approveRegistration({
  registrationId,
  submissionId,
  staffId,
  values,
}: {
  registrationId: string
  submissionId: string
  staffId: string
  values: ParticipantFormValues
}): Promise<{ participantId: string; linkedExisting: boolean }> {
  const { data: pending, error: pendingError } = await supabase
    .from('pending_registrations')
    .select('id, status, participant_id, submission_id')
    .eq('id', registrationId)
    .single()

  if (pendingError) {
    throw new Error(pendingError.message)
  }

  if (pending.status !== 'pending') {
    throw new Error('This registration was already reviewed.')
  }

  const { data: existingParticipant, error: existingError } = await supabase
    .from('participants')
    .select('id')
    .eq('jotform_submission_id', submissionId)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  let participantId = existingParticipant?.id ?? pending.participant_id
  const linkedExisting = Boolean(existingParticipant)

  if (!participantId) {
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert({
        ...formValuesToParticipantInsert(values),
        jotform_submission_id: submissionId,
      })
      .select('id')
      .single()

    if (participantError) {
      throw new Error(participantError.message)
    }

    participantId = participant.id

    const contact = formValuesToContactInsert(participantId, values)
    if (contact.guardian_email || contact.guardian_phone) {
      const { error: contactError } = await supabase
        .from('participant_guardian_contacts')
        .insert(contact)

      if (contactError) {
        throw new Error(contactError.message)
      }
    }
  }

  const reviewedAt = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from('pending_registrations')
    .update({
      status: 'approved',
      participant_id: participantId,
      mapped: formValuesToMapped(values),
      reviewed_at: reviewedAt,
      reviewed_by: staffId,
    })
    .eq('id', registrationId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (updateError) {
    throw new Error(updateError.message)
  }

  if (!updated) {
    throw new Error('This registration was already reviewed by someone else.')
  }

  return { participantId, linkedExisting }
}

export async function rejectRegistration({
  registrationId,
  staffId,
}: {
  registrationId: string
  staffId: string
}): Promise<void> {
  const { data: updated, error } = await supabase
    .from('pending_registrations')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: staffId,
    })
    .eq('id', registrationId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!updated) {
    throw new Error('This registration was already reviewed by someone else.')
  }
}
