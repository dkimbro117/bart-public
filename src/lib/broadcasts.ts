import { formatSessionLabel } from './dates'
import { formatDisplayId, formatParticipantName } from './format'
import { GUARDIAN_CONTACT, PARTICIPANT_ROSTER_LIST } from './participantColumns'
import { supabase } from './supabase'
import type { Tables } from '../types/database'

export type Broadcast = Tables<'broadcasts'>

export type BroadcastAudienceType = 'all' | 'session' | 'participants'

export type BroadcastAudience =
  | { type: 'all' }
  | { type: 'session'; session_id: string }
  | { type: 'participants'; participant_ids: string[] }

export type BroadcastRecipientPreview = {
  participant_id: string
  display_id: number
  participant_name: string
  guardian_name: string
  guardian_email: string | null
}

export type BroadcastRecipientResolution = {
  audienceLabel: string
  rawRecipients: BroadcastRecipientPreview[]
  uniqueEmailCount: number
  skippedNoEmailCount: number
  duplicateEmailsMerged: number
}

export type BroadcastRecipientResult = {
  guardian_email: string | null
  guardian_name: string | null
  participant_names: string[]
  status: 'sent' | 'failed' | 'skipped_no_email'
  error?: string
}

export type SendBroadcastResult = {
  broadcast_id: string
  audience: string
  skipped_no_email: number
  duplicate_emails_merged: number
  sent: number
  failed: number
  results: BroadcastRecipientResult[]
}

type ParticipantPickerRow = {
  id: string
  display_id: number
  first_name: string
  last_initial: string
  last_name: string | null
  guardian_name: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function participantIdsForSession(sessionId: string): Promise<string[]> {
  const { data: attendanceRows, error: attendanceError } = await supabase
    .from('attendance')
    .select('participant_id')
    .eq('session_id', sessionId)
    .not('checked_in_at', 'is', null)

  if (attendanceError) {
    throw new Error(attendanceError.message)
  }

  const attendedIds = (attendanceRows ?? []).map((row) => row.participant_id)
  if (attendedIds.length > 0) {
    return attendedIds
  }

  const { data: activeRows, error: activeError } = await supabase
    .from('participants')
    .select('id')
    .eq('active', true)

  if (activeError) {
    throw new Error(activeError.message)
  }

  return (activeRows ?? []).map((row) => row.id)
}

export async function describeBroadcastAudience(
  audience: BroadcastAudience,
): Promise<string> {
  if (audience.type === 'all') {
    return 'All active guardians'
  }

  if (audience.type === 'participants') {
    const count = audience.participant_ids.length
    return `Selected guardians (${count} boy${count === 1 ? '' : 's'})`
  }

  const { data: session, error } = await supabase
    .from('sessions')
    .select('title, session_date')
    .eq('id', audience.session_id)
    .single()

  if (error || !session) {
    throw new Error('Session not found for audience filter.')
  }

  const participantIds = await participantIdsForSession(audience.session_id)
  const { count: attendedCount } = await supabase
    .from('attendance')
    .select('participant_id', { count: 'exact', head: true })
    .eq('session_id', audience.session_id)
    .not('checked_in_at', 'is', null)

  const sessionLabel = formatSessionLabel(session.title, session.session_date)
  if ((attendedCount ?? 0) > 0) {
    return `Guardians of boys who attended: ${sessionLabel}`
  }

  return `Guardians of active boys (upcoming session: ${sessionLabel}; ${participantIds.length} on roster)`
}

export async function fetchParticipantPickerRows(): Promise<ParticipantPickerRow[]> {
  const { data, error } = await supabase
    .from('participants')
    .select(PARTICIPANT_ROSTER_LIST)
    .eq('active', true)
    .order('display_id', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    display_id: row.display_id,
    first_name: row.first_name,
    last_initial: row.last_initial,
    last_name: row.last_name ?? null,
    guardian_name: '',
  }))
}

async function fetchGuardianEmails(
  participantIds: string[],
): Promise<Map<string, string | null>> {
  if (participantIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabase
    .from('participant_guardian_contacts')
    .select(GUARDIAN_CONTACT)
    .in('participant_id', participantIds)

  if (error) {
    throw new Error(error.message)
  }

  const map = new Map<string, string | null>()
  for (const row of data ?? []) {
    map.set(row.participant_id, row.guardian_email)
  }
  return map
}

export async function resolveBroadcastRecipients(
  audience: BroadcastAudience,
): Promise<BroadcastRecipientResolution> {
  const audienceLabel = await describeBroadcastAudience(audience)

  let participantIds: string[] | null = null
  if (audience.type === 'session') {
    participantIds = await participantIdsForSession(audience.session_id)
  } else if (audience.type === 'participants') {
    participantIds = audience.participant_ids
  }

  let query = supabase
    .from('participants')
    .select('id, display_id, first_name, last_initial, last_name, guardian_name')
    .eq('active', true)
    .order('display_id', { ascending: true })

  if (participantIds != null) {
    if (participantIds.length === 0) {
      return {
        audienceLabel,
        rawRecipients: [],
        uniqueEmailCount: 0,
        skippedNoEmailCount: 0,
        duplicateEmailsMerged: 0,
      }
    }
    query = query.in('id', participantIds)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  const rows = data ?? []
  const guardianEmails = await fetchGuardianEmails(rows.map((row) => row.id))

  const rawRecipients: BroadcastRecipientPreview[] = rows.map((row) => ({
    participant_id: row.id,
    display_id: row.display_id,
    participant_name: formatParticipantName(
      row.first_name,
      row.last_initial,
      row.last_name,
    ),
    guardian_name: row.guardian_name,
    guardian_email: guardianEmails.get(row.id) ?? null,
  }))

  const uniqueEmails = new Set<string>()
  let skippedNoEmailCount = 0
  let duplicateEmailsMerged = 0

  for (const recipient of rawRecipients) {
    const email = recipient.guardian_email?.trim()
    if (!email) {
      skippedNoEmailCount += 1
      continue
    }

    const normalized = normalizeEmail(email)
    if (uniqueEmails.has(normalized)) {
      duplicateEmailsMerged += 1
      continue
    }

    uniqueEmails.add(normalized)
  }

  return {
    audienceLabel,
    rawRecipients,
    uniqueEmailCount: uniqueEmails.size,
    skippedNoEmailCount,
    duplicateEmailsMerged,
  }
}

export async function fetchBroadcastHistory(): Promise<Broadcast[]> {
  const { data, error } = await supabase
    .from('broadcasts')
    .select(
      'id, subject, body_html, audience, sent_by, sent_at, recipient_count, session_id, created_at',
    )
    .order('sent_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

function isSendBroadcastResult(value: unknown): value is SendBroadcastResult {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as SendBroadcastResult
  return typeof candidate.broadcast_id === 'string' && Array.isArray(candidate.results)
}

export async function sendBroadcast(input: {
  subject: string
  bodyMarkdown: string
  audience: BroadcastAudience
}): Promise<SendBroadcastResult> {
  const { data, error } = await supabase.functions.invoke('send-broadcast', {
    body: {
      subject: input.subject,
      body_markdown: input.bodyMarkdown,
      audience: input.audience,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const message =
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'Failed to send broadcast.'
    throw new Error(message)
  }

  if (!isSendBroadcastResult(data)) {
    throw new Error('Unexpected response from send-broadcast.')
  }

  return data
}

export function formatRecipientLabel(recipient: BroadcastRecipientPreview): string {
  return `${recipient.participant_name} (${formatDisplayId(recipient.display_id)})`
}
