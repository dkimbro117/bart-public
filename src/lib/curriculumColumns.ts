/** Supabase select fragments — fetch only what each view needs. */

export const CURRICULUM_UNIT_LIST =
  'id, title, description, reading_assignment, session_id, created_at' as const

export const CURRICULUM_UNIT_DETAIL =
  'id, title, description, reading_assignment, session_id, created_at' as const

export const QUIZ_BY_UNIT = 'id, unit_id, title, format, created_at' as const

export const QUIZ_QUESTION_LIST =
  'id, quiz_id, prompt, options, correct_index, position, ai_drafted' as const
