import { describe, expect, it } from 'vitest'
import { buildOutboxNotice } from './outboxNotice'
import { signatureSyncErrorMessage } from './signatures'

describe('buildOutboxNotice', () => {
  it('explains checkout blocked by unsynced check-in', () => {
    const notice = buildOutboxNotice([
      {
        type: 'check_in',
        participant_id: 'p1',
        session_id: 's1',
        created_at: new Date().toISOString(),
      },
      {
        type: 'check_out',
        participant_id: 'p1',
        session_id: 's1',
        created_at: new Date().toISOString(),
      },
    ])
    expect(notice.waitingForCheckIn).toBe(1)
    expect(notice.message).toMatch(/waiting for check-in/)
  })

  it('does not blame check-in when only checkout is queued', () => {
    const notice = buildOutboxNotice([
      {
        type: 'check_out',
        participant_id: 'p1',
        session_id: 's1',
        created_at: new Date().toISOString(),
      },
    ])
    expect(notice.waitingForCheckIn).toBe(0)
    expect(notice.message).toMatch(/waiting to sync/)
  })
})

describe('signatureSyncErrorMessage', () => {
  it('maps a missing table to an apply-migrations hint', () => {
    expect(
      signatureSyncErrorMessage(
        "Could not find the table 'public.attendance_signatures' in the schema cache",
      ),
    ).toMatch(/E-sign table is missing/)
  })
})
