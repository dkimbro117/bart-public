import type { Participant } from './participants'
import { PARTICIPANT_ROSTER_LIVE } from './participantColumns'
import { db } from './db'
import { isOnline, pingServer } from './sync'
import { supabase } from './supabase'
import type { Attendance } from './checkIn'
type LiveParticipant = Pick<
  Participant,
  'id' | 'display_id' | 'first_name' | 'last_initial' | 'active'
> & {
  last_name?: string | null
}

export type AttendanceWithParticipant = Attendance & {
  participants: LiveParticipant
}

type AttendanceLiveRow = Attendance & {
  participants: LiveParticipant | null
}

async function fetchLocalSessionAttendance(
  sessionId: string,
): Promise<AttendanceWithParticipant[]> {
  const [attendanceRows, participants, pickups] = await Promise.all([
    db.attendance.where('session_id').equals(sessionId).toArray(),
    db.participants.toArray(),
    db.participant_pickups.toArray(),
  ])

  const participantById = new Map(participants.map((row) => [row.id, row]))
  const pickupById = new Map(pickups.map((row) => [row.id, row]))

  return attendanceRows
    .filter((row) => row.checked_in_at)
    .map((row) => {
      const cached = participantById.get(row.participant_id)
      const participantsRow: LiveParticipant = cached
        ? {
            id: cached.id,
            display_id: cached.display_id,
            first_name: cached.first_name,
            last_initial: cached.last_initial,
            last_name: cached.last_name ?? null,
            active: cached.active,
          }
        : {
            id: row.participant_id,
            display_id: 0,
            first_name: pickupById.get(row.participant_id)
              ? 'Unknown'
              : 'Unknown',
            last_initial: '?',
            last_name: null,
            active: true,
          }

      return {
        id: '',
        participant_id: row.participant_id,
        session_id: row.session_id,
        checked_in_at: row.checked_in_at ?? null,
        checked_out_at: row.checked_out_at ?? null,
        pickup_name: row.pickup_name ?? null,
        checked_in_by: null,
        checked_out_by: null,
        participants: participantsRow,
      }
    })
}

function mapLiveAttendanceRow(row: AttendanceLiveRow): AttendanceWithParticipant | null {
  if (!row.participants) {
    return null
  }

  return {
    id: row.id,
    participant_id: row.participant_id,
    session_id: row.session_id,
    checked_in_at: row.checked_in_at,
    checked_out_at: row.checked_out_at,
    pickup_name: row.pickup_name,
    checked_in_by: row.checked_in_by,
    checked_out_by: row.checked_out_by,
    participants: row.participants,
  }
}

export async function fetchSessionAttendance(
  sessionId: string,
): Promise<AttendanceWithParticipant[]> {
  if (isOnline() && (await pingServer())) {
    const { data, error } = await supabase
      .from('attendance')
      .select(`*, participants (${PARTICIPANT_ROSTER_LIVE})`)
      .eq('session_id', sessionId)
      .order('checked_in_at', { ascending: true, nullsFirst: false })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? [])
      .map((row) => mapLiveAttendanceRow(row as AttendanceLiveRow))
      .filter((row): row is AttendanceWithParticipant => row !== null)
  }

  return fetchLocalSessionAttendance(sessionId)
}

export function splitAttendance(rows: AttendanceWithParticipant[]) {
  const checkedIn = rows.filter(
    (row) => row.checked_in_at && !row.checked_out_at,
  )
  const checkedOut = rows.filter((row) => row.checked_out_at)

  const byDisplayId = (a: AttendanceWithParticipant, b: AttendanceWithParticipant) =>
    a.participants.display_id - b.participants.display_id

  return {
    checkedIn: [...checkedIn].sort(byDisplayId),
    checkedOut: [...checkedOut].sort(byDisplayId),
  }
}

export type AttendanceCounts = {
  checkedIn: number
  checkedOut: number
}

function countAttendanceRows(
  rows: Array<{
    checked_in_at?: string | null
    checked_out_at?: string | null
  }>,
): AttendanceCounts {
  let checkedIn = 0
  let checkedOut = 0

  for (const row of rows) {
    if (!row.checked_in_at) {
      continue
    }
    if (row.checked_out_at) {
      checkedOut += 1
    } else {
      checkedIn += 1
    }
  }

  return { checkedIn, checkedOut }
}

async function fetchLocalSessionAttendanceCounts(
  sessionId: string,
): Promise<AttendanceCounts> {
  const rows = await db.attendance
    .where('session_id')
    .equals(sessionId)
    .toArray()

  return countAttendanceRows(rows)
}

export async function fetchSessionAttendanceCounts(
  sessionId: string,
): Promise<AttendanceCounts> {
  if (isOnline() && (await pingServer())) {
    const { data, error } = await supabase
      .from('attendance')
      .select('checked_in_at, checked_out_at')
      .eq('session_id', sessionId)
      .not('checked_in_at', 'is', null)

    if (error) {
      throw new Error(error.message)
    }

    return countAttendanceRows(data ?? [])
  }

  return fetchLocalSessionAttendanceCounts(sessionId)
}
