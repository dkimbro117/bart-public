import {
  PARTICIPANT_FORM_CONSENTS,
  type Participant,
} from './participants'
import { PARTICIPANT_ROSTER_EXPORT, GUARDIAN_CONTACT } from './participantColumns'
import { formatDisplayId, formatParticipantName } from './format'
import { supabase } from './supabase'

export type RosterExportRow = Participant & {
  guardian_email: string | null
  guardian_phone: string | null
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function yesNo(value: boolean | undefined): string {
  return value ? 'Yes' : 'No'
}

export async function fetchRosterExportRows(
  participantIds?: string[],
): Promise<RosterExportRow[]> {
  let query = supabase
    .from('participants')
    .select(PARTICIPANT_ROSTER_EXPORT)
    .order('display_id', { ascending: true })

  if (participantIds && participantIds.length > 0) {
    query = query.in('id', participantIds)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as Participant[]
  const ids = rows.map((row) => row.id)
  const emailMap = new Map<string, string | null>()
  const phoneMap = new Map<string, string | null>()

  if (ids.length > 0) {
    const { data: contacts, error: contactError } = await supabase
      .from('participant_guardian_contacts')
      .select(GUARDIAN_CONTACT)
      .in('participant_id', ids)

    if (contactError) {
      throw new Error(contactError.message)
    }

    for (const contact of contacts ?? []) {
      emailMap.set(contact.participant_id, contact.guardian_email)
      phoneMap.set(contact.participant_id, contact.guardian_phone)
    }
  }

  return rows.map((row) => ({
    ...row,
    guardian_email: emailMap.get(row.id) ?? null,
    guardian_phone: phoneMap.get(row.id) ?? null,
  }))
}

export function rosterExportToCsv(rows: RosterExportRow[]): string {
  const consentHeaders = PARTICIPANT_FORM_CONSENTS.map(({ label }) => label)
  const headers = [
    'Badge #',
    'First name',
    'Last initial',
    'Last name',
    'Grade',
    'School',
    'Shirt size',
    'Age',
    'Enrollment status',
    'How heard',
    'Registration date',
    'CY ref',
    'Guardian name',
    'Guardian email',
    'Guardian phone',
    'Authorized pickups',
    ...consentHeaders,
    'Active',
    'Created at',
  ]

  const lines = [headers.map(csvEscape).join(',')]

  for (const row of rows) {
    const consentValues = PARTICIPANT_FORM_CONSENTS.map(({ key }) =>
      yesNo(row[key]),
    )
    lines.push(
      [
        csvEscape(formatDisplayId(row.display_id)),
        csvEscape(row.first_name),
        csvEscape(row.last_initial),
        csvEscape(row.last_name ?? ''),
        csvEscape(row.grade ?? ''),
        csvEscape(row.school ?? ''),
        csvEscape(row.shirt_size ?? ''),
        csvEscape(row.age != null ? String(row.age) : ''),
        csvEscape(row.enrollment_status ?? ''),
        csvEscape(row.how_heard ?? ''),
        csvEscape(row.registration_date ?? ''),
        csvEscape(row.cy_ref ?? ''),
        csvEscape(row.guardian_name ?? ''),
        csvEscape(row.guardian_email ?? ''),
        csvEscape(row.guardian_phone ?? ''),
        csvEscape((row.authorized_pickups ?? []).join('; ')),
        ...consentValues.map(csvEscape),
        csvEscape(yesNo(row.active)),
        csvEscape(row.created_at ?? ''),
      ].join(','),
    )
  }

  return `${lines.join('\n')}\n`
}

export function downloadRosterExportCsv(
  rows: RosterExportRow[],
  filename = 'bart-roster-export.csv',
): void {
  const csv = rosterExportToCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function rosterExportRowLabel(row: RosterExportRow): string {
  return `${formatDisplayId(row.display_id)} ${formatParticipantName(
    row.first_name,
    row.last_initial,
    row.last_name,
  )}`
}
