import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ParticipantForm from '../components/participants/ParticipantForm'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchParticipantBucksBalance,
  fetchParticipantLedger,
  formatBucksAmount,
  formatBucksReason,
  type BucksLedgerRow,
} from '../lib/bucks'
import { formatDateTime } from '../lib/dates'
import { formatDisplayId, formatParticipantName } from '../lib/format'
import type { Participant, ParticipantFormValues } from '../lib/participants'
import { GUARDIAN_CONTACT, PARTICIPANT_DETAIL } from '../lib/participantColumns'
import {
  formValuesToContactUpdate,
  formValuesToParticipantUpdate,
  participantToFormValues,
} from '../lib/participants'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  btnSecondary,
  headingPage,
  linkBack,
  sectionCard,
  textAccent,
  textMuted,
  textSubtle,
} from '../ui/classes'

export default function ParticipantEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [initialValues, setInitialValues] = useState<ParticipantFormValues | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bucksBalance, setBucksBalance] = useState<number | null>(null)
  const [bucksLedger, setBucksLedger] = useState<BucksLedgerRow[]>([])

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
        .select(PARTICIPANT_DETAIL)
        .eq('id', id)
        .single()

      if (!mounted) return

      if (fetchError) {
        setError(fetchError.message)
        setParticipant(null)
        setInitialValues(null)
        setLoading(false)
        return
      }

      let contact = null
      if (profile?.role === 'admin') {
        const { data: contactData } = await supabase
          .from('participant_guardian_contacts')
          .select(GUARDIAN_CONTACT)
          .eq('participant_id', id)
          .maybeSingle()
        contact = contactData
      }

      if (!mounted) return

      setParticipant(data)
      setInitialValues(participantToFormValues(data, contact))
      setLoading(false)

      try {
        const [balance, ledger] = await Promise.all([
          fetchParticipantBucksBalance(id),
          fetchParticipantLedger(id, 8),
        ])
        if (!mounted) return
        setBucksBalance(balance)
        setBucksLedger(ledger)
      } catch {
        if (!mounted) return
        setBucksBalance(null)
        setBucksLedger([])
      }
    }

    void loadParticipant()

    return () => {
      mounted = false
    }
  }, [id, profile?.role])

  if (loading) {
    return (
      <section>
        <p className={textMuted}>Loading participant…</p>
      </section>
    )
  }

  if (error || !participant || !initialValues) {
    return (
      <section className="space-y-4">
        <p className={alertErrorInline}>{error ?? 'Participant not found.'}</p>
        <Link to="/roster" className={btnSecondary}>
          Back to roster
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link to="/roster" className={linkBack}>
          ← Back to roster
        </Link>
        <div>
          <p className={textAccent}>
            {formatDisplayId(participant.display_id)}
          </p>
          <h1 className={headingPage}>
            {formatParticipantName(
              participant.first_name,
              participant.last_initial,
              participant.last_name,
            )}
          </h1>
          <p className={`mt-1 ${textSubtle}`}>
            Update guardian details and authorized pickups.
          </p>
        </div>
      </div>

      {bucksBalance !== null && (
        <div className={sectionCard}>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink-500">BART Bucks</p>
              <p className="text-3xl font-bold text-crimson-700">{bucksBalance}</p>
            </div>
            {isAdmin && (
              <Link to="/bucks" className={btnSecondary}>
                Manage ledger
              </Link>
            )}
          </div>
          {bucksLedger.length > 0 && (
            <ul className="mt-4 divide-y divide-cream-200 border-t border-cream-200">
              {bucksLedger.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 py-2 text-sm"
                >
                  <span className={textMuted}>
                    {formatBucksReason(entry.reason)} ·{' '}
                    {formatDateTime(entry.created_at)}
                  </span>
                  <span
                    className={`font-mono font-semibold ${
                      entry.amount > 0 ? 'text-emerald-700' : 'text-crimson-700'
                    }`}
                  >
                    {formatBucksAmount(entry.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ParticipantForm
        key={participant.id}
        initialValues={initialValues}
        submitLabel="Save changes"
        showActiveToggle
        showContactFields={isAdmin}
        onCancel={() => navigate('/roster')}
        onSubmit={async (values) => {
          const { error: updateError } = await supabase
            .from('participants')
            .update(formValuesToParticipantUpdate(values))
            .eq('id', participant.id)

          if (updateError) {
            throw new Error(updateError.message)
          }

          if (isAdmin) {
            const { error: contactError } = await supabase
              .from('participant_guardian_contacts')
              .upsert({
                participant_id: participant.id,
                ...formValuesToContactUpdate(values),
              })

            if (contactError) {
              throw new Error(contactError.message)
            }
          }

          navigate('/roster')
        }}
      />
    </section>
  )
}
