import { supabase } from './supabase'

export type GuardianReportRecipientStatus = 'sent' | 'failed' | 'skipped_no_email'

export type GuardianReportRecipientResult = {
  participant_id: string
  display_id: number | null
  participant_name: string
  guardian_email: string | null
  status: GuardianReportRecipientStatus
  error?: string
}

export type SendSessionGuardianReportsResult = {
  session_id: string
  session_title: string
  session_date: string
  skipped_no_email: number
  sent: number
  failed: number
  results: GuardianReportRecipientResult[]
}

function isSendResult(value: unknown): value is SendSessionGuardianReportsResult {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as SendSessionGuardianReportsResult
  return (
    typeof candidate.session_id === 'string' &&
    Array.isArray(candidate.results)
  )
}

export async function sendSessionGuardianReports(
  sessionId: string,
): Promise<SendSessionGuardianReportsResult> {
  const { data, error } = await supabase.functions.invoke('send-session-reports', {
    body: { session_id: sessionId },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const message =
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'Failed to send guardian reports.'
    throw new Error(message)
  }

  if (!isSendResult(data)) {
    throw new Error('Unexpected response from send-session-reports.')
  }

  return data
}
