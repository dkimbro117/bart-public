/**
 * Best-effort tap confirmation for door volunteers working in a loud room.
 *
 * iOS Safari does not implement the Vibration API, so this is a no-op on
 * iPhone and iPad. Never rely on it as the only confirmation of an action.
 */
export function confirmHaptic(pattern: number | number[] = 20): void {
  const nav = typeof navigator === 'undefined' ? null : navigator
  if (!nav || typeof nav.vibrate !== 'function') {
    return
  }

  try {
    nav.vibrate(pattern)
  } catch {
    // Vibration is decoration; a rejected call must never break a check-in.
  }
}
