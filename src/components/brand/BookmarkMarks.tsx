import type { CSSProperties } from 'react'

type BookmarkMarksProps = {
  className?: string
}

function BookmarkIcon({ style }: { style?: CSSProperties }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 32"
      className="h-8 w-6 text-bookmark-gold drop-shadow-sm"
      style={style}
      fill="currentColor"
    >
      <path d="M4 0h16a2 2 0 0 1 2 2v30l-10-6L2 32V2a2 2 0 0 1 2-2z" />
    </svg>
  )
}

export default function BookmarkMarks({ className = '' }: BookmarkMarksProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <BookmarkIcon
        style={{ position: 'absolute', left: '8%', top: '6%', transform: 'rotate(-12deg)' }}
      />
      <BookmarkIcon
        style={{ position: 'absolute', right: '10%', top: '14%', transform: 'rotate(8deg)' }}
      />
      <BookmarkIcon
        style={{
          position: 'absolute',
          left: '18%',
          bottom: '12%',
          transform: 'rotate(6deg) scale(1.15)',
        }}
      />
    </div>
  )
}
