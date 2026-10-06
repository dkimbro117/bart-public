export const PARTICIPANT_GO_TOKEN_KEY = 'bart:participant-go-token'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isParticipantQrToken(value: string): boolean {
  return UUID_PATTERN.test(value.trim())
}

/** Extract qr_token from a scan, URL, or raw UUID string. */
export function parseParticipantGoBadgeInput(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (isParticipantQrToken(trimmed)) {
    return trimmed
  }

  const urlMatch = trimmed.match(
    /[?&]t=([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i,
  )
  if (urlMatch?.[1] && isParticipantQrToken(urlMatch[1])) {
    return urlMatch[1]
  }

  return null
}

export function normalizeParticipantGoToken(value: string): string | null {
  return parseParticipantGoBadgeInput(value)
}

/** Normalize manual badge entry before server lookup (spaces, unicode digits). */
export function normalizeParticipantBadgeInput(value: string): string {
  const trimmed = value.normalize('NFKC').trim()
  if (!trimmed) {
    return ''
  }

  const withoutSpaces = trimmed.replace(/\s+/g, '')
  if (!withoutSpaces) {
    return ''
  }

  return withoutSpaces
}

export function isParticipantDisplayIdInput(value: string): boolean {
  const normalized = normalizeParticipantBadgeInput(value)
  const digits = normalized.replace(/^#/, '')
  return /^\d{1,9}$/.test(digits)
}

export function readParticipantGoToken(): string | null {
  const stored = sessionStorage.getItem(PARTICIPANT_GO_TOKEN_KEY)
  if (!stored) {
    return null
  }
  return normalizeParticipantGoToken(stored)
}

export function writeParticipantGoToken(token: string): boolean {
  const normalized = normalizeParticipantGoToken(token)
  if (!normalized) {
    return false
  }
  sessionStorage.setItem(PARTICIPANT_GO_TOKEN_KEY, normalized)
  return true
}

export function clearParticipantGoToken(): void {
  sessionStorage.removeItem(PARTICIPANT_GO_TOKEN_KEY)
}

/** Clear this boy's session and return to the shared scanner. */
export function signOutParticipantGo(): void {
  clearParticipantGoToken()
}

export function participantGoQuizUrl(token?: string): string {
  if (token && normalizeParticipantGoToken(token)) {
    return `/go/quiz?t=${encodeURIComponent(token)}`
  }
  return '/go/quiz'
}

export function participantGoProfileUrl(token?: string): string {
  if (token && normalizeParticipantGoToken(token)) {
    return `/go/profile?t=${encodeURIComponent(token)}`
  }
  return '/go/profile'
}

export function participantGoLinkForToken(token: string, origin = window.location.origin): string {
  const normalized = normalizeParticipantGoToken(token)
  if (!normalized) {
    return `${origin}/go`
  }
  return `${origin}/go?t=${encodeURIComponent(normalized)}`
}
