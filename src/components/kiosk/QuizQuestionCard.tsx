type QuizQuestionCardProps = {
  prompt: string
  options: string[]
  selectedIndex: number | null
  disabled?: boolean
  onSelect: (index: number) => void
}

export default function QuizQuestionCard({
  prompt,
  options,
  selectedIndex,
  disabled = false,
  onSelect,
}: QuizQuestionCardProps) {
  return (
    <div className="space-y-6">
      <p className="text-2xl font-semibold leading-snug text-slate-900">{prompt}</p>
      <div className="flex flex-col gap-4">
        {options.map((option, index) => {
          const selected = selectedIndex === index
          return (
            <button
              key={`${index}-${option}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(index)}
              className={[
                'min-h-16 w-full touch-manipulation rounded-2xl border px-5 py-4 text-left text-xl font-semibold transition-colors',
                selected
                  ? 'border-crimson-600 bg-crimson-600 text-cream-50'
                  : 'border-cream-200 bg-white text-slate-900 hover:bg-cream-50',
                disabled ? 'cursor-not-allowed opacity-60' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
