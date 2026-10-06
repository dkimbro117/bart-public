import type { Json, Tables, TablesInsert, TablesUpdate } from '../types/database'
import { createId } from './createId'
import { supabase } from './supabase'
import {
  isTrueFalseFormat,
  normalizeQuizFormat,
  type QuizFormat,
  TRUE_FALSE_OPTION_LABELS,
  validateTrueFalseOptions,
} from './quizFormat'

export type Quiz = Tables<'quizzes'>
export type QuizQuestion = Tables<'quiz_questions'>
export type QuizQuestionInsert = TablesInsert<'quiz_questions'>
export type QuizQuestionUpdate = TablesUpdate<'quiz_questions'>

export type QuizQuestionFormValues = {
  id?: string
  clientId: string
  prompt: string
  options: string[]
  correctIndex: number
  aiDrafted?: boolean
}

export type QuizEditorFormValues = {
  title: string
  format: QuizFormat
  questions: QuizQuestionFormValues[]
}

export {
  newTrueFalseQuestionFormValues,
  TRUE_FALSE_OPTION_LABELS,
  type QuizFormat,
} from './quizFormat'

export function convertQuizEditorFormat(
  values: QuizEditorFormValues,
  format: QuizFormat,
): QuizEditorFormValues {
  if (values.format === format) {
    return values
  }

  if (format === 'true_false') {
    return {
      ...values,
      format,
      questions: values.questions.map((question) => ({
        clientId: question.clientId,
        id: question.id,
        prompt: question.prompt,
        options: [...TRUE_FALSE_OPTION_LABELS],
        correctIndex: 0,
        aiDrafted: question.aiDrafted,
      })),
    }
  }

  return {
    ...values,
    format,
    questions: values.questions.map((question) => ({
      clientId: question.clientId,
      id: question.id,
      prompt: question.prompt,
      options: ['', ''],
      correctIndex: 0,
      aiDrafted: question.aiDrafted,
    })),
  }
}
export const MIN_QUIZ_OPTIONS = 2
export const MAX_QUIZ_OPTIONS = 5

export function emptyQuizEditorFormValues(
  defaultTitle = 'Quiz',
  format: QuizFormat = 'multiple_choice',
): QuizEditorFormValues {
  return {
    title: defaultTitle,
    format,
    questions: [],
  }
}

export function optionsFromJson(value: Json): string[] {
  if (!Array.isArray(value)) {
    return ['', '']
  }

  const strings = value.filter((entry): entry is string => typeof entry === 'string')
  if (strings.length >= MIN_QUIZ_OPTIONS) {
    return strings
  }

  return [...strings, ...Array(MIN_QUIZ_OPTIONS - strings.length).fill('')]
}

export function quizQuestionToFormValues(
  question: QuizQuestion,
): QuizQuestionFormValues {
  const options = optionsFromJson(question.options)
  const correctIndex =
    question.correct_index >= 0 && question.correct_index < options.length
      ? question.correct_index
      : 0

  return {
    id: question.id,
    clientId: question.id,
    prompt: question.prompt,
    options,
    correctIndex,
    aiDrafted: question.ai_drafted,
  }
}

export function quizToEditorFormValues(
  quiz: Quiz,
  questions: QuizQuestion[],
): QuizEditorFormValues {
  const format = normalizeQuizFormat(quiz.format)

  return {
    title: quiz.title,
    format,
    questions: [...questions]
      .sort((left, right) => left.position - right.position)
      .map(quizQuestionToFormValues),
  }
}

export function newQuizQuestionFormValues(): QuizQuestionFormValues {
  return {
    clientId: createId(),
    prompt: '',
    options: ['', ''],
    correctIndex: 0,
  }
}

export function normalizeQuizOptions(options: string[]): string[] {
  return options.map((option) => option.trim()).filter(Boolean)
}

/** True when format switch would discard option text or reset correct answers. */
export function quizEditorHasConvertibleContent(
  values: QuizEditorFormValues,
): boolean {
  return values.questions.some(
    (question) =>
      question.prompt.trim().length > 0 ||
      question.options.some((option) => option.trim().length > 0),
  )
}

/**
 * Trim options and remap correctIndex onto the surviving list.
 * Returns null if the marked-correct row was blank or index is invalid.
 */
export function normalizeQuestionOptionsForSave(
  question: QuizQuestionFormValues,
): { options: string[]; correctIndex: number } | null {
  const trimmed = question.options.map((option) => option.trim())
  if (
    question.correctIndex < 0 ||
    question.correctIndex >= trimmed.length ||
    !Number.isInteger(question.correctIndex)
  ) {
    return null
  }

  if (!trimmed[question.correctIndex]) {
    return null
  }

  const options: string[] = []
  let correctIndex = -1
  trimmed.forEach((option, index) => {
    if (!option) {
      return
    }
    if (index === question.correctIndex) {
      correctIndex = options.length
    }
    options.push(option)
  })

  if (correctIndex < 0) {
    return null
  }

  return { options, correctIndex }
}

