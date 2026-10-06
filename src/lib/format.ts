export function formatDisplayId(displayId: number): string {
  return `#${String(displayId).padStart(4, '0')}`
}

/**
 * Staff surfaces pass `lastName` when known → "Marcus Adams".
 * Boy-facing /go and kiosk omit it → "Marcus A."
 */
export function formatParticipantName(
  firstName: string,
  lastInitial: string,
  lastName?: string | null,
): string {
  const surname = lastName?.trim()
  if (surname) {
    return `${firstName} ${surname}`
  }
  const initial = lastInitial.trim() || '?'
  return `${firstName} ${initial}.`
}
