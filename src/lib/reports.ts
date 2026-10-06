import { formatSessionLabel } from './dates'
import { formatDisplayId, formatParticipantName } from './format'
import { PARTICIPANT_SESSION_SUMMARY } from './reportColumns'
import { supabase } from './supabase'
import type { Tables } from '../types/database'

export type ParticipantSessionSummary = Tables<'participant_session_summary'>

export type SessionReportSummary = {
  headcount: number
  boysWithActivity: number
  avgMinutes: number
  avgQuizPercent: number | null
  quizAttemptCount: number
}

export type TrendDirection = 'up' | 'down' | 'same' | 'none' | 'first'

export type ParticipantSessionTrends = {
  attendance: TrendDirection
  minutes: TrendDirection
  quizPercent: TrendDirection
}

export type ParticipantSessionRow = ParticipantSessionSummary & {
  trends: ParticipantSessionTrends
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function quizPercent(
  row: Pick<ParticipantSessionSummary, 'quiz_score' | 'quiz_total'>,
): number | null {
  if (
    row.quiz_score == null ||
    row.quiz_total == null ||
    row.quiz_total <= 0
  ) {
    return null
  }

  return Math.round((row.quiz_score / row.quiz_total) * 100)
}

export function formatQuizResult(
  row: Pick<ParticipantSessionSummary, 'quiz_score' | 'quiz_total'>,
): string {
  if (row.quiz_score == null || row.quiz_total == null) {
    return '—'
  }

  const percent = quizPercent(row)
  return percent == null ? '—' : `${row.quiz_score}/${row.quiz_total} (${percent}%)`
}

export function formatAttendanceStatus(
  row: Pick<ParticipantSessionSummary, 'attended' | 'checked_out'>,
): string {
  if (!row.attended) {
    return 'Absent'
  }
  if (row.checked_out) {
    return 'Checked out'
  }
  return 'Checked in'
}

export async function fetchSessionReport(
  sessionId: string,
): Promise<ParticipantSessionSummary[]> {
  const { data, error } = await supabase
    .from('participant_session_summary')
    .select(PARTICIPANT_SESSION_SUMMARY)
    .eq('session_id', sessionId)
    .order('display_id', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function fetchParticipantReport(
  participantId: string,
): Promise<ParticipantSessionSummary[]> {
  const { data, error } = await supabase
    .from('participant_session_summary')
    .select(PARTICIPANT_SESSION_SUMMARY)
    .eq('participant_id', participantId)
    .order('session_date', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export function summarizeSessionReport(
  rows: ParticipantSessionSummary[],
): SessionReportSummary {
  const headcount = rows.filter((row) => row.attended).length
  const avgMinutes =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + (row.minutes_read ?? 0), 0) / rows.length
      : 0

  const quizRows = rows.filter(
    (row) => row.quiz_total != null && row.quiz_total > 0 && row.quiz_score != null,
  )
  const avgQuizPercent =
    quizRows.length > 0
      ? quizRows.reduce((sum, row) => sum + (quizPercent(row) ?? 0), 0) /
        quizRows.length
      : null

  return {
    headcount,
    boysWithActivity: rows.length,
    avgMinutes,
    avgQuizPercent,
    quizAttemptCount: quizRows.length,
  }
}

function compareNumberTrend(
  current: number,
  previous: number,
): TrendDirection {
  if (current > previous) {
    return 'up'
  }
  if (current < previous) {
    return 'down'
  }
  return 'same'
}

function compareAttendanceTrend(
  current: boolean | null,
  previous: boolean | null,
): TrendDirection {
  const currentAttended = Boolean(current)
  const previousAttended = Boolean(previous)
  if (currentAttended === previousAttended) {
    return 'same'
  }
  return currentAttended ? 'up' : 'down'
}

function compareQuizTrend(
  current: ParticipantSessionSummary,
  previous: ParticipantSessionSummary,
): TrendDirection {
  const currentPercent = quizPercent(current)
  const previousPercent = quizPercent(previous)

  if (currentPercent == null && previousPercent == null) {
    return 'none'
  }
  if (currentPercent == null) {
    return 'down'
  }
  if (previousPercent == null) {
    return 'up'
  }

  return compareNumberTrend(currentPercent, previousPercent)
}

export function withParticipantTrends(
  rows: ParticipantSessionSummary[],
): ParticipantSessionRow[] {
  const chronological = [...rows].sort((left, right) =>
    (left.session_date ?? '').localeCompare(right.session_date ?? ''),
  )

  return chronological.map((row, index) => {
    if (index === 0) {
      return {
        ...row,
        trends: {
          attendance: 'first' as const,
          minutes: 'first' as const,
          quizPercent: (quizPercent(row) == null ? 'none' : 'first') as TrendDirection,
        },
      }
    }

    const previous = chronological[index - 1]

    return {
      ...row,
      trends: {
        attendance: compareAttendanceTrend(row.attended, previous.attended),
        minutes: compareNumberTrend(
          row.minutes_read ?? 0,
          previous.minutes_read ?? 0,
        ),
        quizPercent: compareQuizTrend(row, previous),
      },
    }
  }).reverse()
}

export async function fetchGuardianEmailMap(
  participantIds: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  if (participantIds.length === 0) {
    return map
  }

  const { data, error } = await supabase
    .from('participant_guardian_contacts')
    .select('participant_id, guardian_email')
    .in('participant_id', participantIds)

  if (error) {
    throw new Error(error.message)
  }

  for (const row of data ?? []) {
    map.set(row.participant_id, row.guardian_email)
  }

  return map
}

export function sessionReportToCsv(
  rows: ParticipantSessionSummary[],
  sessionLabel: string,
  guardianEmails?: Map<string, string | null>,
): string {
  const includeGuardianEmail = guardianEmails != null
  const header = [
    'Session',
    'Display ID',
    'Name',
    'Guardian',
    ...(includeGuardianEmail ? ['Guardian Email'] : []),
    'Attended',
    'Checked Out',
    'Pickup',
    'Minutes Read',
    'Quiz Score',
    'Quiz Total',
    'Quiz %',
  ]

  const lines = [header.join(',')]

  for (const row of rows) {
    const percent = quizPercent(row)
    const participantId = row.participant_id ?? ''
    lines.push(
      [
        csvEscape(sessionLabel),
        formatDisplayId(row.display_id ?? 0),
        csvEscape(
          formatParticipantName(row.first_name ?? '', row.last_initial ?? ''),
        ),
        csvEscape(row.guardian_name ?? ''),
        ...(includeGuardianEmail
          ? [csvEscape(guardianEmails?.get(participantId)?.trim() ?? '')]
          : []),
        row.attended ? 'yes' : 'no',
        row.checked_out ? 'yes' : 'no',
        csvEscape(row.pickup_name ?? ''),
        String(row.minutes_read ?? 0),
        row.quiz_score == null ? '' : String(row.quiz_score),
        row.quiz_total == null ? '' : String(row.quiz_total),
        percent == null ? '' : String(percent),
      ].join(','),
    )
  }

  const summary = summarizeSessionReport(rows)
  lines.push(
    [
      csvEscape(`${sessionLabel} (totals)`),
      '',
      '',
      '',
      ...(includeGuardianEmail ? [''] : []),
      String(summary.headcount),
      '',
      '',
      summary.avgMinutes.toFixed(1),
      '',
      '',
      summary.avgQuizPercent == null ? '' : summary.avgQuizPercent.toFixed(1),
    ].join(','),
  )

  return lines.join('\n')
}

export function participantReportToCsv(
  rows: ParticipantSessionRow[],
  participantLabel: string,
): string {
  const header = [
    'Participant',
    'Session Date',
    'Session',
    'Attended',
    'Checked Out',
    'Minutes Read',
    'Quiz Score',
    'Quiz Total',
    'Quiz %',
    'Attendance Trend',
    'Minutes Trend',
    'Quiz Trend',
  ]

  const lines = [header.join(',')]

  for (const row of rows) {
    const percent = quizPercent(row)
    lines.push(
      [
        csvEscape(participantLabel),
        row.session_date ?? '',
        csvEscape(row.session_title ?? ''),
        row.attended ? 'yes' : 'no',
        row.checked_out ? 'yes' : 'no',
        String(row.minutes_read ?? 0),
        row.quiz_score == null ? '' : String(row.quiz_score),
        row.quiz_total == null ? '' : String(row.quiz_total),
        percent == null ? '' : String(percent),
        row.trends.attendance,
        row.trends.minutes,
        row.trends.quizPercent,
      ].join(','),
    )
  }

  return lines.join('\n')
}

export function downloadSessionReportCsv(
  rows: ParticipantSessionSummary[],
  sessionTitle: string,
  sessionDate: string,
  guardianEmails?: Map<string, string | null>,
): void {
  const label = formatSessionLabel(sessionTitle, sessionDate)
  const slug = sessionDate
  downloadCsv(
    `session-report-${slug}.csv`,
    sessionReportToCsv(rows, label, guardianEmails),
  )
}

export function downloadParticipantReportCsv(
  rows: ParticipantSessionRow[],
  participantLabel: string,
  displayId: number,
): void {
  downloadCsv(
    `participant-report-${displayId}.csv`,
    participantReportToCsv(rows, participantLabel),
  )
}