export function validateTrueFalseQuestion(
  question: QuizQuestionFormValues,
  index: number,
): string | null {
  if (!question.prompt.trim()) {
    return `Statement ${index + 1} needs text.`
  }

  if (!validateTrueFalseOptions(normalizeQuizOptions(question.options))) {
    return `Statement ${index + 1} must use True and False answers in that order.`
  }

  if (question.correctIndex !== 0 && question.correctIndex !== 1) {
    return `Statement ${index + 1} must mark True or False as correct.`
  }

  return null
}

export function validateQuizQuestion(
  question: QuizQuestionFormValues,
  index: number,
): string | null {
  if (!question.prompt.trim()) {
    return `Question ${index + 1} needs a prompt.`
  }

  const hasBlankOption = question.options.some((option) => !option.trim())
  if (hasBlankOption) {
    return `Question ${index + 1} has a blank option — fill it or remove it.`
  }

  const normalized = normalizeQuestionOptionsForSave(question)
  if (!normalized) {
    return `Question ${index + 1} must mark exactly one correct answer.`
  }

  if (normalized.options.length < MIN_QUIZ_OPTIONS) {
    return `Question ${index + 1} needs at least ${MIN_QUIZ_OPTIONS} answer options.`
  }
  if (normalized.options.length > MAX_QUIZ_OPTIONS) {
    return `Question ${index + 1} can have at most ${MAX_QUIZ_OPTIONS} answer options.`
  }

  return null
}

export function validateQuizEditor(values: QuizEditorFormValues): string | null {
  if (values.questions.length === 0) {
    return null
  }

  if (!values.title.trim()) {
    return 'Quiz title is required when adding questions.'
  }

  const validateQuestion = isTrueFalseFormat(values.format)
    ? validateTrueFalseQuestion
    : validateQuizQuestion

  for (let index = 0; index < values.questions.length; index += 1) {
    const error = validateQuestion(values.questions[index], index)
    if (error) {
      return error
    }
  }

  return null
}

export function formQuestionToInsert(
  question: QuizQuestionFormValues,
  quizId: string,
  position: number,
): Pick<
  QuizQuestionInsert,
  'quiz_id' | 'prompt' | 'options' | 'correct_index' | 'position' | 'ai_drafted'
> {
  const normalized = normalizeQuestionOptionsForSave(question)
  if (!normalized) {
    throw new Error('Question options are invalid.')
  }

  return {
    quiz_id: quizId,
    prompt: question.prompt.trim(),
    options: normalized.options,
    correct_index: normalized.correctIndex,
    position,
    ai_drafted: Boolean(question.aiDrafted),
  }
}

export function formQuestionToUpdate(
  question: QuizQuestionFormValues,
  position: number,
): Pick<
  QuizQuestionUpdate,
  'prompt' | 'options' | 'correct_index' | 'position' | 'ai_drafted'
> {
  const normalized = normalizeQuestionOptionsForSave(question)
  if (!normalized) {
    throw new Error('Question options are invalid.')
  }

  return {
    prompt: question.prompt.trim(),
    options: normalized.options,
    correct_index: normalized.correctIndex,
    position,
    ai_drafted: Boolean(question.aiDrafted),
  }
}

export async function saveQuizEditor(
  unitId: string,
  existingQuizId: string | null,
  existingQuestionIds: string[],
  values: QuizEditorFormValues,
): Promise<string | null> {
  const validationError = validateQuizEditor(values)
  if (validationError) {
    throw new Error(validationError)
  }

  if (values.questions.length === 0) {
    if (!existingQuizId) {
      return null
    }

    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', existingQuizId)

    if (error) {
      throw new Error(error.message)
    }

    return null
  }

  let quizId = existingQuizId

  if (!quizId) {
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        unit_id: unitId,
        title: values.title.trim(),
        format: values.format,
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    quizId = data.id
  } else {
    const { error } = await supabase
      .from('quizzes')
      .update({
        title: values.title.trim(),
        format: values.format,
      })
      .eq('id', quizId)

    if (error) {
      throw new Error(error.message)
    }
  }

  const keptIds = new Set(
    values.questions
      .map((question) => question.id)
      .filter((id): id is string => Boolean(id)),
  )
  const idsToDelete = existingQuestionIds.filter((id) => !keptIds.has(id))

  if (idsToDelete.length > 0) {
    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .in('id', idsToDelete)

    if (error) {
      throw new Error(error.message)
    }
  }

  for (let position = 0; position < values.questions.length; position += 1) {
    const question = values.questions[position]

    if (question.id) {
      const { error } = await supabase
        .from('quiz_questions')
        .update(formQuestionToUpdate(question, position))
        .eq('id', question.id)

      if (error) {
        throw new Error(error.message)
      }
    } else {
      const { error } = await supabase
        .from('quiz_questions')
        .insert(formQuestionToInsert(question, quizId, position))

      if (error) {
        throw new Error(error.message)
      }
    }
  }

  return quizId
}
