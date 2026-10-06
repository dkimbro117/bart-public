import { supabase } from './supabase'
import { formatEventTypeLabel } from './sessions'

export type GuardianPortalChild = {
  participant_id: string
  display_id: number
  first_name: string
  last_initial: string
  last_name: string | null
  active: boolean
  parental_guardian_affirmation: boolean
  media_release: boolean
  youth_code_of_conduct: boolean
  youth_pickup_authorization: boolean
  transportation_permission: boolean
  off_site_permission: boolean
  medical_emergency_form: boolean
  virtual_meeting_performance_agreement: boolean
  bucks_balance: number
  rank: number
  total_boys: number
  earned_this_week: number
  streak: number
  tonight: {
    has_session: boolean
    session_title: string | null
    check_in: boolean
    reading: boolean
    quiz: boolean
  }
  quiz: {
    title: string
    attempted: boolean
    score: number | null
    total: number | null
  } | null
}

export type GuardianPortalUpcomingSession = {
  id: string
  session_date: string
  title: string
  event_type: string
  requires_check_in: boolean
  supports_reading: boolean
}

export type GuardianPortalFamily = {
  guardian_email_masked: string
  label: string | null
  children: GuardianPortalChild[]
  upcoming_sessions: GuardianPortalUpcomingSession[]
  calendar_note: string | null
}

