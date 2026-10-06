import { formatSessionLabel } from './dates'
import { supabase } from './supabase'
import type { Tables } from '../types/database'

export type VolunteerHoursSessionRow = {
  attendanceId: string
  sessionId: string
  sessionTitle: string
  sessionDate: string
  checkedInAt: string
  checkedOutAt: string | null
  hours: number | null
  isOpen: boolean
}

export type VolunteerHoursSummary = {
  volunteerId: string
  displayId: number
  fullName: string
  totalHours: number
  openSessionCount: number
  sessions: VolunteerHoursSessionRow[]
}

type AttendanceReportRow = Tables<'volunteer_attendance'> & {
  volunteers: Pick<
    Tables<'volunteers'>,
    'id' | 'display_id' | 'full_name'
  > | null
  sessions: Pick<Tables<'sessions'>, 'id' | 'title' | 'session_date'> | null
}

const MS_PER_HOUR = 60 * 60 * 1000

export function hoursBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime()
  const end = new Date(checkOut).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 0
  }
  return (end - start) / MS_PER_HOUR
}

export function formatHours(hours: number): string {
  return hours.toFixed(2)
}

export async function fetchVolunteerHoursReport(
  startDate: string,
  endDate: string,
): Promise<VolunteerHoursSummary[]> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('id, title, session_date')
    .gte('session_date', startDate)
    .lte('session_date', endDate)
    .order('session_date', { ascending: true })

  if (sessionsError) {
    throw new Error(sessionsError.message)
  }

  if (!sessions || sessions.length === 0) {
    return []
  }

  const sessionIds = sessions.map((session) => session.id)
  const sessionById = new Map(sessions.map((session) => [session.id, session]))

  const { data, error } = await supabase
    .from('volunteer_attendance')
    .select(
      'id, volunteer_id, session_id, checked_in_at, checked_out_at, volunteers (id, display_id, full_name)',
    )
    .in('session_id', sessionIds)
    .not('checked_in_at', 'is', null)
    .order('checked_in_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const byVolunteer = new Map<string, VolunteerHoursSummary>()

  for (const row of (data ?? []) as AttendanceReportRow[]) {
    const volunteer = row.volunteers
    const session = sessionById.get(row.session_id)
    if (!volunteer || !session || !row.checked_in_at) {
      continue
    }

    const isOpen = !row.checked_out_at
    const hours = isOpen
      ? null
      : hoursBetween(row.checked_in_at, row.checked_out_at!)

    const sessionRow: VolunteerHoursSessionRow = {
      attendanceId: row.id,
      sessionId: session.id,
      sessionTitle: session.title,
      sessionDate: session.session_date,
      checkedInAt: row.checked_in_at,
      checkedOutAt: row.checked_out_at,
      hours,
      isOpen,
    }

    const existing = byVolunteer.get(volunteer.id) ?? {
      volunteerId: volunteer.id,
      displayId: volunteer.display_id,
      fullName: volunteer.full_name,
      totalHours: 0,
      openSessionCount: 0,
      sessions: [],
    }

    existing.sessions.push(sessionRow)
    if (isOpen) {
      existing.openSessionCount += 1
    } else if (hours !== null) {
      existing.totalHours += hours
    }

    byVolunteer.set(volunteer.id, existing)
  }

  return [...byVolunteer.values()].sort(
    (a, b) => a.displayId - b.displayId,
  )
}

export function volunteerHoursToCsv(rows: VolunteerHoursSummary[]): string {
  const header = [
    'Volunteer',
    'Display ID',
    'Session Date',
    'Session Title',
    'Checked In',
    'Checked Out',
    'Hours',
    'Status',
  ]

  const lines = [header.join(',')]

  for (const volunteer of rows) {
    for (const session of volunteer.sessions) {
      const values = [
        csvEscape(volunteer.fullName),
        `#${String(volunteer.displayId).padStart(4, '0')}`,
        session.sessionDate,
        csvEscape(session.sessionTitle),
        session.checkedInAt,
        session.checkedOutAt ?? '',
        session.isOpen ? '' : formatHours(session.hours ?? 0),
        session.isOpen ? 'open' : 'complete',
      ]
      lines.push(values.join(','))
    }

    lines.push(
      [
        csvEscape(`${volunteer.fullName} (total)`),
        `#${String(volunteer.displayId).padStart(4, '0')}`,
        '',
        '',
        '',
        '',
        formatHours(volunteer.totalHours),
        volunteer.openSessionCount > 0
          ? `${volunteer.openSessionCount} open`
          : 'complete',
      ].join(','),
    )
  }

  return lines.join('\n')
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function downloadVolunteerHoursCsv(
  rows: VolunteerHoursSummary[],
  startDate: string,
  endDate: string,
): void {
  const csv = volunteerHoursToCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `volunteer-hours-${startDate}-to-${endDate}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function formatVolunteerSessionLabel(
  title: string,
  sessionDate: string,
): string {
  return formatSessionLabel(title, sessionDate)
}
