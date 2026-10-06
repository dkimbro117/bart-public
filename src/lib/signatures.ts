export type SignaturePoint = {
  x: number
  y: number
}

export type SignaturePayload = {
  strokes: SignaturePoint[][]
  width: number
  height: number
}

export function isSignaturePayload(value: unknown): value is SignaturePayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>
  if (!Array.isArray(record.strokes)) {
    return false
  }

  return (
    typeof record.width === 'number' &&
    typeof record.height === 'number' &&
    record.strokes.every(
      (stroke) =>
        Array.isArray(stroke) &&
        stroke.every(
          (point) =>
            point &&
            typeof point === 'object' &&
            typeof (point as SignaturePoint).x === 'number' &&
            typeof (point as SignaturePoint).y === 'number',
        ),
    )
  )
}

export function signatureSyncErrorMessage(message: string): string {
  if (
    /schema cache|does not exist|PGRST205|relation ['"]?public\.attendance_signatures/i.test(
      message,
    )
  ) {
    return 'E-sign table is missing on the server. Apply migrations through 20260904180000, then tap Sync now.'
  }
  if (/permission denied|row-level security|42501|PGRST301/i.test(message)) {
    return 'E-sign could not be saved (permissions). Apply the latest signature/door migrations, then tap Sync now.'
  }
  return `E-sign did not save: ${message}`
}

export function signatureHasInk(payload: SignaturePayload | null | undefined): boolean {
  if (!payload) {
    return false
  }

  return payload.strokes.some((stroke) => stroke.length > 1)
}

/** Strokes with a single point are stray taps, not ink. */
export function countInkStrokes(strokes: SignaturePoint[][]): number {
  return strokes.filter((stroke) => stroke.length > 1).length
}

export function undoLastStroke(strokes: SignaturePoint[][]): SignaturePoint[][] {
  return strokes.slice(0, -1)
}

export async function saveAttendanceSignature(input: {
  participantId: string
  sessionId: string
  kind: 'dropoff' | 'pickup'
  signerName: string
  signature: SignaturePayload
  signedAt: string
  capturedBy: string
}): Promise<void> {
  const { supabase } = await import('./supabase')
  const { error } = await supabase.from('attendance_signatures').upsert(
    {
      participant_id: input.participantId,
      session_id: input.sessionId,
      kind: input.kind,
      signer_name: input.signerName.trim(),
      signature_json: input.signature,
      signed_at: input.signedAt,
      captured_by: input.capturedBy,
    },
    { onConflict: 'participant_id,session_id,kind' },
  )

  if (error) {
    throw new Error(signatureSyncErrorMessage(error.message))
  }
}
