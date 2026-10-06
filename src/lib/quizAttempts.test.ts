import { describe, expect, it, vi } from 'vitest'
import type { Tables } from '../types/database'

// quizAttempts pulls supabase via sync; createClient throws on Node < 22
// without a WebSocket transport (CI uses Node 20 unless bumped).
vi.mock('./supabase', () => ({ supabase: {} }))

import { recordQuizAnswer, scoreQuizAnswers } from './quizAttempts'

function question(id: string, correctIndex: number): Tables<'quiz_questions'> {
  return {
    id,
    prompt: `Question ${id}`,
    options: ['True', 'False'],
    position: 0,
    quiz_id: 'quiz-1',
    correct_index: correctIndex,
    ai_drafted: false,
  }
}

describe('recordQuizAnswer', () => {
  it('adds an answer without touching the others', () => {
    const answers = recordQuizAnswer({ a: 0 }, 'b', 1)
    expect(answers).toEqual({ a: 0, b: 1 })
  })

  it('overwrites rather than appending when a question is answered twice', () => {
    const first = recordQuizAnswer({}, 'a', 1)
    const second = recordQuizAnswer(first, 'a', 0)

    expect(Object.keys(second)).toEqual(['a'])
    expect(second.a).toBe(0)
  })

  it('does not mutate the previous map', () => {
    const first = recordQuizAnswer({}, 'a', 1)
    recordQuizAnswer(first, 'a', 0)

    expect(first.a).toBe(1)
  })
})

describe('going back and re-answering', () => {
  it('scores the corrected answer, not the original', () => {
    const questions = [question('a', 0), question('b', 1)]

    let answers = recordQuizAnswer({}, 'a', 1)
    answers = recordQuizAnswer(answers, 'b', 1)
    expect(scoreQuizAnswers(questions, answers)).toEqual({ score: 1, total: 2 })

    answers = recordQuizAnswer(answers, 'a', 0)
    expect(scoreQuizAnswers(questions, answers)).toEqual({ score: 2, total: 2 })
  })
})
