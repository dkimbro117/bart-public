import Dexie, { type EntityTable, type Table } from 'dexie'
import type { Tables } from '../types/database'

/** Offline scan cache — subset of participants (H-4, M-11). */
export type CachedParticipant = Pick<
  Tables<'participants'>,
  'id' | 'display_id' | 'qr_token' | 'first_name' | 'last_initial' | 'active'
> & {
  last_name?: string | null
}

/** Pickup authorization stored separately from scan cache (H-4). */
export type CachedParticipantPickup = Pick<
  Tables<'participants'>,
  'id' | 'guardian_name' | 'authorized_pickups'
> & {
  cached_at: string
}

/** Mirrors `sessions` columns used offline (M-4). */
export type CachedSession = Pick<
  Tables<'sessions'>,
  | 'id'
  | 'title'
  | 'session_date'
  | 'event_type'
  | 'requires_check_in'
  | 'supports_reading'
>

/** Session-linked curriculum unit for offline reading logs. */
export type CachedCurriculumUnit = Pick<
  Tables<'curriculum_units'>,
  'id' | 'session_id' | 'title'
>

/** Quiz metadata cached for offline kiosk (includes session_id for lookup). */
export type CachedQuiz = Pick<
  Tables<'quizzes'>,
  'id' | 'unit_id' | 'title' | 'format' | 'created_at'
> & {
  session_id: string
}

/** Quiz question cached for offline grading. */
export type CachedQuizQuestion = Pick<
  Tables<'quiz_questions'>,
  'id' | 'quiz_id' | 'prompt' | 'options' | 'correct_index' | 'position'
>

/** Local quiz attempt mirror — one row per participant/quiz/session. */
export type LocalQuizAttempt = {
  participant_id: string
  quiz_id: string
  session_id: string
  score: number
  total: number
  taken_at: string
}

/** Local attendance mirror — no server `id` until synced (M-4). */
export type LocalAttendance = {
  participant_id: string
  session_id: string
  checked_in_at?: string | null
  checked_out_at?: string | null
  pickup_name?: string | null
}

export type OutboxMutationType =
  | 'check_in'
  | 'check_out'
  | 'reading_log'
  | 'quiz_attempt'
  | 'attendance_signature'

/** Queued mutation for background sync (M-4). */
export type OutboxEntry = {
  client_id: string
  type: OutboxMutationType
  participant_id: string
  session_id: string
  occurred_at: string
  pickup_name?: string | null
  staff_id?: string
  created_at: string
  unit_id?: string | null
  minutes?: number
  /** Set once when a reading_log is enqueued; reused on every sync retry. */
  client_event_id?: string | null
  quiz_id?: string | null
  score?: number
  total?: number
  signature_kind?: 'dropoff' | 'pickup' | null
  signer_name?: string | null
  signature_json?: unknown
}

export type EnqueueMutationInput = {
  type: OutboxMutationType
  participant_id: string
  session_id: string
  occurred_at: string
  staff_id?: string
  pickup_name?: string | null
  unit_id?: string | null
  minutes?: number
  /** Set once when a reading_log is enqueued; reused on every sync retry. */
  client_event_id?: string | null
  quiz_id?: string | null
  score?: number
  total?: number
  signature_kind?: 'dropoff' | 'pickup' | null
  signer_name?: string | null
  signature_json?: unknown
}

class BartDexie extends Dexie {
  participants!: EntityTable<CachedParticipant, 'id'>
  participant_pickups!: EntityTable<CachedParticipantPickup, 'id'>
  sessions!: EntityTable<CachedSession, 'id'>
  curriculum_units!: EntityTable<CachedCurriculumUnit, 'id'>
  quizzes!: EntityTable<CachedQuiz, 'id'>
  quiz_questions!: EntityTable<CachedQuizQuestion, 'id'>
  quiz_attempts!: Table<LocalQuizAttempt, [string, string, string]>
  attendance!: Table<LocalAttendance, [string, string]>
  outbox!: EntityTable<OutboxEntry, 'client_id'>

  constructor() {
    super('bart')
    this.version(1).stores({
      participants: 'id, qr_token, display_id',
      sessions: 'id, session_date',
      attendance: '[participant_id+session_id], session_id, participant_id',
      outbox: 'client_id, created_at, session_id',
    })
    this.version(2).stores({
      participants: 'id, qr_token, display_id',
      participant_pickups: 'id',
      sessions: 'id, session_date',
      attendance: '[participant_id+session_id], session_id, participant_id',
      outbox: 'client_id, created_at, session_id',
    })
    this.version(3).stores({
      participants: 'id, qr_token, display_id',
      participant_pickups: 'id',
      sessions: 'id, session_date',
      attendance: '[participant_id+session_id], session_id, participant_id',
      outbox: 'client_id, created_at, session_id',
    })
    this.version(3).upgrade(async (transaction) => {
      const pickups = await transaction
        .table('participant_pickups')
        .toArray()
      const now = new Date().toISOString()
      for (const pickup of pickups) {
        if (!pickup.cached_at) {
          await transaction.table('participant_pickups').put({
            ...pickup,
            cached_at: now,
          })
        }
      }
    })
    this.version(4).stores({
      participants: 'id, qr_token, display_id',
      participant_pickups: 'id',
      sessions: 'id, session_date',
      curriculum_units: 'id, session_id',
      attendance: '[participant_id+session_id], session_id, participant_id',
      outbox: 'client_id, created_at, session_id',
    })
    this.version(5).stores({
      participants: 'id, qr_token, display_id',
      participant_pickups: 'id',
      sessions: 'id, session_date',
      curriculum_units: 'id, session_id',
      quizzes: 'id, unit_id, session_id',
      quiz_questions: 'id, quiz_id, position',
      quiz_attempts:
        '[participant_id+quiz_id+session_id], session_id, quiz_id, participant_id',
      attendance: '[participant_id+session_id], session_id, participant_id',
      outbox: 'client_id, created_at, session_id',
    })
    // v6: session rows gain event_type / capability flags (no index change).
    this.version(6).stores({
      participants: 'id, qr_token, display_id',
      participant_pickups: 'id',
      sessions: 'id, session_date',
      curriculum_units: 'id, session_id',
      quizzes: 'id, unit_id, session_id',
      quiz_questions: 'id, quiz_id, position',
      quiz_attempts:
        '[participant_id+quiz_id+session_id], session_id, quiz_id, participant_id',
      attendance: '[participant_id+session_id], session_id, participant_id',
      outbox: 'client_id, created_at, session_id',
    })
  }
}

export const db = new BartDexie()

export function attendanceKey(
  participantId: string,
  sessionId: string,
): [string, string] {
  return [participantId, sessionId]
}

export function quizAttemptKey(
  participantId: string,
  quizId: string,
  sessionId: string,
): [string, string, string] {
  return [participantId, quizId, sessionId]
}
