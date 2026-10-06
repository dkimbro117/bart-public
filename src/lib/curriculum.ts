import type { Tables, TablesInsert, TablesUpdate } from '../types/database'
import { db } from './db'
import { formatSessionLabel } from './dates'
import { supabase } from './supabase'

export type CurriculumUnit = Tables<'curriculum_units'>
export type CurriculumUnitInsert = TablesInsert<'curriculum_units'>
export type CurriculumUnitUpdate = TablesUpdate<'curriculum_units'>

export type CurriculumUnitListRow = Pick<
  CurriculumUnit,
  'id' | 'title' | 'description' | 'reading_assignment' | 'session_id' | 'created_at'
>

export type CurriculumUnitFormValues = {
  title: string
  description: string
  reading_assignment: string
  session_id: string
}

export const emptyCurriculumUnitFormValues: CurriculumUnitFormValues = {
  title: '',
  description: '',
  reading_assignment: '',
  session_id: '',
}

export function curriculumUnitToFormValues(
  unit: CurriculumUnit,
): CurriculumUnitFormValues {
  return {
    title: unit.title,
    description: unit.description ?? '',
    reading_assignment: unit.reading_assignment ?? '',
    session_id: unit.session_id ?? '',
  }
}

export function formValuesToCurriculumUnitInsert(
  values: CurriculumUnitFormValues,
): Pick<
  CurriculumUnitInsert,
  'title' | 'description' | 'reading_assignment' | 'session_id'
> {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    reading_assignment: values.reading_assignment.trim() || null,
    session_id: values.session_id || null,
  }
}

export function formValuesToCurriculumUnitUpdate(
  values: CurriculumUnitFormValues,
): Pick<
  CurriculumUnitUpdate,
  'title' | 'description' | 'reading_assignment' | 'session_id'
> {
  return formValuesToCurriculumUnitInsert(values)
}

export function formatCurriculumUnitSessionLabel(
  sessionId: string | null,
  sessions: ReadonlyArray<{
    id: string
    title: string
    session_date: string
  }>,
): string | null {
  if (!sessionId) {
    return null
  }

  const session = sessions.find((row) => row.id === sessionId)
  if (!session) {
    return 'Session unavailable — reattach'
  }

  return formatSessionLabel(session.title, session.session_date)
}

/** Newest unit by created_at wins for a session (matches kiosk getCurriculumUnitForSession). */
export function pickKioskUnitIdForSession(
  sessionId: string,
  units: ReadonlyArray<Pick<CurriculumUnitListRow, 'id' | 'session_id' | 'created_at'>>,
): string | null {
  const attached = units.filter((unit) => unit.session_id === sessionId)
  if (attached.length === 0) {
    return null
  }

  const sorted = [...attached].sort((left, right) => {
    const leftTime = left.created_at ? Date.parse(left.created_at) : 0
    const rightTime = right.created_at ? Date.parse(right.created_at) : 0
    return rightTime - leftTime
  })

  return sorted[0]?.id ?? null
}

export function buildKioskWinnerBySessionId(
  units: ReadonlyArray<Pick<CurriculumUnitListRow, 'id' | 'session_id' | 'created_at'>>,
): Map<string, string> {
  const winners = new Map<string, string>()
  const sessionIds = new Set(
    units
      .map((unit) => unit.session_id)
      .filter((id): id is string => Boolean(id)),
  )

  for (const sessionId of sessionIds) {
    const winnerId = pickKioskUnitIdForSession(sessionId, units)
    if (winnerId) {
      winners.set(sessionId, winnerId)
    }
  }

  return winners
}

/** Other unit that would lose/win when attaching `unitId` to `sessionId`. */
export function findConflictingUnitForSession(
  sessionId: string,
  unitId: string | null,
  units: ReadonlyArray<
    Pick<CurriculumUnitListRow, 'id' | 'session_id' | 'created_at' | 'title'>
  >,
): Pick<CurriculumUnitListRow, 'id' | 'title'> | null {
  const others = units.filter(
    (unit) => unit.session_id === sessionId && unit.id !== unitId,
  )
  if (others.length === 0) {
    return null
  }

  const winnerId = pickKioskUnitIdForSession(sessionId, units)
  const preferred =
    others.find((unit) => unit.id === winnerId) ?? others[0] ?? null
  return preferred ? { id: preferred.id, title: preferred.title } : null
}

export function summarizeText(value: string | null, maxLength = 120): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    return '—'
  }
  if (trimmed.length <= maxLength) {
    return trimmed
  }
  return `${trimmed.slice(0, maxLength - 1)}…`
}

async function clearCurriculumUnitCache(unit: {
  id: string
  session_id: string | null
}): Promise<void> {
  await db.curriculum_units.delete(unit.id).catch(() => undefined)

  if (!unit.session_id) {
    return
  }

  const cachedQuiz = await db.quizzes
    .where('session_id')
    .equals(unit.session_id)
    .first()

  if (!cachedQuiz || cachedQuiz.unit_id !== unit.id) {
    return
  }

  await db.transaction('rw', db.quizzes, db.quiz_questions, db.quiz_attempts, async () => {
    await db.quiz_questions.where('quiz_id').equals(cachedQuiz.id).delete()
    await db.quiz_attempts.where('quiz_id').equals(cachedQuiz.id).delete()
    await db.quizzes.delete(cachedQuiz.id)
  })
}

/** Permanently deletes a curriculum unit and its quiz (DB cascade). Admin only via RLS. */
export async function deleteCurriculumUnit(unitId: string): Promise<void> {
  const { data: unit, error: fetchError } = await supabase
    .from('curriculum_units')
    .select('id, session_id')
    .eq('id', unitId)
    .single()

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  const { error: deleteError } = await supabase
    .from('curriculum_units')
    .delete()
    .eq('id', unitId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  await clearCurriculumUnitCache(unit)
}
