import { useEffect, useState } from 'react'

const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'number',
  'tel',
  'url',
  'password',
])

function opensSoftKeyboard(element: EventTarget | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false
  }
  if (element.isContentEditable || element instanceof HTMLTextAreaElement) {
    return true
  }
  if (element instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(element.type)
  }
  return false
}

/**
 * True while a text field is focused, and therefore while the on-screen
 * keyboard is likely covering the bottom of the screen.
 *
 * iOS re-anchors `position: fixed` elements to the visual viewport when the
 * keyboard opens, which drops the floating nav into the middle of the page —
 * on manual check-in it landed on top of the search results and made a
 * matching boy untappable.
 */
export function useSoftKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onFocusIn(event: FocusEvent) {
      if (opensSoftKeyboard(event.target)) {
        setOpen(true)
      }
    }

    function onFocusOut(event: FocusEvent) {
      // Tabbing between two fields should not flash the nav back in.
      if (opensSoftKeyboard(event.relatedTarget)) {
        return
      }
      setOpen(false)
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  return open
}
