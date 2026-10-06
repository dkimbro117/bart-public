import { todayIsoDate } from './dates'
import { pickDefaultSessionId, SESSION_CACHE_COLUMNS } from './sessions'
import type { Json } from '../types/database'
import {
  attendanceKey,
  db,
  type CachedCurriculumUnit,
  type CachedParticipant,
  type CachedParticipantPickup,
  type CachedQuiz,
  type CachedQuizQuestion,
  type CachedSession,
  type EnqueueMutationInput,
  type LocalAttendance,
  type LocalQuizAttempt,
  type OutboxEntry,
  quizAttemptKey,
} from './db'
import { QUIZ_BY_UNIT, QUIZ_QUESTION_LIST } from './curriculumColumns'
import { primeCacheScopeForDevice, type PrimeCacheScope } from './kioskMode'
import { buildOutboxNotice, type OutboxNotice } from './outboxNotice'
import { PARTICIPANT_SCAN } from './participantColumns'
import { createId } from './createId'
import { signatureSyncErrorMessage } from './signatures'
import { supabase } from './supabase'

export type { OutboxNotice }

type SyncListener = () => void

class CheckoutNotReadyError extends Error {
  constructor() {
    super('Check-in not on server yet; will retry check-out sync.')
    this.name = 'CheckoutNotReadyError'
  }
}

const syncListeners = new Set<SyncListener>()

const PICKUP_CACHE_TTL_MS = 4 * 60 * 60 * 1000

let lastFlushError: string | null = null
let serverReachable = typeof navigator !== 'undefined' ? navigator.onLine : true

export type ConnectionState = 'offline' | 'unreachable' | 'online'

export type FlushOutboxResult = {
  synced: number
  remaining: number
  error: string | null
}

function notifySyncListeners() {
  for (const listener of syncListeners) {
    listener()
  }
}

export function subscribeSyncStatus(listener: SyncListener) {
  syncListeners.add(listener)
  return () => {
    syncListeners.delete(listener)
  }
}

