import { describe, expect, it } from 'vitest'
import {
  isParticipantDisplayIdInput,
  normalizeParticipantBadgeInput,
  parseParticipantGoBadgeInput,
} from './participantGoToken'

describe('normalizeParticipantBadgeInput', () => {
  it('strips spaces and preserves hash', () => {
    expect(normalizeParticipantBadgeInput('  #00 01 ')).toBe('#0001')
  })

  it('normalizes unicode digits', () => {
    expect(normalizeParticipantBadgeInput('０００１')).toBe('0001')
  })
})

describe('isParticipantDisplayIdInput', () => {
  it('accepts padded display ids', () => {
    expect(isParticipantDisplayIdInput('#0001')).toBe(true)
    expect(isParticipantDisplayIdInput('40')).toBe(true)
  })

  it('rejects overly long digit strings', () => {
    expect(isParticipantDisplayIdInput('1234567890')).toBe(false)
  })
})

describe('parseParticipantGoBadgeInput', () => {
  it('extracts uuid from go links', () => {
    expect(
      parseParticipantGoBadgeInput(
        'https://example.com/go?t=123e4567-e89b-12d3-a456-426614174000',
      ),
    ).toBe('123e4567-e89b-12d3-a456-426614174000')
  })
})
