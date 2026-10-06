import { formatDisplayId, formatParticipantName } from './format'
import { PARTICIPANT_CHECKOUT, PARTICIPANT_SCAN } from './participantColumns'
import type { Participant } from './participants'
import type { SignaturePayload } from './signatures'
import {
  attendanceKey,
  db,
  type CachedParticipant,
  type LocalAttendance,
} from './db'
import {
  enqueue,
  hasCachedRoster,
  isFreshPickupCache,
  isOnline,
  pingServer,
} from './sync'
import { supabase } from './supabase'
import type { Tables } from '../types/database'

export type ProgramSession = Tables<'sessions'>
export type Attendance = Tables<'attendance'>

export class RosterNotCachedError extends Error {
  constructor() {
    super(
      'Roster not cached on this device. Go online and tap Refresh roster in the menu.',
    )
    this.name = 'RosterNotCachedError'
  }
}

export function isRosterNotCachedError(
  error: unknown,
): error is RosterNotCachedError {
  return error instanceof RosterNotCachedError
}

export function normalizeQrToken(value: string): string {
  return value.trim()
}

export function localToAttendance(local: LocalAttendance): Attendance {
  return {
    id: '',
    participant_id: local.participant_id,
    session_id: local.session_id,
    checked_in_at: local.checked_in_at ?? null,
    checked_out_at: local.checked_out_at ?? null,
    pickup_name: local.pickup_name ?? null,
    checked_in_by: null,
    checked_out_by: null,
  }
}

function cachedToParticipant(
  cached: CachedParticipant,
  pickup?: { guardian_name: string; authorized_pickups: string[] } | null,
): Participant {
  return {
    id: cached.id,
    display_id: cached.display_id,
    qr_token: cached.qr_token,
    first_name: cached.first_name,
    last_initial: cached.last_initial,
    last_name: cached.last_name ?? null,
    active: cached.active,
    guardian_name: pickup?.guardian_name ?? '',
    authorized_pickups: pickup?.authorized_pickups ?? [],
    created_at: null,
  }
}

async function lookupCachedParticipant(
  qrToken: string,
  requirePickupInfo: boolean,
): Promise<Participant | null> {
  const cached = await db.participants
    .where('qr_token')
    .equals(normalizeQrToken(qrToken))
    .first()

  if (!cached) {
    return null
  }

  const pickup = await db.participant_pickups.get(cached.id)
  if (requirePickupInfo) {
    if (!pickup || !isFreshPickupCache(pickup.cached_at)) {
      if (!isOnline()) {
        throw new RosterNotCachedError()
      }
      return null
    }
  }

  return cachedToParticipant(cached, pickup)
}

export async function lookupParticipantByQrToken(
  qrToken: string,
): Promise<Participant | null> {
  const cached = await lookupCachedParticipant(qrToken, false)
  if (cached) {
    return cached
  }

  if (!isOnline()) {
    if (!(await hasCachedRoster())) {
      throw new RosterNotCachedError()
    }
    return null
  }

  const { data, error } = await supabase
    .from('participants')
    .select(PARTICIPANT_SCAN)
    .eq('qr_token', normalizeQrToken(qrToken))
    .eq('active', true)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  return cachedToParticipant(data)
}

export async function lookupParticipantForCheckout(
  qrToken: string,
): Promise<Participant | null> {
  const cached = await lookupCachedParticipant(qrToken, true)
  if (cached) {
    return cached
  }

  if (!isOnline()) {
    if (!(await hasCachedRoster())) {
      throw new RosterNotCachedError()
    }
    throw new RosterNotCachedError()
  }

  const { data, error } = await supabase
    .from('participants')
    .select(PARTICIPANT_CHECKOUT)
    .eq('qr_token', normalizeQrToken(qrToken))
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
    created_at: null,
  }
}

export async function loadCachedParticipantsForManualSearch(): Promise<
  Participant[]
> {
  const cached = await db.participants.orderBy('display_id').toArray()
  return cached.map((row) => cachedToParticipant(row))
}

