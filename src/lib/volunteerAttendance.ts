import { todayIsoDate } from './dates'
import { VOLUNTEER_LIVE, VOLUNTEER_SCAN } from './volunteerColumns'
import type { Volunteer } from './volunteers'
import { supabase } from './supabase'
import type { Tables } from '../types/database'

export type VolunteerAttendance = Tables<'volunteer_attendance'>

type LiveVolunteer = Pick<
  Volunteer,
  'id' | 'display_id' | 'full_name' | 'active'
>

export type VolunteerAttendanceWithVolunteer = VolunteerAttendance & {
  volunteers: LiveVolunteer
}

export type VolunteerAttendanceState = 'not_checked_in' | 'checked_in' | 'checked_out'

export function normalizeVolunteerQrToken(value: string): string {
  return value.trim()
}

export function getVolunteerAttendanceState(
  attendance: VolunteerAttendance | null,
): VolunteerAttendanceState {
  if (!attendance?.checked_in_at) {
    return 'not_checked_in'
  }
  if (!attendance.checked_out_at) {
    return 'checked_in'
  }
  return 'checked_out'
}

export async function lookupVolunteerByQrToken(
  qrToken: string,
): Promise<Volunteer | null> {
  const { data, error } = await supabase
    .from('volunteers')
    .select(VOLUNTEER_SCAN)
    .eq('qr_token', normalizeVolunteerQrToken(qrToken))
    .eq('active', true)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  return {
    ...data,
    email: null,
    phone: null,
    created_at: null,
  }
}

export async function getVolunteerAttendanceForSession(
  volunteerId: string,
  sessionId: string,
): Promise<VolunteerAttendance | null> {
  const { data, error } = await supabase
    .from('volunteer_attendance')
    .select(
      'id, volunteer_id, session_id, checked_in_at, checked_out_at, recorded_by',
    )
    .eq('volunteer_id', volunteerId)
    .eq('session_id', sessionId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function fetchCheckedInVolunteers(
  sessionId: string,
): Promise<VolunteerAttendanceWithVolunteer[]> {
  const { data, error } = await supabase
    .from('volunteer_attendance')
    .select(`*, volunteers (${VOLUNTEER_LIVE})`)
    .eq('session_id', sessionId)
    .not('checked_in_at', 'is', null)
    .is('checked_out_at', null)
    .order('checked_in_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).flatMap((row) => {
    const volunteer = row.volunteers as LiveVolunteer | null
    if (!volunteer) {
      return []
    }

    return [
      {
        id: row.id,
        volunteer_id: row.volunteer_id,
        session_id: row.session_id,
        checked_in_at: row.checked_in_at,
        checked_out_at: row.checked_out_at,
        recorded_by: row.recorded_by,
        volunteers: volunteer,
      },
    ]
  })
}

export async function checkInVolunteer({
  volunteerId,
  sessionId,
  staffId,
  occurredAt,
}: {
  volunteerId: string
  sessionId: string
  staffId: string
  occurredAt: string
}): Promise<VolunteerAttendance> {
  const existing = await getVolunteerAttendanceForSession(volunteerId, sessionId)

  if (existing?.checked_in_at && !existing.checked_out_at) {
    throw new Error(
      'This volunteer is already checked in. Check them out before checking in again.',
    )
  }

  const { data, error } = await supabase
    .from('volunteer_attendance')
    .upsert(
      {
        volunteer_id: volunteerId,
        session_id: sessionId,
        checked_in_at: occurredAt,
        checked_out_at: null,
        recorded_by: staffId,
      },
      { onConflict: 'volunteer_id,session_id' },
    )
    .select(
      'id, volunteer_id, session_id, checked_in_at, checked_out_at, recorded_by',
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function checkOutVolunteer({
  volunteerId,
  sessionId,
  staffId,
  occurredAt,
}: {
  volunteerId: string
  sessionId: string
  staffId: string
  occurredAt: string
}): Promise<VolunteerAttendance> {
  const existing = await getVolunteerAttendanceForSession(volunteerId, sessionId)

  if (!existing?.checked_in_at) {
    throw new Error('This volunteer is not checked in for this session.')
  }

  if (existing.checked_out_at) {
    throw new Error('This volunteer is already checked out for this session.')
  }

  const { data, error } = await supabase
    .from('volunteer_attendance')
    .update({
      checked_out_at: occurredAt,
      recorded_by: staffId,
    })
    .eq('volunteer_id', volunteerId)
    .eq('session_id', sessionId)
    .not('checked_in_at', 'is', null)
    .is('checked_out_at', null)
    .select(
      'id, volunteer_id, session_id, checked_in_at, checked_out_at, recorded_by',
    )
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('This volunteer is not checked in for this session.')
  }

  return data
}

/** @deprecated Use checkInVolunteer */
export async function signInVolunteer(params: {
  volunteerId: string
  sessionId: string
  staffId: string
  occurredAt: string
}): Promise<VolunteerAttendance> {
  return checkInVolunteer(params)
}

/** @deprecated Use checkOutVolunteer */
export async function signOutVolunteer(params: {
  volunteerId: string
  sessionId: string
  staffId: string
  occurredAt: string
}): Promise<VolunteerAttendance> {
  return checkOutVolunteer(params)
}

/** Match roster volunteer by email and sign in for today's session on staff login. */
export async function recordVolunteerSignInOnLogin({
  email,
  staffId,
}: {
  email: string
  staffId: string
}): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    return
  }

  const { data: volunteer, error: volunteerError } = await supabase
    .from('volunteers')
    .select('id')
    .eq('active', true)
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (volunteerError || !volunteer) {
    return
  }

  const { data: sessions, error: sessionError } = await supabase
    .from('sessions')
    .select('id, requires_check_in, supports_reading, created_at')
    .eq('session_date', todayIsoDate())
    .order('created_at', { ascending: true })

  if (sessionError || !sessions || sessions.length === 0) {
    return
  }

  const session =
    sessions.find((row) => row.requires_check_in !== false) ?? sessions[0]

  const existing = await getVolunteerAttendanceForSession(
    volunteer.id,
    session.id,
  )

  if (existing?.checked_in_at && !existing.checked_out_at) {
    return
  }

  await checkInVolunteer({
    volunteerId: volunteer.id,
    sessionId: session.id,
    staffId,
    occurredAt: new Date().toISOString(),
  })
}
