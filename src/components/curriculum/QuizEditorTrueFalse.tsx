import {
  newTrueFalseQuestionFormValues,
  TRUE_FALSE_OPTION_LABELS,
  type QuizEditorFormValues,
  type QuizQuestionFormValues,
} from '../../lib/quizzes'
import { createId } from '../../lib/createId'
import {
  headingSection,
  inputClass,
  labelClass,
  sectionCard,
  textareaClass,
} from '../../ui/classes'

type QuizEditorTrueFalseProps = {
  values: QuizEditorFormValues
  onChange: (values: QuizEditorFormValues) => void
  disabled?: boolean
}

export default function QuizEditorTrueFalse({
  values,
  onChange,
  disabled = false,
}: QuizEditorTrueFalseProps) {
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

  function addStatement() {
    updateQuestions([...values.questions, newTrueFalseQuestionFormValues()])
  }

  function removeStatement(clientId: string) {
    updateQuestions(
      values.questions.filter((question) => question.clientId !== clientId),
    )
  }

  function duplicateStatement(clientId: string) {
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
      options: [...TRUE_FALSE_OPTION_LABELS],
      correctIndex: source.correctIndex,
      aiDrafted: source.aiDrafted,
    }
    const next = [...values.questions]
    next.splice(index + 1, 0, copy)
    updateQuestions(next)
  }

  function moveStatement(clientId: string, direction: -1 | 1) {
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

  const controlClass =
    'min-h-10 touch-manipulation rounded-lg border border-crimson-600 bg-white px-3 text-sm font-semibold text-crimson-700 hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <section className={`space-y-5 ${sectionCard}`}>
      <div>
        <h2 className={headingSection}>True / False quiz</h2>
        <p className="mt-1 text-sm text-slate-500">
          Each statement is shown one at a time on the kiosk. Boys swipe or tap
          True or False. Answers are scored at the end.
        </p>
      </div>

      <label className="block">
        <span className={labelClass}>Quiz title</span>
        <input
          type="text"
          disabled={disabled}
          value={values.title}
          onChange={(event) => updateQuizTitle(event.target.value)}
          className={inputClass}
        />
      </label>

      <div className="space-y-4">
        {values.questions.map((question, index) => (
          <div
            key={question.clientId}
            className="space-y-3 rounded-xl border border-cream-200 bg-cream-50/80 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">
                Statement {index + 1}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  onClick={() => moveStatement(question.clientId, -1)}
                  className={controlClass}
                >
                  Move up
                </button>
                <button
                  type="button"
                  disabled={disabled || index === values.questions.length - 1}
                  onClick={() => moveStatement(question.clientId, 1)}
                  className={controlClass}
                >
                  Move down
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => duplicateStatement(question.clientId)}
                  className={controlClass}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeStatement(question.clientId)}
                  className="min-h-10 touch-manipulation rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>

            <label className="block">
              <span className={labelClass}>Statement</span>
              <textarea
                disabled={disabled}
                value={question.prompt}
                onChange={(event) =>
                  updateQuestion(question.clientId, (current) => ({
                    ...current,
                    prompt: event.target.value,
                  }))
                }
                rows={3}
                className={textareaClass}
              />
            </label>

            <fieldset>
              <legend className={labelClass}>Correct answer</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {TRUE_FALSE_OPTION_LABELS.map((label, optionIndex) => (
                  <label
                    key={label}
                    className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-cream-200 bg-white px-4 py-2 text-base font-semibold text-slate-800 has-checked:border-crimson-600 has-checked:bg-crimson-50"
                  >
                    <input
                      type="radio"
                      name={`tf-correct-${question.clientId}`}
                      disabled={disabled}
                      checked={question.correctIndex === optionIndex}
                      onChange={() =>
                        updateQuestion(question.clientId, (current) => ({
                          ...current,
                          correctIndex: optionIndex,
                          options: [...TRUE_FALSE_OPTION_LABELS],
                        }))
                      }
                      className="size-4 accent-crimson-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={addStatement}
        className="min-h-12 w-full touch-manipulation rounded-xl border border-dashed border-crimson-300 bg-white px-4 text-base font-semibold text-crimson-700 hover:bg-cream-50 disabled:opacity-60"
      >
        Add statement
      </button>
    </section>
  )
}
