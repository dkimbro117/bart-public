import { supabase } from './supabase'
import { createId } from './createId'
import type { QuizQuestionFormValues } from './quizzes'

export type DraftQuizQuestion = {
  prompt: string
  options: string[]
  correct_index: number
}

export type DraftQuizResult = {
  questions: DraftQuizQuestion[]
}

function isDraftQuizResult(value: unknown): value is DraftQuizResult {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as DraftQuizResult
  return Array.isArray(candidate.questions)
}

export function draftQuestionsToFormValues(
  questions: DraftQuizQuestion[],
): QuizQuestionFormValues[] {
  return questions.map((question) => ({
    clientId: createId(),
    prompt: question.prompt,
    options:
      question.options.length >= 2
        ? question.options
        : [...question.options, ''],
    correctIndex: question.correct_index,
    aiDrafted: true,
  }))
}

export async function draftQuizQuestions(input: {
  unitTitle: string
  readingAssignment: string
  questionCount: number
  ageRange: string
}): Promise<DraftQuizQuestion[]> {
  const { data, error } = await supabase.functions.invoke('draft-quiz', {
    body: {
      unit_title: input.unitTitle,
      reading_assignment: input.readingAssignment,
      question_count: input.questionCount,
      age_range: input.ageRange,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const message =
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'Failed to draft quiz questions.'
    throw new Error(message)
  }

  if (!isDraftQuizResult(data)) {
    throw new Error('Unexpected response from draft-quiz.')
  }

  return data.questions
}
