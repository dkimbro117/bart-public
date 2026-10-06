import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LanyardCard from '../components/lanyards/LanyardCard'
import { VOLUNTEER_LANYARD } from '../lib/volunteerColumns'
import type { Volunteer } from '../lib/volunteers'
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

export default function VolunteerBadgeReprintPage() {
  const { id } = useParams<{ id: string }>()
  const [volunteer, setVolunteer] = useState<Pick<
    Volunteer,
    'id' | 'display_id' | 'full_name' | 'qr_token'
  > | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('Volunteer not found.')
      setLoading(false)
      return
    }

    let mounted = true

    async function loadVolunteer() {
      if (!id) return

      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('volunteers')
        .select(VOLUNTEER_LANYARD)
        .eq('id', id)
        .single()

      if (!mounted) return

      if (fetchError) {
        setError(fetchError.message)
        setVolunteer(null)
        setLoading(false)
        return
      }

      try {
        const dataUrl = await generateQrDataUrl(data.qr_token)
        if (!mounted) return

        setVolunteer(data)
        setQrDataUrl(dataUrl)
      } catch (qrError) {
        const message =
          qrError instanceof Error
            ? qrError.message
            : 'Failed to generate QR code.'
        setError(message)
        setVolunteer(null)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadVolunteer()

    return () => {
      mounted = false
    }
  }, [id])

  return (
    <section className="space-y-6">
      <div className="no-print space-y-4">
        <Link to="/volunteers" className={linkBack}>
          ← Back to volunteers
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className={headingPage}>Print volunteer badge</h1>
            <p className={`mt-1 ${textSubtle}`}>
              {volunteer?.full_name ?? 'Single badge print view'}
            </p>
          </div>

          <button
            type="button"
            disabled={!volunteer || !qrDataUrl}
            onClick={() => window.print()}
            className={btnPrimary}
          >
            Print badge
          </button>
        </div>

        {loading && <p className={textMuted}>Loading badge…</p>}

        {error && <p className={alertErrorInline}>{error}</p>}
      </div>

      {volunteer && (
        <div className="lanyard-print-single flex justify-center">
          <LanyardCard kind="volunteer" volunteer={volunteer} qrDataUrl={qrDataUrl} />
        </div>
      )}
    </section>
  )
}
