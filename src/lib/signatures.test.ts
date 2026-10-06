import { describe, expect, it } from 'vitest'
import {
  countInkStrokes,
  isSignaturePayload,
  signatureHasInk,
  undoLastStroke,
  type SignaturePayload,
  type SignaturePoint,
} from './signatures'

const sample: SignaturePayload = {
  width: 300,
  height: 140,
  strokes: [
    [
      { x: 0.1, y: 0.2 },
      { x: 0.4, y: 0.5 },
    ],
  ],
}

describe('signatureHasInk', () => {
  it('requires more than a tap', () => {
    expect(signatureHasInk({ ...sample, strokes: [[{ x: 0.1, y: 0.2 }]] })).toBe(
      false,
    )
    expect(signatureHasInk(sample)).toBe(true)
  })
})

describe('isSignaturePayload', () => {
  it('accepts stroke json', () => {
    expect(isSignaturePayload(sample)).toBe(true)
    expect(isSignaturePayload({ strokes: [] })).toBe(false)
  })
})

describe('countInkStrokes', () => {
  it('ignores single-point taps', () => {
    const strokes: SignaturePoint[][] = [
      [{ x: 0.1, y: 0.1 }],
      [
        { x: 0.2, y: 0.2 },
        { x: 0.3, y: 0.3 },
      ],
    ]

    expect(countInkStrokes(strokes)).toBe(1)
    expect(countInkStrokes([])).toBe(0)
  })
})

describe('undoLastStroke', () => {
  it('drops only the most recent stroke', () => {
    const first: SignaturePoint[] = [
      { x: 0.1, y: 0.1 },
      { x: 0.2, y: 0.2 },
    ]
    const second: SignaturePoint[] = [
      { x: 0.3, y: 0.3 },
      { x: 0.4, y: 0.4 },
    ]

    expect(undoLastStroke([first, second])).toEqual([first])
  })

  it('undoing to empty leaves no ink, so Confirm re-disables', () => {
    const only: SignaturePoint[] = [
      { x: 0.1, y: 0.1 },
      { x: 0.2, y: 0.2 },
    ]
    const remaining = undoLastStroke([only])

    expect(remaining).toEqual([])
    expect(countInkStrokes(remaining)).toBe(0)
    expect(signatureHasInk({ ...sample, strokes: remaining })).toBe(false)
  })

  it('is a no-op on an empty pad', () => {
    expect(undoLastStroke([])).toEqual([])
  })
})
