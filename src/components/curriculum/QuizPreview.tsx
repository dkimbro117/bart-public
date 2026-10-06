import { type QuizEditorFormValues } from '../../lib/quizzes'
import { isTrueFalseFormat } from '../../lib/quizFormat'
import { headingSection, sectionCard } from '../../ui/classes'

type QuizPreviewProps = {
  values: QuizEditorFormValues
}

export default function QuizPreview({ values }: QuizPreviewProps) {
  if (values.questions.length === 0) {
    return null
  }

  const trueFalse = isTrueFalseFormat(values.format)

  return (
    <div className={`${sectionCard} space-y-4`}>
      <div>
        <h2 className={headingSection}>Answer key (staff)</h2>
        <p className="mt-1 text-sm text-slate-600">
          {trueFalse
            ? 'Boys see one statement at a time and swipe or tap True / False. Correct answers are highlighted here for staff only.'
            : 'Correct answers are highlighted for staff only. Boys see the same prompts and choices without the green highlight.'}
        </p>
      </div>

      <ol className="space-y-6">
        {values.questions.map((question, index) => {
          const options = trueFalse
            ? ['True', 'False']
            : question.options.filter((option) => option.trim())

          return (
            <li
              key={question.clientId}
              className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-4"
            >
              <p className="text-sm font-medium text-slate-500">
                {trueFalse ? 'Statement' : 'Question'} {index + 1}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {question.prompt.trim() || '(No prompt yet)'}
              </p>
              {trueFalse ? (
                <p className="mt-3 text-sm font-medium text-emerald-800">
                  Correct: {options[question.correctIndex]}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {options.map((option, optionIndex) => {
                    const isCorrect = optionIndex === question.correctIndex

                    return (
                      <li
                        key={optionIndex}
                        className={[
                          'rounded-lg border px-3 py-2 text-base',
                          isCorrect
                            ? 'border-emerald-300 bg-emerald-50 font-medium text-emerald-900'
                            : 'border-cream-200 bg-white text-slate-800',
                        ].join(' ')}
                      >
                        {option}
                        {isCorrect && (
                          <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                            Correct
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