export function getLastFlushError(): string | null {
  return lastFlushError
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

export function getConnectionState(): ConnectionState {
  if (!isOnline()) {
    return 'offline'
  }
  return serverReachable ? 'online' : 'unreachable'
}

export async function pingServer(): Promise<boolean> {
  if (!isOnline()) {
    serverReachable = false
    notifySyncListeners()
    return false
  }

  const { error } = await supabase.from('sessions').select('id').limit(1)
  serverReachable = !error
  notifySyncListeners()
  return serverReachable
}

export async function getPendingCount(): Promise<number> {
  return db.outbox.count()
}

export async function hasCachedRoster(): Promise<boolean> {
  return (await db.participants.count()) > 0
}

export async function clearPickupCache(): Promise<void> {
  await db.participant_pickups.clear()
  notifySyncListeners()
}

export async function getOutboxNotice(): Promise<OutboxNotice> {
  const entries = await db.outbox.orderBy('created_at').toArray()
  return buildOutboxNotice(entries)
}

function isPickupCacheFresh(cachedAt: string | undefined): boolean {
  if (!cachedAt) {
    return false
  }
  return Date.now() - new Date(cachedAt).getTime() <= PICKUP_CACHE_TTL_MS
}

export function isFreshPickupCache(cachedAt: string | undefined): boolean {
  return isPickupCacheFresh(cachedAt)
}

function mapParticipant(row: {
  id: string
  display_id: number
  qr_token: string
  first_name: string
  last_initial: string
  last_name?: string | null
  active: boolean
}): CachedParticipant {
  return {
    id: row.id,
    display_id: row.display_id,
    qr_token: row.qr_token,
    first_name: row.first_name,
    last_initial: row.last_initial,
    last_name: row.last_name ?? null,
    active: row.active,
  }
}

function mapPickup(row: {
  id: string
  guardian_name: string
  authorized_pickups: string[]
}): CachedParticipantPickup {
  return {
    id: row.id,
    guardian_name: row.guardian_name,
    authorized_pickups: row.authorized_pickups,
    cached_at: new Date().toISOString(),
  }
}

function mapAttendance(row: {
  participant_id: string
  session_id: string
  checked_in_at: string | null
  checked_out_at: string | null
  pickup_name: string | null
}): LocalAttendance {
  return {
    participant_id: row.participant_id,
    session_id: row.session_id,
    checked_in_at: row.checked_in_at,
    checked_out_at: row.checked_out_at,
    pickup_name: row.pickup_name,
  }
}

export async function loadSessions(): Promise<CachedSession[]> {
  if (!isOnline()) {
    const cached = await db.sessions.orderBy('session_date').reverse().toArray()
    return cached.map(normalizeCachedSession)
  }

  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_CACHE_COLUMNS)
    .order('session_date', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const sessions = (data ?? []).map(normalizeCachedSession)
  await db.sessions.bulkPut(sessions)
  notifySyncListeners()
  return sessions
}

function normalizeCachedSession(
  row: Partial<CachedSession> &
    Pick<CachedSession, 'id' | 'title' | 'session_date'>,
): CachedSession {
  return {
    id: row.id,
    title: row.title,
    session_date: row.session_date,
    event_type: row.event_type ?? 'reading_session',
    requires_check_in: row.requires_check_in ?? true,
    supports_reading: row.supports_reading ?? true,
  }
}

async function loadQuizCacheForSession(
  sessionId: string,
  sessionUnit: CachedCurriculumUnit | undefined,
): Promise<{
  quiz: CachedQuiz | null
  questions: CachedQuizQuestion[]
  attempts: LocalQuizAttempt[]
}> {
  if (!sessionUnit) {
    return { quiz: null, questions: [], attempts: [] }
  }

  const { data: quizRow, error: quizError } = await supabase
    .from('quizzes')
    .select(QUIZ_BY_UNIT)
    .eq('unit_id', sessionUnit.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (quizError) {
    throw new Error(quizError.message)
  }

  if (!quizRow) {
    return { quiz: null, questions: [], attempts: [] }
  }

  const quiz: CachedQuiz = {
    ...quizRow,
    session_id: sessionId,
  }

  const { data: questionRows, error: questionsError } = await supabase
    .from('quiz_questions')
    .select(QUIZ_QUESTION_LIST)
    .eq('quiz_id', quiz.id)
    .order('position', { ascending: true })

  if (questionsError) {
    throw new Error(questionsError.message)
  }

  const questions = (questionRows ?? []).map((row) => ({
    id: row.id,
    quiz_id: row.quiz_id,
    prompt: row.prompt,
    options: row.options,
    correct_index: row.correct_index,
    position: row.position,
  }))

  const { data: attemptRows, error: attemptsError } = await supabase
    .from('quiz_attempts')
    .select('participant_id, quiz_id, session_id, score, total, taken_at')
    .eq('session_id', sessionId)

  if (attemptsError) {
    throw new Error(attemptsError.message)
  }

  const attempts = (attemptRows ?? []).map((row) => ({
    participant_id: row.participant_id,
    quiz_id: row.quiz_id,
    session_id: row.session_id ?? sessionId,
    score: row.score,
    total: row.total,
    taken_at: row.taken_at,
  }))

  return { quiz, questions, attempts }
}

export async function primeCache(
  sessionId: string,
  scope: PrimeCacheScope = primeCacheScopeForDevice(),
): Promise<void> {
  if (!sessionId) {
    return
  }

  if (!isOnline()) {
    return
  }

  const [sessionResult, attendanceResult, unitsResult] = await Promise.all([
    supabase
      .from('sessions')
      .select(SESSION_CACHE_COLUMNS)
      .eq('id', sessionId)
      .single(),
    supabase
      .from('attendance')
      .select(
        'participant_id, session_id, checked_in_at, checked_out_at, pickup_name',
      )
      .eq('session_id', sessionId),
    supabase
      .from('curriculum_units')
      .select('id, session_id, title')
      .not('session_id', 'is', null),
  ])

  if (sessionResult.error) {
    throw new Error(sessionResult.error.message)
  }
  if (attendanceResult.error) {
    throw new Error(attendanceResult.error.message)
  }
  if (unitsResult.error) {
    throw new Error(unitsResult.error.message)
  }

  let participants: CachedParticipant[] = []
  let pickups: CachedParticipantPickup[] = []

  if (scope === 'kiosk') {
    const participantsResult = await supabase
      .from('participants')
      .select(PARTICIPANT_SCAN)
      .eq('active', true)

    if (participantsResult.error) {
      throw new Error(participantsResult.error.message)
    }

    participants = (participantsResult.data ?? []).map(mapParticipant)
  } else {
    const participantsResult = await supabase
      .from('participants')
      .select(
        'id, display_id, qr_token, first_name, last_initial, last_name, guardian_name, authorized_pickups, active',
      )
      .eq('active', true)

    if (participantsResult.error) {
      throw new Error(participantsResult.error.message)
    }

    participants = (participantsResult.data ?? []).map(mapParticipant)
    pickups = (participantsResult.data ?? []).map(mapPickup)
  }

  const attendance = (attendanceResult.data ?? []).map(mapAttendance)
  const curriculumUnits = (unitsResult.data ?? []).filter(
    (unit): unit is CachedCurriculumUnit => unit.session_id !== null,
  )
  const sessionUnit = curriculumUnits.find((unit) => unit.session_id === sessionId)
  const quizCache = await loadQuizCacheForSession(sessionId, sessionUnit)

  await db.transaction(
    'rw',
    db.sessions,
    db.participants,
    db.participant_pickups,
    db.attendance,
    db.curriculum_units,
    async () => {
      await db.sessions.put(normalizeCachedSession(sessionResult.data))
      await db.participants.clear()
      await db.participant_pickups.clear()
      await db.participants.bulkPut(participants)
      if (scope === 'full') {
        await db.participant_pickups.bulkPut(pickups)
      }
      await db.attendance.where('session_id').equals(sessionId).delete()
      await db.attendance.bulkPut(attendance)
      await db.curriculum_units.clear()
      await db.curriculum_units.bulkPut(curriculumUnits)
    },
  )

  await db.transaction('rw', db.quizzes, db.quiz_questions, db.quiz_attempts, async () => {
    await db.quizzes.clear()
    await db.quiz_questions.clear()
    if (quizCache.quiz) {
      await db.quizzes.put(quizCache.quiz)
      await db.quiz_questions.bulkPut(quizCache.questions)
    }
    await db.quiz_attempts.where('session_id').equals(sessionId).delete()
    if (quizCache.attempts.length > 0) {
      await db.quiz_attempts.bulkPut(quizCache.attempts)
    }
  })

  const pendingQuizEntries = await db.outbox
    .filter(
      (entry) => entry.type === 'quiz_attempt' && entry.session_id === sessionId,
    )
    .toArray()
  for (const entry of pendingQuizEntries) {
    if (
      entry.quiz_id &&
      entry.score !== undefined &&
      entry.total !== undefined
    ) {
      await applyOptimisticQuizAttempt({
        type: 'quiz_attempt',
        participant_id: entry.participant_id,
        session_id: entry.session_id,
        occurred_at: entry.occurred_at,
        quiz_id: entry.quiz_id,
        score: entry.score,
        total: entry.total,
      })
    }
  }

  notifySyncListeners()
}

export async function primeTodaySession(
  scope: PrimeCacheScope = primeCacheScopeForDevice(),
): Promise<string | null> {
  const sessions = await loadSessions()
  const sessionId = pickDefaultSessionId(sessions, todayIsoDate())

  if (sessionId) {
    await primeCache(sessionId, scope)
  }

  return sessionId
}

export async function clearLocalCache(): Promise<void> {
  await db.transaction(
    'rw',
    db.participants,
    db.participant_pickups,
    db.sessions,
    db.attendance,
    db.curriculum_units,
    async () => {
      await db.participants.clear()
      await db.participant_pickups.clear()
      await db.sessions.clear()
      await db.attendance.clear()
      await db.curriculum_units.clear()
    },
  )
  await db.transaction('rw', db.quizzes, db.quiz_questions, db.quiz_attempts, async () => {
    await db.quizzes.clear()
    await db.quiz_questions.clear()
    await db.quiz_attempts.clear()
  })
  await db.outbox.clear()
  lastFlushError = null
  notifySyncListeners()
}

async function applyOptimisticAttendance(
  mutation: EnqueueMutationInput,
): Promise<void> {
  const key = attendanceKey(mutation.participant_id, mutation.session_id)
  const existing = await db.attendance.get(key)

  const next: LocalAttendance = {
    participant_id: mutation.participant_id,
    session_id: mutation.session_id,
    checked_in_at: existing?.checked_in_at ?? null,
    checked_out_at: existing?.checked_out_at ?? null,
    pickup_name: existing?.pickup_name ?? null,
  }

  if (mutation.type === 'check_in') {
    if (!existing?.checked_in_at) {
      next.checked_in_at = mutation.occurred_at
    }
  } else {
    if (!existing?.checked_in_at) {
      throw new Error(
        'Cannot check out before check-in for this session.',
      )
    }
    if (!existing?.checked_out_at) {
      next.checked_out_at = mutation.occurred_at
      next.pickup_name = mutation.pickup_name ?? null
    }
  }

  await db.attendance.put(next)
}

async function applyOptimisticQuizAttempt(
  mutation: EnqueueMutationInput,
): Promise<void> {
  if (
    mutation.type !== 'quiz_attempt' ||
    !mutation.quiz_id ||
    mutation.score === undefined ||
    mutation.total === undefined
  ) {
    return
  }

  const key = quizAttemptKey(
    mutation.participant_id,
    mutation.quiz_id,
    mutation.session_id,
  )
  const existing = await db.quiz_attempts.get(key)
  if (existing) {
    return
  }

  await db.quiz_attempts.put({
    participant_id: mutation.participant_id,
    quiz_id: mutation.quiz_id,
    session_id: mutation.session_id,
    score: mutation.score,
    total: mutation.total,
    taken_at: mutation.occurred_at,
  })
}

export async function enqueue(
  mutation: EnqueueMutationInput,
): Promise<OutboxEntry> {
  const entry: OutboxEntry = {
    client_id: createId(),
    type: mutation.type,
    participant_id: mutation.participant_id,
    session_id: mutation.session_id,
    occurred_at: mutation.occurred_at,
    pickup_name: mutation.pickup_name ?? null,
    staff_id: mutation.staff_id,
    created_at: new Date().toISOString(),
    unit_id: mutation.unit_id ?? null,
    minutes: mutation.minutes,
    client_event_id: mutation.client_event_id ?? null,
    quiz_id: mutation.quiz_id ?? null,
    score: mutation.score,
    total: mutation.total,
    signature_kind: mutation.signature_kind ?? null,
    signer_name: mutation.signer_name ?? null,
    signature_json: mutation.signature_json ?? null,
  }

  await db.transaction('rw', db.outbox, db.attendance, db.quiz_attempts, async () => {
    await db.outbox.put(entry)
    if (mutation.type === 'check_in' || mutation.type === 'check_out') {
      await applyOptimisticAttendance(mutation)
    }
    if (mutation.type === 'quiz_attempt') {
      await applyOptimisticQuizAttempt(mutation)
    }
  })

  notifySyncListeners()

  if (isOnline()) {
    void flushOutbox()
  }

  return entry
}

async function queueSignatureRetry(
  entry: OutboxEntry,
  message: string,
): Promise<void> {
  if (entry.type === 'attendance_signature') {
    throw new Error(message)
  }

  await db.outbox.put({
    client_id: createId(),
    type: 'attendance_signature',
    participant_id: entry.participant_id,
    session_id: entry.session_id,
    occurred_at: entry.occurred_at,
    staff_id: entry.staff_id,
    created_at: new Date().toISOString(),
    signature_kind: entry.signature_kind ?? null,
    signer_name: entry.signer_name ?? null,
    signature_json: entry.signature_json ?? null,
  })
  lastFlushError = message
}

async function syncAttendanceSignature(entry: OutboxEntry): Promise<void> {
  if (
    !entry.signature_kind ||
    !entry.signer_name ||
    entry.signature_json == null
  ) {
    return
  }

  const { error } = await supabase.from('attendance_signatures').upsert(
    {
      participant_id: entry.participant_id,
      session_id: entry.session_id,
      kind: entry.signature_kind,
      signer_name: entry.signer_name,
      signature_json: entry.signature_json as Json,
      signed_at: entry.occurred_at,
      captured_by: entry.staff_id ?? null,
    },
    { onConflict: 'participant_id,session_id,kind' },
  )

  if (error) {
    throw new Error(signatureSyncErrorMessage(error.message))
  }
}

async function syncAttendanceThenSignature(entry: OutboxEntry): Promise<void> {
  try {
    await syncAttendanceSignature(entry)
  } catch (signatureError) {
    const message =
      signatureError instanceof Error
        ? signatureError.message
        : 'E-sign did not save.'
    await queueSignatureRetry(entry, message)
  }
}

async function syncOutboxEntry(entry: OutboxEntry): Promise<void> {
  if (entry.type === 'quiz_attempt') {
    if (
      !entry.quiz_id ||
      entry.score === undefined ||
      entry.total === undefined
    ) {
      throw new Error('Quiz attempt entry is missing quiz data.')
    }

    const { error } = await supabase.from('quiz_attempts').insert({
      participant_id: entry.participant_id,
      quiz_id: entry.quiz_id,
      session_id: entry.session_id,
      score: entry.score,
      total: entry.total,
      taken_at: entry.occurred_at,
    })

    if (error?.code === '23505') {
      return
    }

    if (error) {
      throw new Error(error.message)
    }

    return
  }

  if (entry.type === 'reading_log') {
    if (entry.minutes === undefined) {
      throw new Error('Reading log entry is missing minutes.')
    }
    if (!entry.staff_id) {
      throw new Error('Reading log entry is missing staff id.')
    }

    const { error } = await supabase.from('reading_logs').insert({
      participant_id: entry.participant_id,
      session_id: entry.session_id,
      unit_id: entry.unit_id ?? null,
      minutes: entry.minutes,
      logged_at: entry.occurred_at,
      logged_by: entry.staff_id,
      client_event_id: entry.client_event_id ?? null,
    })

    if (error?.code === '23505' && entry.client_event_id) {
      return
    }

    if (error) {
      throw new Error(error.message)
    }

    return
  }

  if (entry.type === 'attendance_signature') {
    await syncAttendanceSignature(entry)
    return
  }

  if (entry.type === 'check_in') {
    const { data: existing, error: lookupError } = await supabase
      .from('attendance')
      .select('checked_in_at')
      .eq('participant_id', entry.participant_id)
      .eq('session_id', entry.session_id)
      .maybeSingle()

    if (lookupError) {
      throw new Error(lookupError.message)
    }

    if (!existing?.checked_in_at) {
      const { error } = await supabase.from('attendance').upsert(
        {
          participant_id: entry.participant_id,
          session_id: entry.session_id,
          checked_in_at: entry.occurred_at,
          checked_in_by: entry.staff_id,
        },
        { onConflict: 'participant_id,session_id' },
      )

      if (error) {
        throw new Error(error.message)
      }
    }

    await syncAttendanceThenSignature(entry)
    return
  }

  const { data, error } = await supabase
    .from('attendance')
    .update({
      checked_out_at: entry.occurred_at,
      checked_out_by: entry.staff_id,
      pickup_name: entry.pickup_name ?? null,
    })
    .eq('participant_id', entry.participant_id)
    .eq('session_id', entry.session_id)
    .not('checked_in_at', 'is', null)
    .is('checked_out_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    const { data: existing, error: existingError } = await supabase
      .from('attendance')
      .select('checked_in_at, checked_out_at')
      .eq('participant_id', entry.participant_id)
      .eq('session_id', entry.session_id)
      .maybeSingle()

    if (existingError) {
      throw new Error(existingError.message)
    }

    if (!existing?.checked_in_at || !existing.checked_out_at) {
      throw new CheckoutNotReadyError()
    }
  }

  await syncAttendanceThenSignature(entry)
}

export async function flushOutbox(): Promise<FlushOutboxResult> {
  if (!isOnline()) {
    return {
      synced: 0,
      remaining: await getPendingCount(),
      error: null,
    }
  }

  const reachable = await pingServer()
  if (!reachable) {
    const message = 'Server unreachable. Scans are saved locally until connection returns.'
    lastFlushError = message
    notifySyncListeners()
    return {
      synced: 0,
      remaining: await getPendingCount(),
      error: message,
    }
  }

  const entries = await db.outbox.orderBy('created_at').toArray()
  let synced = 0
  let error: string | null = null

  for (const entry of entries) {
    try {
      await syncOutboxEntry(entry)
      await db.outbox.delete(entry.client_id)
      synced += 1
      notifySyncListeners()
    } catch (flushError) {
      if (flushError instanceof CheckoutNotReadyError) {
        continue
      }

      const message =
        flushError instanceof Error ? flushError.message : 'Sync failed'
      error = `Sync stopped (${entry.type}, ${entry.client_id.slice(0, 8)}…): ${message}`
      lastFlushError = error
      notifySyncListeners()
      break
    }
  }

  if (!error) {
    const notice = await getOutboxNotice()
    if (notice.waitingForCheckIn > 0 && notice.message) {
      lastFlushError = notice.message
    } else if (!lastFlushError) {
      lastFlushError = notice.message
    }
    notifySyncListeners()
  }

  return {
    synced,
    remaining: await getPendingCount(),
    error: error ?? lastFlushError,
  }
}

export function startSyncEngine() {
  const handleOnline = () => {
    notifySyncListeners()
    void pingServer().then(() => flushOutbox())
  }

  const handleOffline = () => {
    serverReachable = false
    notifySyncListeners()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  void pingServer()

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
