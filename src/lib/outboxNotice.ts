export type OutboxNotice = {
  waitingForCheckIn: number
  message: string | null
}

const CHECKOUT_WAIT_TIMEOUT_MS = 30 * 60 * 1000

type NoticeEntry = {
  type: string
  participant_id: string
  session_id: string
  created_at: string
}

export function buildOutboxNotice(
  entries: NoticeEntry[],
  now = Date.now(),
): OutboxNotice {
  const checkoutEntries = entries.filter((entry) => entry.type === 'check_out')
  if (checkoutEntries.length === 0) {
    return { waitingForCheckIn: 0, message: null }
  }

  const waitingForCheckIn = checkoutEntries.filter((checkout) =>
    entries.some(
      (entry) =>
        entry.type === 'check_in' &&
        entry.participant_id === checkout.participant_id &&
        entry.session_id === checkout.session_id,
    ),
  ).length

  const stale = checkoutEntries.find(
    (entry) =>
      now - new Date(entry.created_at).getTime() > CHECKOUT_WAIT_TIMEOUT_MS,
  )

  if (waitingForCheckIn > 0) {
    return {
      waitingForCheckIn,
      message: stale
        ? 'A checkout is waiting for its check-in to reach the server. Tap Sync now or refresh roster; contact an admin if this persists.'
        : `${waitingForCheckIn} checkout${waitingForCheckIn === 1 ? '' : 's'} waiting for check-in to sync to the server.`,
    }
  }

  return {
    waitingForCheckIn: 0,
    message: stale
      ? 'A checkout is still waiting to sync. Tap Sync now; contact an admin if this persists.'
      : `${checkoutEntries.length} checkout${checkoutEntries.length === 1 ? '' : 's'} waiting to sync to the server.`,
  }
}
