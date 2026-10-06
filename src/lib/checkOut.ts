import type { Participant } from './participants'
import { attendanceKey, db } from './db'
import type { Attendance } from './checkIn'
import { localToAttendance } from './checkIn'
import { enqueue } from './sync'
import type { SignaturePayload } from './signatures'

export function getPickupOptions(participant: Participant): string[] {
  const seen = new Set<string>()

  return [participant.guardian_name, ...participant.authorized_pickups].filter(
    (name) => {
      const trimmed = name.trim()
      const key = trimmed.toLowerCase()
      if (!key || seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    },
  )
}

export async function checkOutParticipant({
  participantId,
  sessionId,
  staffId,
  pickupName,
  occurredAt,
  signature,
}: {
  participantId: string
  sessionId: string
  staffId: string
  pickupName: string
  occurredAt: string
  signature?: SignaturePayload
}): Promise<Attendance> {
  await enqueue({
    type: 'check_out',
    participant_id: participantId,
    session_id: sessionId,
    occurred_at: occurredAt,
    staff_id: staffId,
    pickup_name: pickupName,
    signer_name: pickupName,
    signature_kind: signature ? 'pickup' : null,
    signature_json: signature ?? null,
  })

  const local = await db.attendance.get(attendanceKey(participantId, sessionId))
  if (!local?.checked_out_at) {
    throw new Error('Check-out was queued but local attendance was not updated.')
  }

  return localToAttendance(local)
}
