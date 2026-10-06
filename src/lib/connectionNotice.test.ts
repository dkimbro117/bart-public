import { describe, expect, it } from 'vitest'
import { buildConnectionNotice } from './connectionNotice'

describe('buildConnectionNotice', () => {
  it('stays silent while online so the header does not shift mid-check-in', () => {
    expect(buildConnectionNotice('online', 0)).toBeNull()
    expect(buildConnectionNotice('online', 4)).toBeNull()
  })

  it('reassures that offline work is not lost', () => {
    expect(buildConnectionNotice('offline', 0)).toBe(
      'Offline. Work is saved on this device.',
    )
    expect(buildConnectionNotice('offline', 2)).toBe(
      'Offline. 2 changes saved on this device.',
    )
  })

  it('separates unreachable from offline', () => {
    expect(buildConnectionNotice('unreachable', 1)).toBe(
      'Can’t reach the server. 1 change saved on this device.',
    )
    expect(buildConnectionNotice('unreachable', 0)).toBe(
      'Can’t reach the server. Work is saved on this device.',
    )
  })
})