export async function loadCachedParticipantsForCheckout(): Promise<
  Participant[]
> {
  const [cached, pickups] = await Promise.all([
    db.participants.orderBy('display_id').toArray(),
    db.participant_pickups.toArray(),
  ])
  const pickupById = new Map(pickups.map((row) => [row.id, row]))
  return cached.map((row) =>
    cachedToParticipant(row, pickupById.get(row.id) ?? null),
  )
}

export async function getAttendanceForSession(
  participantId: string,
  sessionId: string,
): Promise<Attendance | null> {
  const key = attendanceKey(participantId, sessionId)
  const local = await db.attendance.get(key)

  if (!isOnline()) {
    return local ? localToAttendance(local) : null
  }

  const reachable = await pingServer()
  if (!reachable) {
    return local ? localToAttendance(local) : null
  }

  const { data, error } = await supabase
    .from('attendance')
    .select(
      'id, participant_id, session_id, checked_in_at, checked_out_at, pickup_name, checked_in_by, checked_out_by',
    )
    .eq('participant_id', participantId)
    .eq('session_id', sessionId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (data && local) {
    const localCheckedIn =
      local.checked_in_at &&
      (!data.checked_in_at || local.checked_in_at > data.checked_in_at)
    const localCheckedOut =
      local.checked_out_at &&
      (!data.checked_out_at || local.checked_out_at > data.checked_out_at)

    if (localCheckedIn || localCheckedOut) {
      return {
        ...data,
        checked_in_at: localCheckedIn
          ? local.checked_in_at!
          : data.checked_in_at,
        checked_out_at: localCheckedOut
          ? local.checked_out_at!
          : data.checked_out_at,
        pickup_name: localCheckedOut
          ? (local.pickup_name ?? data.pickup_name)
          : data.pickup_name,
      }
    }
  }

  return data ?? (local ? localToAttendance(local) : null)
}

export async function checkInParticipant({
  participantId,
  sessionId,
  staffId,
  occurredAt,
  signerName,
  signature,
}: {
  participantId: string
  sessionId: string
  staffId: string
  occurredAt: string
  signerName?: string
  signature?: SignaturePayload
}): Promise<Attendance> {
  await enqueue({
    type: 'check_in',
    participant_id: participantId,
    session_id: sessionId,
    occurred_at: occurredAt,
    staff_id: staffId,
    signer_name: signerName ?? null,
    signature_kind: signerName && signature ? 'dropoff' : null,
    signature_json: signature ?? null,
  })

  const local = await db.attendance.get(attendanceKey(participantId, sessionId))
  if (!local?.checked_in_at) {
    throw new Error('Check-in was queued but local attendance was not updated.')
  }

  return localToAttendance(local)
}

export function parseDisplayIdQuery(query: string): number | null {
  const normalized = query.trim().replace(/^#/, '')
  if (!/^\d+$/.test(normalized)) {
    return null
  }

  return Number.parseInt(normalized, 10)
}

export function matchesParticipantLookup(
  participant: Participant,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return false

  const displayId = parseDisplayIdQuery(query)
  if (displayId !== null && participant.display_id === displayId) {
    return true
  }

  const formatted = formatParticipantName(
    participant.first_name,
    participant.last_initial,
    participant.last_name,
  ).toLowerCase()

  const lastName = participant.last_name?.trim().toLowerCase() ?? ''

  return (
    formatted.includes(normalized) ||
    participant.first_name.toLowerCase().includes(normalized) ||
    participant.last_initial.toLowerCase() === normalized ||
    (lastName.length > 0 && lastName.includes(normalized)) ||
    `${participant.first_name} ${participant.last_initial}`
      .toLowerCase()
      .includes(normalized) ||
    (lastName.length > 0 &&
      `${participant.first_name} ${lastName}`.includes(normalized)) ||
    formatDisplayId(participant.display_id).toLowerCase().includes(normalized)
  )
}
