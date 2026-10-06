export const KIOSK_PREVIEW_PREFIX = '/kiosk/preview'

export type KioskProductionPath = '/kiosk/reading' | '/kiosk/quiz'
export type KioskPreviewPath =
  | '/kiosk/preview/reading'
  | '/kiosk/preview/quiz'

export type KioskPath = KioskProductionPath | KioskPreviewPath

export function isKioskPreviewPath(pathname: string): boolean {
  return pathname.startsWith(KIOSK_PREVIEW_PREFIX)
}

export function isKioskProductionPath(pathname: string): boolean {
  return (
    pathname.startsWith('/kiosk/') && !isKioskPreviewPath(pathname)
  )
}

export function kioskReadingPath(preview: boolean): KioskPath {
  return preview ? '/kiosk/preview/reading' : '/kiosk/reading'
}

export function kioskQuizPath(preview: boolean): KioskPath {
  return preview ? '/kiosk/preview/quiz' : '/kiosk/quiz'
}