export type GuardianPortalLinkCreated = {
  id: string
  token: string
  guardian_email: string
  child_count: number
  path: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readBool(value: unknown): boolean {
  return value === true
}

function readInt(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function mapTonight(raw: unknown): GuardianPortalChild['tonight'] {
  const row = asRecord(raw)
  if (!row) {
    return {
      has_session: false,
      session_title: null,
      check_in: false,
      reading: false,
      quiz: false,
    }
  }
  const title = readString(row.session_title)
  return {
    has_session: readBool(row.has_session),
    session_title: title || null,
    check_in: readBool(row.check_in),
    reading: readBool(row.reading),
    quiz: readBool(row.quiz),
  }
}

function mapQuiz(raw: unknown): GuardianPortalChild['quiz'] {
  const row = asRecord(raw)
  if (!row) return null
  const title = readString(row.title)
  if (!title) return null
  return {
    title,
    attempted: readBool(row.attempted),
    score: row.score == null ? null : readInt(row.score),
    total: row.total == null ? null : readInt(row.total),
  }
}

function mapChild(raw: unknown): GuardianPortalChild | null {
  const row = asRecord(raw)
  if (!row) return null
  const participantId = readString(row.participant_id)
  const firstName = readString(row.first_name)
  if (!participantId || !firstName) return null

  return {
    participant_id: participantId,
    display_id: readInt(row.display_id),
    first_name: firstName,
    last_initial: readString(row.last_initial) || '?',
    last_name:
      typeof row.last_name === 'string' && row.last_name.trim()
        ? row.last_name.trim()
        : null,
    active: readBool(row.active),
    parental_guardian_affirmation: readBool(row.parental_guardian_affirmation),
    media_release: readBool(row.media_release),
    youth_code_of_conduct: readBool(row.youth_code_of_conduct),
    youth_pickup_authorization: readBool(row.youth_pickup_authorization),
    transportation_permission: readBool(row.transportation_permission),
    off_site_permission: readBool(row.off_site_permission),
    medical_emergency_form: readBool(row.medical_emergency_form),
    virtual_meeting_performance_agreement: readBool(
      row.virtual_meeting_performance_agreement,
    ),
    bucks_balance: readInt(row.bucks_balance),
    rank: readInt(row.rank) || 1,
    total_boys: readInt(row.total_boys),
    earned_this_week: readInt(row.earned_this_week),
    streak: readInt(row.streak),
    tonight: mapTonight(row.tonight),
    quiz: mapQuiz(row.quiz),
  }
}

function mapUpcoming(raw: unknown): GuardianPortalUpcomingSession | null {
  const row = asRecord(raw)
  if (!row) return null
  const id = readString(row.id)
  const title = readString(row.title)
  const sessionDate = readString(row.session_date)
  if (!id || !title || !sessionDate) return null
  return {
    id,
    session_date: sessionDate,
    title,
    event_type: readString(row.event_type) || 'other',
    requires_check_in: readBool(row.requires_check_in),
    supports_reading: readBool(row.supports_reading),
  }
}

export function formatUpcomingSessionDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatUpcomingEventLabel(eventType: string): string {
  return formatEventTypeLabel(eventType)
}

export async function fetchGuardianPortalFamily(
  token: string,
): Promise<GuardianPortalFamily> {
  const { data, error } = await supabase.rpc('guardian_portal_family', {
    p_token: token,
  })

  if (error) {
    const message = error.message || ''
    if (message.includes('INVALID_LINK')) {
      throw new Error('This family link is invalid or has been revoked.')
    }
    throw new Error(message || 'Could not load family view.')
  }

  const record = asRecord(data)
  if (!record) {
    throw new Error('Could not load family view.')
  }

  const childrenRaw = Array.isArray(record.children) ? record.children : []
  const children = childrenRaw
    .map(mapChild)
    .filter((child): child is GuardianPortalChild => child != null)

  const upcomingRaw = Array.isArray(record.upcoming_sessions)
    ? record.upcoming_sessions
    : []
  const upcoming_sessions = upcomingRaw
    .map(mapUpcoming)
    .filter((row): row is GuardianPortalUpcomingSession => row != null)

  return {
    guardian_email_masked: readString(record.guardian_email_masked) || 'guardian',
    label: typeof record.label === 'string' ? record.label : null,
    children,
    upcoming_sessions,
    calendar_note:
      typeof record.calendar_note === 'string' && record.calendar_note.trim()
        ? record.calendar_note.trim()
        : null,
  }
}

export async function createGuardianPortalLink(
  guardianEmail: string,
  label?: string,
): Promise<GuardianPortalLinkCreated> {
  const { data, error } = await supabase.rpc('admin_create_guardian_portal_link', {
    p_guardian_email: guardianEmail.trim(),
    p_label: label?.trim() || null,
  })

  if (error) {
    const message = error.message || ''
    if (message.includes('NO_CHILDREN_FOR_EMAIL')) {
      throw new Error('No active boys are linked to that guardian email.')
    }
    if (message.includes('INVALID_EMAIL')) {
      throw new Error('Enter a valid guardian email.')
    }
    if (message.includes('NOT_AUTHORIZED') || message.includes('42501')) {
      throw new Error('Only admins can create family links.')
    }
    throw new Error(message || 'Could not create family link.')
  }

  const record = asRecord(data)
  if (!record) {
    throw new Error('Could not create family link.')
  }

  return {
    id: readString(record.id),
    token: readString(record.token),
    guardian_email: readString(record.guardian_email),
    child_count: Number(record.child_count) || 0,
    path: readString(record.path) || `/family?t=${readString(record.token)}`,
  }
}

/** Parent or staff: email a private family link if the address is on roster. */
export async function emailFamilyPortalLink(
  guardianEmail: string,
): Promise<{ message: string; status: 'sent' | 'not_found' }> {
  const { data, error } = await supabase.functions.invoke('send-family-link', {
    body: { email: guardianEmail.trim() },
  })

  if (error) {
    const context =
      typeof error === 'object' &&
      error !== null &&
      'context' in error &&
      error.context instanceof Response
        ? error.context
        : null
    let detail = error.message || 'Could not send family link email.'
    if (context) {
      try {
        const payload = (await context.json()) as { error?: string; detail?: string }
        if (typeof payload.error === 'string' && payload.error) {
          detail = payload.detail
            ? `${payload.error} (${payload.detail})`
            : payload.error
        }
      } catch {
        // keep detail from error.message
      }
    }
    throw new Error(detail)
  }

  const record = asRecord(data)
  if (record && typeof record.error === 'string' && record.error) {
    throw new Error(record.error)
  }

  const status =
    record && record.status === 'not_found' ? 'not_found' : 'sent'

  const message =
    record && typeof record.message === 'string' && record.message
      ? record.message
      : status === 'not_found'
        ? 'We could not find that email on any active boy’s roster.'
        : 'We emailed a private family link. Check inbox and spam.'

  return { message, status }
}

export function familyLinkAbsoluteUrl(path: string): string {
  if (typeof window === 'undefined') {
    return path
  }
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}
