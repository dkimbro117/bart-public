import {
  MAX_QUIZ_OPTIONS,
  MIN_QUIZ_OPTIONS,
  newQuizQuestionFormValues,
  type QuizEditorFormValues,
  type QuizQuestionFormValues,
} from '../../lib/quizzes'
import { createId } from '../../lib/createId'
import {
  btnGhost,
  headingSection,
  inputClass,
  labelClass,
  sectionCard,
  textareaClass,
} from '../../ui/classes'

type QuizEditorProps = {
  values: QuizEditorFormValues
  onChange: (values: QuizEditorFormValues) => void
  disabled?: boolean
}

export default function QuizEditor({
  values,
  onChange,
  disabled = false,
}: QuizEditorProps) {
  function updateQuizTitle(title: string) {
    onChange({ ...values, title })
  }

  function updateQuestions(questions: QuizQuestionFormValues[]) {
    onChange({ ...values, questions })
  }

  function updateQuestion(
    clientId: string,
    updater: (question: QuizQuestionFormValues) => QuizQuestionFormValues,
  ) {
    updateQuestions(
      values.questions.map((question) =>
        question.clientId === clientId ? updater(question) : question,
      ),
    )
  }

  function addQuestion() {
    updateQuestions([...values.questions, newQuizQuestionFormValues()])
  }

  function removeQuestion(clientId: string) {
    updateQuestions(
      values.questions.filter((question) => question.clientId !== clientId),
    )
  }

  function duplicateQuestion(clientId: string) {
    const index = values.questions.findIndex(
      (question) => question.clientId === clientId,
    )
    if (index < 0) {
      return
    }

    const source = values.questions[index]
    const copy: QuizQuestionFormValues = {
      clientId: createId(),
      prompt: source.prompt,
      options: [...source.options],
      correctIndex: source.correctIndex,
      aiDrafted: source.aiDrafted,
    }
    const next = [...values.questions]
    next.splice(index + 1, 0, copy)
    updateQuestions(next)
  }

  function moveQuestion(clientId: string, direction: -1 | 1) {
    const index = values.questions.findIndex(
      (question) => question.clientId === clientId,
    )
    if (index < 0) {
      return
    }

    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= values.questions.length) {
      return
    }

    const next = [...values.questions]
    const [moved] = next.splice(index, 1)
    next.splice(targetIndex, 0, moved)
    updateQuestions(next)
  }

  function addOption(question: QuizQuestionFormValues) {
    if (question.options.length >= MAX_QUIZ_OPTIONS) {
      return
    }

    updateQuestion(question.clientId, (current) => ({
      ...current,
      options: [...current.options, ''],
    }))
  }

  function removeOption(question: QuizQuestionFormValues, optionIndex: number) {
    if (question.options.length <= MIN_QUIZ_OPTIONS) {
      return
    }

    updateQuestion(question.clientId, (current) => {
      const nextOptions = current.options.filter(
        (_, index) => index !== optionIndex,
      )
      let nextCorrectIndex = current.correctIndex
      if (optionIndex === current.correctIndex) {
        nextCorrectIndex = 0
      } else if (optionIndex < current.correctIndex) {
        nextCorrectIndex -= 1
      }

      return {
        ...current,
        options: nextOptions,
        correctIndex: nextCorrectIndex,
      }
    })
  }

  return (
    <section className={`space-y-5 ${sectionCard}`}>
      <div>
        <h2 className={headingSection}>Quiz</h2>
        <p className="mt-1 text-sm text-slate-500">
          Multiple-choice questions for this unit. Each question needs 2–5 options
          with exactly one marked correct.
        </p>
      </div>

      <label className="block">
        <span className={labelClass}>Quiz title</span>
        <input
          type="text"
          disabled={disabled}
          value={values.title}
          onChange={(event) => updateQuizTitle(event.target.value)}
          placeholder="e.g. Unit 3 comprehension check"
          className={inputClass}
        />
      </label>

      {values.questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-cream-300 px-4 py-8 text-center text-sm text-slate-500">
          No questions yet. Add the first question to build this quiz.
        </div>
      ) : (
        <ol className="space-y-4">
          {values.questions.map((question, index) => (
            <li
              key={question.clientId}
              className="space-y-4 rounded-xl border border-cream-200 bg-cream-50/50 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-crimson-700">
                    Question {index + 1}
                  </p>
                  {question.aiDrafted && (
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                      AI draft — review before saving
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    onClick={() => moveQuestion(question.clientId, -1)}
                    className="min-h-10 touch-manipulation rounded-lg border border-crimson-600 bg-white px-3 text-sm font-semibold text-crimson-700 hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === values.questions.length - 1}
                    onClick={() => moveQuestion(question.clientId, 1)}
                    className="min-h-10 touch-manipulation rounded-lg border border-crimson-600 bg-white px-3 text-sm font-semibold text-crimson-700 hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => duplicateQuestion(question.clientId)}
                    className="min-h-10 touch-manipulation rounded-lg border border-crimson-600 bg-white px-3 text-sm font-semibold text-crimson-700 hover:bg-cream-100 disabled:opacity-50"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeQuestion(question.clientId)}
                    className="min-h-10 touch-manipulation rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <label className="block">
                <span className={labelClass}>Prompt</span>
                <textarea
                  disabled={disabled}
                  value={question.prompt}
                  onChange={(event) =>
                    updateQuestion(question.clientId, (current) => ({
                      ...current,
                      prompt: event.target.value,
                      aiDrafted: false,
                    }))
                  }
                  placeholder="What should the boy answer?"
                  className={textareaClass}
                />
              </label>

              <fieldset className="space-y-3">
                <legend className={labelClass}>
                  Answer options (mark one correct)
                </legend>
                {question.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex flex-col gap-2 sm:flex-row">
                    <label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-cream-200 bg-white px-3">
                      <input
                        type="radio"
                        name={`correct-${question.clientId}`}
                        disabled={disabled}
                        checked={question.correctIndex === optionIndex}
                        onChange={() =>
                          updateQuestion(question.clientId, (current) => ({
                            ...current,
                            correctIndex: optionIndex,
                          }))
                        }
                        className="h-5 w-5 border-cream-300 bg-white text-crimson-600 focus:ring-crimson-500"
                      />
                      <input
                        type="text"
                        disabled={disabled}
                        value={option}
                        onChange={(event) =>
                          updateQuestion(question.clientId, (current) => {
                            const nextOptions = [...current.options]
                            nextOptions[optionIndex] = event.target.value
                            return {
                              ...current,
                              options: nextOptions,
                              aiDrafted: false,
                            }
                          })
                        }
                        placeholder={`Option ${optionIndex + 1}`}
                        className="min-h-10 flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={
                        disabled || question.options.length <= MIN_QUIZ_OPTIONS
                      }
                      onClick={() => removeOption(question, optionIndex)}
                      className="min-h-12 min-w-12 touch-manipulation rounded-xl border border-crimson-600 bg-white px-3 text-sm font-semibold text-crimson-700 hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Remove option ${optionIndex + 1}`}
                    >
                      −
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={disabled || question.options.length >= MAX_QUIZ_OPTIONS}
                  onClick={() => addOption(question)}
                  className="min-h-12 w-full touch-manipulation rounded-xl border border-dashed border-cream-300 px-4 text-sm font-semibold text-crimson-700 hover:border-cream-400 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Add option
                </button>
              </fieldset>
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={addQuestion}
        className={`w-full border border-dashed border-cream-300 ${btnGhost}`}
      >
        + Add question
      </button>
    </section>
  )
}
