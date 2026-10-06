export function todayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/** Compact form for the header session picker, which truncates on phones. */
export function formatSessionOptionLabel(
  title: string,
  sessionDate: string,
): string {
  return `${title} · ${new Date(`${sessionDate}T12:00:00`).toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric' },
  )}`
}

export function formatClockTime(value: Date): string {
  return value.toLocaleTimeString(undefined, { timeStyle: 'short' })
}

export function formatSessionLabel(title: string, sessionDate: string): string {
  return `${title} (${new Date(`${sessionDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })})`
}

/** True when value is a calendar date `YYYY-MM-DD`. */
export function isIsoDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  )
}

export function isoDateFromParts(
  year: number,
  monthIndex: number,
  day: number,
): string {
  const month = String(monthIndex + 1).padStart(2, '0')
  const dayPart = String(day).padStart(2, '0')
  return `${year}-${month}-${dayPart}`
}

export function shiftMonth(
  year: number,
  monthIndex: number,
  delta: number,
): { year: number; monthIndex: number } {
  const next = new Date(year, monthIndex + delta, 1)
  return { year: next.getFullYear(), monthIndex: next.getMonth() }
}

export function formatMonthYearLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export type MonthGridCell = {
  iso: string
  day: number
  inMonth: boolean
}

/** Sunday-start month grid (6 weeks × 7 days) for calendar UIs. */
export function buildMonthGrid(
  year: number,
  monthIndex: number,
): MonthGridCell[] {
  const first = new Date(year, monthIndex, 1)
  const startOffset = first.getDay()
  const gridStart = new Date(year, monthIndex, 1 - startOffset)
  const cells: MonthGridCell[] = []

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    )
    cells.push({
      iso: isoDateFromParts(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      ),
      day: date.getDate(),
      inMonth: date.getMonth() === monthIndex,
    })
  }

  return cells
}
