import { db } from './db'
import { createId } from './createId'
import { enqueue, isOnline, pingServer } from './sync'
import { supabase } from './supabase'

export async function getCurriculumUnitForSession(sessionId: string) {
  const cached = await db.curriculum_units
    .where('session_id')
    .equals(sessionId)
    .first()

  if (cached) {
    return cached
  }

  if (!isOnline()) {
    return null
  }

  const reachable = await pingServer()
  if (!reachable) {
    return null
  }

  const { data, error } = await supabase
    .from('curriculum_units')
    .select('id, session_id, title')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (data?.session_id) {
    await db.curriculum_units.put({
      id: data.id,
      session_id: data.session_id,
      title: data.title,
    })
  }

  return data?.session_id ? data : null
}

export async function logReadingMinutes({
  participantId,
  sessionId,
  staffId,
  minutes,
  occurredAt,
}: {
  participantId: string
  sessionId: string
  staffId: string
  minutes: number
  occurredAt: string
}): Promise<void> {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error('Minutes must be a whole number of zero or more.')
  }

  const unit = await getCurriculumUnitForSession(sessionId)
  const client_event_id = createId()

  await enqueue({
    type: 'reading_log',
    participant_id: participantId,
    session_id: sessionId,
    occurred_at: occurredAt,
    staff_id: staffId,
    unit_id: unit?.id ?? null,
    minutes,
    client_event_id,
  })
}

export function appendReadingMinutesDigit(current: string, digit: string): string {
  if (!/^\d$/.test(digit)) {
    return current
  }

  const next = current === '0' ? digit : `${current}${digit}`
  const parsed = Number.parseInt(next, 10)

  if (!Number.isFinite(parsed) || parsed > 999) {
    return current
  }

  return String(parsed)
}

export function backspaceReadingMinutes(current: string): string {
  if (!current) {
    return ''
  }

  const next = current.slice(0, -1)
  return next || ''
}

export function parseReadingMinutesInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 999) {
    return null
  }

  return parsed
}
