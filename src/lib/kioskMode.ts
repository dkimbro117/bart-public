export const KIOSK_LOCKED_KEY = 'bart:kiosk-locked'
export const KIOSK_PIN_HASH_KEY = 'bart:kiosk-pin-hash'
export const KIOSK_STAFF_EMAIL_KEY = 'bart:kiosk-staff-email'

export type PrimeCacheScope = 'full' | 'kiosk'

export function isKioskLocked(): boolean {
  return sessionStorage.getItem(KIOSK_LOCKED_KEY) === 'true'
}

export function getKioskPinHash(): string | null {
  return sessionStorage.getItem(KIOSK_PIN_HASH_KEY)
}

export function getKioskStaffEmail(): string | null {
  return sessionStorage.getItem(KIOSK_STAFF_EMAIL_KEY)
}

export function setKioskLocked(pinHash: string, staffEmail: string): void {
  sessionStorage.setItem(KIOSK_LOCKED_KEY, 'true')
  sessionStorage.setItem(KIOSK_PIN_HASH_KEY, pinHash)
  sessionStorage.setItem(KIOSK_STAFF_EMAIL_KEY, staffEmail)
}

export function clearKioskLock(): void {
  sessionStorage.removeItem(KIOSK_LOCKED_KEY)
  sessionStorage.removeItem(KIOSK_PIN_HASH_KEY)
  sessionStorage.removeItem(KIOSK_STAFF_EMAIL_KEY)
}

export function primeCacheScopeForDevice(): PrimeCacheScope {
  return isKioskLocked() ? 'kiosk' : 'full'
}

export function isValidKioskPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

export async function hashKioskPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyKioskPin(pin: string): Promise<boolean> {
  const stored = getKioskPinHash()
  if (!stored) {
    return false
  }
  const candidate = await hashKioskPin(pin)
  return candidate === stored
}
