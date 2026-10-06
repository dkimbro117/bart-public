import { describe, expect, it } from 'vitest'
import { formatDisplayId } from './format'

describe('formatDisplayId', () => {
  it('pads legacy ids to four digits', () => {
    expect(formatDisplayId(1)).toBe('#0001')
  })

  it('formats year-prefixed ids without extra zeros', () => {
    expect(formatDisplayId(2601)).toBe('#2601')
    expect(formatDisplayId(26140)).toBe('#26140')
  })
})
