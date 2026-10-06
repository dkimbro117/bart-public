import { describe, expect, it } from 'vitest'
import { createId } from './createId'

describe('createId', () => {
  it('returns an 8-4-4-4-12 hex id', () => {
    expect(createId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })
})
