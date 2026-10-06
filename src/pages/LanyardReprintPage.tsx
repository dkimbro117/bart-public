import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LanyardCard from '../components/lanyards/LanyardCard'
import { formatParticipantName } from '../lib/format'
import type { Participant } from '../lib/participants'
import { PARTICIPANT_LANYARD } from '../lib/participantColumns'
import { generateQrDataUrl } from '../lib/qr'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  btnPrimary,
  linkBack,
  headingPage,
  textMuted,
  textSubtle,
} from '../ui/classes'

export default function LanyardReprintPage() {
  const { id } = useParams<{ id: string }>()
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('Participant not found.')
      setLoading(false)
      return
    }

    let mounted = true

    async function loadParticipant() {
      if (!id) return

      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('participants')
        .select(PARTICIPANT_LANYARD)
        .eq('id', id)
        .single()

      if (!mounted) return

      if (fetchError) {
        setError(fetchError.message)
        setParticipant(null)
        setLoading(false)
        return
      }

      try {
        const dataUrl = await generateQrDataUrl(data.qr_token)
        if (!mounted) return

        setParticipant({
          ...data,
          guardian_name: '',
          authorized_pickups: [],
          created_at: null,
        })
        setQrDataUrl(dataUrl)
      } catch (qrError) {
        const message =
          qrError instanceof Error
            ? qrError.message
            : 'Failed to generate QR code.'
        setError(message)
        setParticipant(null)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadParticipant()

    return () => {
      mounted = false
    }
  }, [id])

  return (
    <section className="space-y-6">
      <div className="no-print space-y-4">
        <Link to="/roster" className={linkBack}>
          ← Back to roster
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className={headingPage}>Reprint lanyard</h1>
            <p className={`mt-1 ${textSubtle}`}>
              {participant
                ? formatParticipantName(
                    participant.first_name,
                    participant.last_initial,
                    participant.last_name,
                  )
                : 'Single badge print view'}
            </p>
          </div>

          <button
            type="button"
            disabled={!participant || !qrDataUrl}
            onClick={() => window.print()}
            className={btnPrimary}
          >
            Print badge
          </button>
        </div>

        {loading && <p className={textMuted}>Loading badge…</p>}

        {error && <p className={alertErrorInline}>{error}</p>}
      </div>

      {participant && (
        <div className="lanyard-print-single flex justify-center">
          <LanyardCard participant={participant} qrDataUrl={qrDataUrl} />
        </div>
      )}
    </section>
  )
}
