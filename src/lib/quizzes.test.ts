import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  convertQuizEditorFormat,
  formQuestionToInsert,
  normalizeQuestionOptionsForSave,
  quizEditorHasConvertibleContent,
  saveQuizEditor,
  validateQuizQuestion,
  type QuizEditorFormValues,
  type QuizQuestionFormValues,
} from './quizzes'
import { pickKioskUnitIdForSession } from './curriculum'

vi.mock('./supabase', () => {
  const deleteEq = vi.fn()
  const deleteFn = vi.fn(() => ({ eq: deleteEq }))
  return {
    supabase: {
      from: vi.fn(() => ({
        delete: deleteFn,
      })),
      __mocks: { deleteEq, deleteFn },
    },
  }
})

import { supabase } from './supabase'

function question(
  overrides: Partial<QuizQuestionFormValues> = {},
): QuizQuestionFormValues {
  return {
    clientId: 'q1',
    prompt: 'What is 2+2?',
    options: ['3', '4', '5'],
    correctIndex: 1,
    ...overrides,
  }
}

describe('validateQuizQuestion / normalize', () => {
  it('rejects blank option rows', () => {
    expect(
      validateQuizQuestion(
        question({ options: ['A', '', 'C'], correctIndex: 0 }),
        0,
      ),
    ).toMatch(/blank option/i)
  })

  it('accepts filled options with correct index', () => {
    expect(validateQuizQuestion(question(), 0)).toBeNull()
  })

  it('remaps correct index only when no blanks', () => {
    expect(
      normalizeQuestionOptionsForSave(
        question({ options: [' A ', ' B '], correctIndex: 1 }),
      ),
    ).toEqual({ options: ['A', 'B'], correctIndex: 1 })
  })

  it('returns null when marked-correct row is blank', () => {
    expect(
      normalizeQuestionOptionsForSave(
        question({ options: ['A', '', 'C'], correctIndex: 1 }),
      ),
    ).toBeNull()
  })

  it('formQuestionToInsert uses remapped index', () => {
    const insert = formQuestionToInsert(
      question({ options: ['A', 'B'], correctIndex: 1 }),
      'quiz-1',
      0,
    )
    expect(insert.options).toEqual(['A', 'B'])
    expect(insert.correct_index).toBe(1)
  })
})

describe('format convert guards', () => {
  it('detects convertible content', () => {
    const empty: QuizEditorFormValues = {
      title: 'Quiz',
      format: 'multiple_choice',
      questions: [question({ prompt: '', options: ['', ''] })],
    }
    expect(quizEditorHasConvertibleContent(empty)).toBe(false)

    expect(
      quizEditorHasConvertibleContent({
        ...empty,
        questions: [question()],
      }),
    ).toBe(true)
  })

  it('resets options and correctIndex on format switch', () => {
    const converted = convertQuizEditorFormat(
      {
        title: 'Quiz',
        format: 'multiple_choice',
        questions: [question({ correctIndex: 2 })],
      },
      'true_false',
    )
    expect(converted.format).toBe('true_false')
    expect(converted.questions[0].options).toEqual(['True', 'False'])
    expect(converted.questions[0].correctIndex).toBe(0)
  })
})

describe('pickKioskUnitIdForSession', () => {
  it('picks newest created_at', () => {
    const winner = pickKioskUnitIdForSession('s1', [
      {
        id: 'old',
        session_id: 's1',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'new',
        session_id: 's1',
        created_at: '2026-06-01T00:00:00Z',
      },
    ])
    expect(winner).toBe('new')
  })
})

describe('saveQuizEditor empty clear', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mocks = (
      supabase as unknown as {
        __mocks: {
          deleteEq: ReturnType<typeof vi.fn>
          deleteFn: ReturnType<typeof vi.fn>
        }
      }
    ).__mocks
    mocks.deleteEq.mockResolvedValue({ error: null })
    mocks.deleteFn.mockReturnValue({ eq: mocks.deleteEq })
  })

  it('deletes existing quiz when questions are empty', async () => {
    const result = await saveQuizEditor('unit-1', 'quiz-1', ['q1'], {
      title: 'Quiz',
      format: 'multiple_choice',
      questions: [],
    })
    expect(result).toBeNull()
    expect(supabase.from).toHaveBeenCalledWith('quizzes')
  })

  it('no-ops when empty and no existing quiz', async () => {
    const result = await saveQuizEditor('unit-1', null, [], {
      title: 'Quiz',
      format: 'multiple_choice',
      questions: [],
    })
    expect(result).toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
