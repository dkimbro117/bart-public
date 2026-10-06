/** Tailwind `lg` breakpoint — desktop side nav vs mobile floating nav. */
export const DESKTOP_MIN_WIDTH_PX = 1024

export const MANUAL_INPUT_PREFERENCE_KEY = 'bart_prefer_manual_input'

export function readManualInputPreference(): boolean {
  try {
    return sessionStorage.getItem(MANUAL_INPUT_PREFERENCE_KEY) === '1'
  } catch {
    return false
  }
}

export function persistManualInputPreference(): void {
  try {
    sessionStorage.setItem(MANUAL_INPUT_PREFERENCE_KEY, '1')
  } catch {
    // sessionStorage may be unavailable in private mode.
  }
}

export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`).matches
}
