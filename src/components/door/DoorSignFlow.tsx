import { useEffect, useState } from 'react'
import SignaturePad from './SignaturePad'
import { formatDisplayId, formatParticipantName } from '../../lib/format'
import { getPickupOptions } from '../../lib/checkOut'
import type { Participant } from '../../lib/participants'
import {
  signatureHasInk,
  type SignaturePayload,
} from '../../lib/signatures'
import { btnGhost, btnPrimary, surfaceCard } from '../../ui/classes'

type DoorSignFlowProps = {
  participant: Participant
  heading: string
  prompt: string
  confirmLabel: string
  submitting: boolean
  onConfirm: (signerName: string, signature: SignaturePayload) => void
  onCancel: () => void
}

function CheckMark() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={3}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

export default function DoorSignFlow({
  participant,
  heading,
  prompt,
  confirmLabel,
  submitting,
  onConfirm,
  onCancel,
}: DoorSignFlowProps) {
  const adults = getPickupOptions(participant)
  const [signerName, setSignerName] = useState<string | null>(
    adults.length === 1 ? adults[0] : null,
  )
  const [signature, setSignature] = useState<SignaturePayload | null>(null)
  const [padResetKey, setPadResetKey] = useState(0)

  /** Hide the floating nav while signing so it cannot cover the confirm bar. */
  useEffect(() => {
    document.body.dataset.doorFocus = 'true'
    return () => {
      delete document.body.dataset.doorFocus
    }
  }, [])

  const boyName = formatParticipantName(
    participant.first_name,
    participant.last_initial,
    participant.last_name,
  )

  const hasAdults = adults.length > 0
  const needsSignature = !signatureHasInk(signature)
  const canSubmit = Boolean(signerName) && !needsSignature

  const blockedReason = !hasAdults
    ? null
    : !signerName
      ? 'Pick who is here for him.'
      : needsSignature
        ? 'Have them sign above.'
        : null

  /** Ink belongs to whoever drew it, so switching adults invalidates it. */
  function selectSigner(name: string) {
    if (name === signerName) {
      return
    }
    setSignerName(name)
    if (signature) {
      setSignature(null)
      setPadResetKey((key) => key + 1)
    }
  }

  return (
    <div className={`${surfaceCard} border border-crimson-200 p-5`}>
      <p className="text-sm font-semibold uppercase tracking-wide text-crimson-600">
        {heading}
      </p>
      <p className="mt-3 font-mono text-sm text-slate-600">
        {formatDisplayId(participant.display_id)}
      </p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{boyName}</p>
      <p className="mt-4 text-base text-slate-700">{prompt}</p>

      {!hasAdults ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No authorized adults on file. Ask an admin to add the guardian and
          additional authorized adults before signing.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {adults.map((name) => {
            const selected = signerName === name
            return (
              <button
                key={name}
                type="button"
                disabled={submitting}
                aria-pressed={selected}
                onClick={() => selectSigner(name)}
                className={[
                  'flex min-h-16 w-full touch-manipulation items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left text-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  selected
                    ? 'border-crimson-600 bg-crimson-50 text-ink-900'
                    : 'border-cream-200 bg-margin-white text-ink-900 hover:bg-cream-50',
                ].join(' ')}
              >
                <span className="min-w-0 truncate">{name}</span>
                <span
                  aria-hidden
                  className={[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                    selected
                      ? 'border-crimson-600 bg-crimson-600 text-cream-50'
                      : 'border-cream-300',
                  ].join(' ')}
                >
                  {selected && <CheckMark />}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {hasAdults && (
        <div className="mt-6">
          <SignaturePad
            disabled={submitting || !signerName}
            disabledHint={signerName ? undefined : 'Pick who is here for him first'}
            signerName={signerName}
            resetKey={padResetKey}
            onChange={setSignature}
          />
        </div>
      )}

      <div
        className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-6 flex flex-col gap-3 rounded-b-[20px] border-t border-cream-200 bg-margin-white px-5 pt-4"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        {blockedReason && (
          <p className="text-center text-sm font-medium text-amber-800">
            {blockedReason}
          </p>
        )}
        <button
          type="button"
          disabled={submitting || !canSubmit}
          onClick={() => {
            if (!signerName || !signature) {
              return
            }
            onConfirm(signerName, signature)
          }}
          className={`${btnPrimary} min-h-14 w-full text-lg`}
        >
          {submitting ? 'Saving…' : confirmLabel}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onCancel}
          className={`${btnGhost} min-h-14 w-full text-lg`}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
