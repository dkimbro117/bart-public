export const REMINDER_PLACEHOLDERS = [
  'session_title',
  'session_date',
  'session_label',
  'guardian_name',
] as const

export type ReminderPlaceholder = (typeof REMINDER_PLACEHOLDERS)[number]

export type ReminderTemplateContext = Record<ReminderPlaceholder, string>

function formatSessionDate(sessionDate: string): string {
  const parsed = new Date(`${sessionDate}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return sessionDate
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatSessionLabel(title: string, sessionDate: string): string {
  const parsed = new Date(`${sessionDate}T12:00:00`)
  const formattedDate = Number.isNaN(parsed.getTime())
    ? sessionDate
    : parsed.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
  return `${title} — ${formattedDate}`
}

export function buildReminderTemplateContext(input: {
  sessionTitle: string
  sessionDate: string
  guardianName: string | null
}): ReminderTemplateContext {
  return {
    session_title: input.sessionTitle,
    session_date: formatSessionDate(input.sessionDate),
    session_label: formatSessionLabel(input.sessionTitle, input.sessionDate),
    guardian_name: input.guardianName?.trim() || 'there',
  }
}

export function renderReminderTemplate(
  template: string,
  context: ReminderTemplateContext,
): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => {
    if (key in context) {
      return context[key as ReminderPlaceholder]
    }
    return match
  })
}

export const SAMPLE_REMINDER_CONTEXT = buildReminderTemplateContext({
  sessionTitle: 'Spring Reading Night',
  sessionDate: '2026-04-15',
  guardianName: 'Maria',
})
