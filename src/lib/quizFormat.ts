import { createId } from './createId'

export const QUIZ_FORMATS = ['multiple_choice', 'true_false'] as const

export type QuizFormat = (typeof QUIZ_FORMATS)[number]

export const TRUE_FALSE_OPTION_LABELS = ['True', 'False'] as const

export const TRUE_FALSE_SWIPE_THRESHOLD_PX = 72

export function normalizeQuizFormat(
  format: string | null | undefined,
): QuizFormat {
  return format === 'true_false' ? 'true_false' : 'multiple_choice'
}

export function isTrueFalseFormat(format: string | null | undefined): boolean {
  return normalizeQuizFormat(format) === 'true_false'
}

export function newTrueFalseQuestionFormValues(): {
  clientId: string
  prompt: string
  options: string[]
  correctIndex: number
} {
  return {
    clientId: createId(),
    prompt: '',
    options: [...TRUE_FALSE_OPTION_LABELS],
    correctIndex: 0,
  }
}

export function validateTrueFalseOptions(options: string[]): boolean {
  return (
    options.length === 2 &&
    options[0] === TRUE_FALSE_OPTION_LABELS[0] &&
    options[1] === TRUE_FALSE_OPTION_LABELS[1]
  )
}
