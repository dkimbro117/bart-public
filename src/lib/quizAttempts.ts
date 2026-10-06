import {
  db,
  quizAttemptKey,
  type CachedQuizQuestion,
  type LocalQuizAttempt,
} from './db'
import { QUIZ_BY_UNIT, QUIZ_QUESTION_LIST } from './curriculumColumns'
import { getCurriculumUnitForSession } from './readingLogs'
import { normalizeQuizFormat } from './quizFormat'
import { optionsFromJson } from './quizzes'
import { enqueue, isOnline, pingServer } from './sync'
import { supabase } from './supabase'
import type { Tables } from '../types/database'

export type QuizForSession = {
  quiz: Tables<'quizzes'>
  questions: Tables<'quiz_questions'>[]
}

export type QuizAnswerMap = Record<string, number>

/**
 * Answers are keyed by question id, so going Back and re-answering replaces
 * the earlier choice rather than adding a second entry.
 */
export function recordQuizAnswer(
  answers: QuizAnswerMap,
  questionId: string,
  selectedIndex: number,
): QuizAnswerMap {
  return { ...answers, [questionId]: selectedIndex }
}

export type FetchQuizResult =
  | { status: 'ok'; data: QuizForSession }
  | { status: 'none' }
  | { status: 'offline_unavailable' }

async function loadCachedQuizForSession(
  sessionId: string,
): Promise<QuizForSession | null> {
  const quiz = await db.quizzes.where('session_id').equals(sessionId).first()
  if (!quiz) {
    return null
  }

  const questions = await db.quiz_questions
    .where('quiz_id')
    .equals(quiz.id)
    .sortBy('position')

  if (!questions.length) {
    return null
  }

  return {
    quiz: {
      id: quiz.id,
      unit_id: quiz.unit_id,
      title: quiz.title,
      format: normalizeQuizFormat(quiz.format),
      created_at: quiz.created_at,
    },
    questions: questions as Tables<'quiz_questions'>[],
  }
}

async function cacheQuizForSession(
  sessionId: string,
  quiz: Tables<'quizzes'>,
  questions: CachedQuizQuestion[],
): Promise<void> {
  await db.transaction('rw', db.quizzes, db.quiz_questions, async () => {
    await db.quizzes.where('session_id').equals(sessionId).delete()
    await db.quiz_questions.where('quiz_id').equals(quiz.id).delete()
    await db.quizzes.put({
      id: quiz.id,
      unit_id: quiz.unit_id,
      title: quiz.title,
      format: normalizeQuizFormat(quiz.format),
      created_at: quiz.created_at,
      session_id: sessionId,
    })
    await db.quiz_questions.bulkPut(questions)
  })
}

export async function fetchQuizForSession(
  sessionId: string,
): Promise<FetchQuizResult> {
  const cached = await loadCachedQuizForSession(sessionId)
  if (cached) {
    return { status: 'ok', data: cached }
  }

  if (!isOnline()) {
    return { status: 'offline_unavailable' }
  }

  const reachable = await pingServer()
  if (!reachable) {
    return { status: 'offline_unavailable' }
  }

  const unit = await getCurriculumUnitForSession(sessionId)
  if (!unit) {
    return { status: 'none' }
  }

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select(QUIZ_BY_UNIT)
    .eq('unit_id', unit.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (quizError) {
    throw new Error(quizError.message)
  }

  if (!quiz) {
    return { status: 'none' }
  }

  const { data: questions, error: questionsError } = await supabase
    .from('quiz_questions')
    .select(QUIZ_QUESTION_LIST)
    .eq('quiz_id', quiz.id)
    .order('position', { ascending: true })

  if (questionsError) {
    throw new Error(questionsError.message)
  }

  if (!questions?.length) {
    return { status: 'none' }
  }

  const cachedQuestions: CachedQuizQuestion[] = questions.map((row) => ({
    id: row.id,
    quiz_id: row.quiz_id,
    prompt: row.prompt,
    options: row.options,
    correct_index: row.correct_index,
    position: row.position,
  }))

  await cacheQuizForSession(sessionId, quiz, cachedQuestions)

  return {
    status: 'ok',
    data: { quiz, questions },
  }
}

async function loadLocalQuizAttempt(
  participantId: string,
  quizId: string,
  sessionId: string,
): Promise<LocalQuizAttempt | null> {
  return (
    (await db.quiz_attempts.get(
      quizAttemptKey(participantId, quizId, sessionId),
    )) ?? null
  )
}

async function cacheServerQuizAttempt(attempt: LocalQuizAttempt): Promise<void> {
  await db.quiz_attempts.put(attempt)
}

export async function getQuizAttemptForSession({
  participantId,
  quizId,
  sessionId,
}: {
  participantId: string
  quizId: string
  sessionId: string
}) {
  const local = await loadLocalQuizAttempt(participantId, quizId, sessionId)
  if (local) {
    return local
  }

  if (!isOnline()) {
    return null
  }

  const reachable = await pingServer()
  if (!reachable) {
    return null
  }

  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('participant_id, quiz_id, session_id, score, total, taken_at')
    .eq('participant_id', participantId)
    .eq('quiz_id', quizId)
    .eq('session_id', sessionId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data?.session_id) {
    return null
  }

  const attempt: LocalQuizAttempt = {
    participant_id: data.participant_id,
    quiz_id: data.quiz_id,
    session_id: data.session_id,
    score: data.score,
    total: data.total,
    taken_at: data.taken_at,
  }

  await cacheServerQuizAttempt(attempt)
  return attempt
}

export function scoreQuizAnswers(
  questions: Tables<'quiz_questions'>[],
  answers: QuizAnswerMap,
): { score: number; total: number } {
  let score = 0

  for (const question of questions) {
    const options = optionsFromJson(question.options)
    const selected = answers[question.id]
    if (
      typeof selected === 'number' &&
      selected >= 0 &&
      selected < options.length &&
      selected === question.correct_index
    ) {
      score += 1
    }
  }

  return { score, total: questions.length }
}

export async function submitQuizAttempt({
  participantId,
  quizId,
  sessionId,
  questions,
  answers,
  takenAt = new Date().toISOString(),
}: {
  participantId: string
  quizId: string
  sessionId: string
  questions: Tables<'quiz_questions'>[]
  answers: QuizAnswerMap
  takenAt?: string
}) {
  const { score, total } = scoreQuizAnswers(questions, answers)

  const existing = await loadLocalQuizAttempt(participantId, quizId, sessionId)
  if (existing) {
    throw new Error('ALREADY_ATTEMPTED')
  }

  await enqueue({
    type: 'quiz_attempt',
    participant_id: participantId,
    session_id: sessionId,
    occurred_at: takenAt,
    quiz_id: quizId,
    score,
    total,
  })

  return { score, total }
}
