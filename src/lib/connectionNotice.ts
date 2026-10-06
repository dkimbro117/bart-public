import type { ConnectionState } from './sync'

/**
 * One plain-language line for the header status strip, or null when there is
 * nothing worth a full-width banner. A 10px dot was not enough signal for a
 * door with flaky Wi-Fi.
 *
 * Returns null while online even with queued work: the Sync button carries a
 * count badge, and a strip that appears after every check-in would shift the
 * whole page down on the hot path.
 */
export function buildConnectionNotice(
  connectionState: ConnectionState,
  pendingCount: number,
): string | null {
  if (connectionState === 'online') {
    return null
  }

  const waiting = pendingCount === 1 ? '1 change' : `${pendingCount} changes`
  const reason =
    connectionState === 'offline' ? 'Offline.' : 'Can’t reach the server.'

  return pendingCount > 0
    ? `${reason} ${waiting} saved on this device.`
    : `${reason} Work is saved on this device.`
}
