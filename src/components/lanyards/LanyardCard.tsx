import { formatDisplayId, formatParticipantName } from '../../lib/format'
import type { Participant } from '../../lib/participants'
import type { Volunteer } from '../../lib/volunteers'

type LanyardCardParticipantProps = {
  kind?: 'participant'
  participant: Pick<
    Participant,
    'first_name' | 'last_initial' | 'last_name' | 'display_id' | 'id'
  >
  qrDataUrl?: string
}

type LanyardCardVolunteerProps = {
  kind: 'volunteer'
  volunteer: Pick<Volunteer, 'full_name' | 'display_id' | 'id'>
  qrDataUrl?: string
}

export type LanyardCardProps = LanyardCardParticipantProps | LanyardCardVolunteerProps

export default function LanyardCard(props: LanyardCardProps) {
  const { qrDataUrl } = props
  const isVolunteer = props.kind === 'volunteer'

  const displayName = isVolunteer
    ? props.volunteer.full_name
    : formatParticipantName(
        props.participant.first_name,
        props.participant.last_initial,
        props.participant.last_name,
      )

  const displayId = isVolunteer
    ? props.volunteer.display_id
    : props.participant.display_id

  const subtitle = isVolunteer ? 'Volunteer' : 'Community Chapter'

  return (
    <article
      className="lanyard-card flex flex-col overflow-hidden rounded-lg border border-slate-300 bg-white text-black shadow-md"
      aria-label={`${isVolunteer ? 'Volunteer' : 'Lanyard'} badge for ${displayName}`}
    >
      <header className="lanyard-card-header shrink-0 bg-crimson-600 px-3 py-2 text-center text-white">
        <p className="text-lg font-bold tracking-wide">B.A.R.T.</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
          {subtitle}
        </p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 py-3">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR code for check-in"
            className="lanyard-card-qr h-28 w-28 object-contain sm:h-32 sm:w-32"
          />
        ) : (
          <div
            className="lanyard-card-qr flex h-28 w-28 items-center justify-center bg-slate-100 text-xs text-slate-500 sm:h-32 sm:w-32"
            aria-hidden
          >
            QR…
          </div>
        )}

        <p className="text-center text-xl font-bold leading-tight text-slate-900">
          {displayName}
        </p>
        <p className="font-mono text-sm font-semibold text-crimson-600">
          {formatDisplayId(displayId)}
        </p>
        <p className="no-print text-center text-xs text-slate-500">
          On-screen preview; prints at 3×4 inches.
        </p>
      </div>
    </article>
  )
}
