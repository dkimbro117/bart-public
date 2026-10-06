import { isAuthError } from '@supabase/supabase-js'
import { normalizeQuizFormat } from './quizFormat'
import type { QuizAnswerMap } from './quizAttempts'
import {
  normalizeParticipantBadgeInput,
  normalizeParticipantGoToken,
  parseParticipantGoBadgeInput,
} from './participantGoToken'
import { supabase } from './supabase'
import type { QuizFormat } from './quizFormat'

export type ParticipantPortalContext = {
  participant_id: string
  display_id: number
  first_name: string
  last_initial: string
  session_id: string
  session_title: string
  session_date: string
  quiz_id: string
  quiz_title: string
  quiz_format: QuizFormat
  already_attempted: boolean
  quiz_score: number | null
  quiz_total: number | null
}

export type ParticipantPortalQuestion = {
  id: string
  prompt: string
  options: unknown
  position: number
}

export type ParticipantPortalSubmitResult = {
  score: number
  total: number
  all_correct: boolean
}

function portalErrorText(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return ''
  }

  const record = error as Record<string, unknown>
  const parts = [record.message, record.details, record.hint]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')

  if (parts.trim()) {
    return parts
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return ''
}

function mapPortalError(error: unknown): string {
  const message = portalErrorText(error)

  if (message.includes('RATE_LIMITED')) {
    return 'Too many tries. Wait a few minutes, then type your badge number.'
  }
  if (message.includes('INVALID_BADGE')) {
    return 'That number did not work. Use the red number on your badge, like 2601.'
  }
  if (message.includes('NO_SESSION_TODAY') || message.includes('SESSION_NOT_FOUND')) {
    return 'There is no reading night today. Ask a leader.'
  }
  if (message.includes('NO_QUIZ')) {
    return 'No quiz yet. Come back after reading time.'
  }
  if (message.includes('ALREADY_ATTEMPTED')) {
    return 'You already did this quiz today.'
  }
  if (/invalid input syntax for type uuid/i.test(message)) {
    return 'That number did not work. Type the red number on your badge, or scan the code.'
  }
  if (/does not exist|not found/i.test(message) && /id|function|relation/i.test(message)) {
    return 'Your badge is not working right now. Ask a leader.'
  }

  if (isAuthError(error) && message.trim()) {
    return message
  }

  if (message.trim()) {
    return message
  }

  return 'Something went wrong. Try again, or ask a leader.'
}

function parseContext(data: unknown): ParticipantPortalContext {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid portal response.')
  }

  const row = data as Record<string, unknown>

  return {
    participant_id: String(row.participant_id),
    display_id: Number(row.display_id),
    first_name: String(row.first_name),
    last_initial: String(row.last_initial),
    session_id: String(row.session_id),
    session_title: String(row.session_title),
    session_date: String(row.session_date),
    quiz_id: String(row.quiz_id),
    quiz_title: String(row.quiz_title),
    quiz_format: normalizeQuizFormat(
      typeof row.quiz_format === 'string' ? row.quiz_format : null,
    ),
    already_attempted: Boolean(row.already_attempted),
    quiz_score:
      row.quiz_score == null || row.quiz_score === undefined
        ? null
        : Number(row.quiz_score),
    quiz_total:
      row.quiz_total == null || row.quiz_total === undefined
        ? null
        : Number(row.quiz_total),
  }
}

function parseSubmitResult(data: unknown): ParticipantPortalSubmitResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid submit response.')
  }

  const row = data as Record<string, unknown>
  const score = Number(row.score)
  const total = Number(row.total)

  return {
    score,
    total,
    all_correct: Boolean(row.all_correct ?? score === total),
  }
}

export async function fetchParticipantPortalContext(
  qrToken: string,
  sessionId?: string,
): Promise<ParticipantPortalContext> {
  const token = normalizeParticipantGoToken(qrToken)
  if (!token) {
    throw new Error('We could not find your badge. Scan it again.')
  }

  const { data, error } = await supabase.rpc('participant_portal_context', {
    p_qr_token: token,
    p_session_id: sessionId,
  })

  if (error) {
    throw new Error(mapPortalError(error))
  }

  return parseContext(data)
}

export async function fetchParticipantPortalQuestions(
  qrToken: string,
  sessionId?: string,
): Promise<ParticipantPortalQuestion[]> {
  const token = normalizeParticipantGoToken(qrToken)
  if (!token) {
    throw new Error('We could not find your badge. Scan it again.')
  }

  const { data, error } = await supabase.rpc('participant_portal_quiz_questions', {
    p_qr_token: token,
    p_session_id: sessionId,
  })

  if (error) {
    throw new Error(mapPortalError(error))
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    prompt: String(row.prompt),
    options: row.options,
    position: Number(row.position),
  }))
}

