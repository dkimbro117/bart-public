import { useEffect, useState } from 'react'
import LanyardCard from '../components/lanyards/LanyardCard'
import { BrandedEmptyState } from '../components/brand/BrandedStates'
import { useParticipantQrCodes } from '../hooks/useParticipantQrCodes'
import type { Participant } from '../lib/participants'
import { PARTICIPANT_LANYARD } from '../lib/participantColumns'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  btnPrimary,
  headingPage,
  textSubtle,
} from '../ui/classes'

export default function LanyardsPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { qrByParticipantId, loading: qrLoading, error: qrError } =
    useParticipantQrCodes(participants)

  useEffect(() => {
    let mounted = true

    async function loadParticipants() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('participants')
        .select(PARTICIPANT_LANYARD)
        .eq('active', true)
        .order('display_id', { ascending: true })

      if (!mounted) return

      if (fetchError) {
        setError(fetchError.message)
        setParticipants([])
      } else {
        setParticipants(
          (data ?? []).map((row) => ({
            ...row,
            guardian_name: '',
            authorized_pickups: [],
            created_at: null,
          })),
        )
      }

      setLoading(false)
    }

    void loadParticipants()

    return () => {
      mounted = false
    }
  }, [])

  const cardsReady =
    !loading && !qrLoading && participants.length > 0 && !qrError && !error

  return (
    <section className="space-y-6">
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={headingPage}>Lanyards</h1>
          <p className={`mt-1 text-sm ${textSubtle}`}>
            {loading
              ? 'Loading participants…'
              : qrLoading
                ? 'Generating QR codes…'
                : `${participants.length} badge card${participants.length === 1 ? '' : 's'} ready to print`}
          </p>
        </div>

        <p className={`no-print text-sm ${textSubtle}`}>
          Cards print at 3×4 inches with full name and chapter crimson header.
          Print all places multiple badges per letter page when QR codes are ready.
        </p>

        <button
          type="button"
          disabled={!cardsReady}
          onClick={() => window.print()}
          className={btnPrimary}
        >
          Print all
        </button>
      </div>

      {(error || qrError) && (
        <p className={`no-print ${alertErrorInline}`}>
          {error ?? qrError}
        </p>
      )}

      {!loading && !error && participants.length === 0 && (
        <BrandedEmptyState className="no-print">
          No active participants to print.
        </BrandedEmptyState>
      )}

      <div className="lanyard-print-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((participant) => (
          <LanyardCard
            key={participant.id}
            participant={participant}
            qrDataUrl={qrByParticipantId[participant.id]}
          />
        ))}
      </div>
    </section>
  )
}
