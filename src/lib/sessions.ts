import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export type Session = Tables<'sessions'>
export type SessionInsert = TablesInsert<'sessions'>
export type SessionUpdate = TablesUpdate<'sessions'>

export const SESSION_EVENT_TYPES = [
  'reading_session',
  'field_trip',
  'gala',
  'other',
] as const

export type SessionEventType = (typeof SESSION_EVENT_TYPES)[number]

export type SessionFormValues = {
  title: string
  session_date: string
  event_type: SessionEventType
  requires_check_in: boolean
  supports_reading: boolean
}

export const SESSION_LIST_COLUMNS =
  'id, title, session_date, event_type, requires_check_in, supports_reading, created_at' as const

export const SESSION_CACHE_COLUMNS =
  'id, title, session_date, event_type, requires_check_in, supports_reading' as const

const EVENT_TYPE_LABELS: Record<SessionEventType, string> = {
  reading_session: 'Reading session',
  field_trip: 'Field trip',
  gala: 'Gala',
  other: 'Other',
}

export function isSessionEventType(value: string): value is SessionEventType {
  return (SESSION_EVENT_TYPES as readonly string[]).includes(value)
}

export function formatEventTypeLabel(eventType: string): string {
  if (isSessionEventType(eventType)) {
    return EVENT_TYPE_LABELS[eventType]
  }
  return eventType
}

/** Defaults when creating a new event of the given type. */
export function defaultsForEventType(
  eventType: SessionEventType,
): Pick<SessionFormValues, 'requires_check_in' | 'supports_reading'> {
  if (eventType === 'reading_session') {
    return { requires_check_in: true, supports_reading: true }
  }
  return { requires_check_in: true, supports_reading: false }
}

export function emptySessionFormValues(
  sessionDate: string,
): SessionFormValues {
  return {
    title: '',
    session_date: sessionDate,
    event_type: 'reading_session',
    requires_check_in: true,
    supports_reading: true,
  }
}

export function sessionToFormValues(session: Session): SessionFormValues {
  return {
    title: session.title,
    session_date: session.session_date,
    event_type: isSessionEventType(session.event_type)
      ? session.event_type
      : 'other',
    requires_check_in: session.requires_check_in,
    supports_reading: session.supports_reading,
  }
}

export function formValuesToSessionInsert(
  values: SessionFormValues,
): SessionInsert {
  return {
    title: values.title.trim(),
    session_date: values.session_date,
    event_type: values.event_type,
    requires_check_in: values.requires_check_in,
    supports_reading: values.supports_reading,
  }
}

export function formValuesToSessionUpdate(
  values: SessionFormValues,
): SessionUpdate {
  return formValuesToSessionInsert(values)
}

/** Prefer today's reading-capable session; fall back to any today, then first. */
export function pickDefaultSessionId<
  T extends {
    id: string
    session_date: string
    supports_reading?: boolean | null
  },
>(sessions: T[], todayIso: string): string | null {
  if (sessions.length === 0) {
    return null
  }

  const todayReading = sessions.find(
    (session) =>
      session.session_date === todayIso && session.supports_reading !== false,
  )
  if (todayReading) {
    return todayReading.id
  }

  const todayAny = sessions.find((session) => session.session_date === todayIso)
  if (todayAny) {
    return todayAny.id
  }

  const anyReading = sessions.find(
    (session) => session.supports_reading !== false,
  )
  return anyReading?.id ?? sessions[0]?.id ?? null
}

export function sessionSupportsReading(session: {
  supports_reading?: boolean | null
}): boolean {
  return session.supports_reading !== false
}

export function sessionRequiresCheckIn(session: {
  requires_check_in?: boolean | null
}): boolean {
  return session.requires_check_in !== false
}