export async function submitParticipantPortalQuiz({
  qrToken,
  answers,
  sessionId,
}: {
  qrToken: string
  answers: QuizAnswerMap
  sessionId?: string
}): Promise<ParticipantPortalSubmitResult> {
  const token = normalizeParticipantGoToken(qrToken)
  if (!token) {
    throw new Error('We could not find your badge. Scan it again.')
  }

  const { data, error } = await supabase.rpc('participant_portal_submit_quiz', {
    p_qr_token: token,
    p_answers: answers,
    p_session_id: sessionId,
  })

  if (error) {
    throw new Error(mapPortalError(error))
  }

  return parseSubmitResult(data)
}

export async function resolveParticipantGoBadge(rawBadge: string): Promise<string> {
  const trimmed = normalizeParticipantBadgeInput(rawBadge)
  if (!trimmed) {
    throw new Error('Type your badge number, or scan the code on your badge.')
  }

  const { data, error } = await supabase.rpc('participant_portal_resolve_qr_token', {
    p_badge: trimmed,
  })

  if (error) {
    throw new Error(mapPortalError(error))
  }

  if (typeof data !== 'string' || !parseParticipantGoBadgeInput(data)) {
    throw new Error('That number did not work. Try again, or ask a leader.')
  }

  return data
}

export type PortalIdentity = {
  display_id: number
  first_name: string
  last_initial: string
}

export async function fetchPortalIdentity(qrToken: string): Promise<PortalIdentity> {
  const token = normalizeParticipantGoToken(qrToken)
  if (!token) {
    throw new Error('We could not find your badge. Scan it again.')
  }

  const { data, error } = await supabase.rpc('participant_portal_identity', {
    p_qr_token: token,
  })

  if (error) {
    throw new Error(mapPortalError(error))
  }

  const row = (data ?? {}) as Record<string, unknown>
  return {
    display_id: Number(row.display_id),
    first_name: String(row.first_name),
    last_initial: String(row.last_initial),
  }
}

export type PortalTodayStamps = {
  check_in: boolean
  reading: boolean
  quiz: boolean
}

export type PortalLeaderboardRow = {
  display_id: number
  first_name: string
  last_initial: string
  balance: number
}

export async function fetchPortalTodayStamps(
  qrToken: string,
): Promise<PortalTodayStamps> {
  const token = normalizeParticipantGoToken(qrToken)
  if (!token) {
    throw new Error('We could not find your badge. Scan it again.')
  }

  const { data, error } = await supabase.rpc('participant_portal_today_stamps', {
    p_qr_token: token,
  })

  if (error) {
    throw new Error(mapPortalError(error))
  }

  const row = (data ?? {}) as Record<string, unknown>
  return {
    check_in: Boolean(row.check_in),
    reading: Boolean(row.reading),
    quiz: Boolean(row.quiz),
  }
}

export type PortalProgress = {
  balance: number
  rank: number
  total: number
  earned_this_week: number
  streak: number
}

export async function fetchPortalProgress(
  qrToken: string,
): Promise<PortalProgress> {
  const token = normalizeParticipantGoToken(qrToken)
  if (!token) {
    throw new Error('We could not find your badge. Scan it again.')
  }

  const { data, error } = await supabase.rpc('participant_portal_progress', {
    p_qr_token: token,
  })

  if (error) {
    throw new Error(mapPortalError(error))
  }

  const row = (data ?? {}) as Record<string, unknown>
  return {
    balance: Number(row.balance ?? 0),
    rank: Number(row.rank ?? 0),
    total: Number(row.total ?? 0),
    earned_this_week: Number(row.earned_this_week ?? 0),
    streak: Number(row.streak ?? 0),
  }
}

export async function fetchPortalLeaderboard(
  qrToken: string,
): Promise<PortalLeaderboardRow[]> {
  const token = normalizeParticipantGoToken(qrToken)
  if (!token) {
    throw new Error('We could not find your badge. Scan it again.')
  }

  const { data, error } = await supabase.rpc('participant_portal_leaderboard', {
    p_qr_token: token,
  })

  if (error) {
    throw new Error(mapPortalError(error))
  }

  return (data ?? []).map((row) => ({
    display_id: Number(row.display_id),
    first_name: String(row.first_name),
    last_initial: String(row.last_initial),
    balance: Number(row.balance),
  }))
}
