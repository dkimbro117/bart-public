import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import VolunteerForm from '../components/volunteers/VolunteerForm'
import { formatDisplayId } from '../lib/format'
import { VOLUNTEER_DETAIL } from '../lib/volunteerColumns'
import {
  formValuesToVolunteerUpdate,
  volunteerToFormValues,
  type Volunteer,
} from '../lib/volunteers'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  btnSecondary,
  headingPage,
  linkBack,
  textAccent,
  textMuted,
  textSubtle,
} from '../ui/classes'

export default function VolunteerEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null)
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
        .select(VOLUNTEER_DETAIL)
        .eq('id', id)
        .single()

      if (!mounted) return

      if (fetchError) {
        setError(fetchError.message)
        setVolunteer(null)
      } else {
        setVolunteer(data)
      }

      setLoading(false)
    }

    void loadVolunteer()

    return () => {
      mounted = false
    }
  }, [id])

  if (loading) {
    return (
      <section>
        <p className={textMuted}>Loading volunteer…</p>
      </section>
    )
  }

  if (error || !volunteer) {
    return (
      <section className="space-y-4">
        <p className={alertErrorInline}>{error ?? 'Volunteer not found.'}</p>
        <Link to="/volunteers" className={btnSecondary}>
          Back to volunteers
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link to="/volunteers" className={linkBack}>
          ← Back to volunteers
        </Link>
        <div>
          <p className={textAccent}>
            {formatDisplayId(volunteer.display_id)}
          </p>
          <h1 className={headingPage}>{volunteer.full_name}</h1>
          <p className={`mt-1 ${textSubtle}`}>Update contact details and roster status.</p>
        </div>
      </div>

      <Link
        to={`/volunteers/reprint/${volunteer.id}`}
        className={btnSecondary}
      >
        Print volunteer badge
      </Link>

      <VolunteerForm
        key={volunteer.id}
        initialValues={volunteerToFormValues(volunteer)}
        submitLabel="Save changes"
        showActiveToggle
        onCancel={() => navigate('/volunteers')}
        onSubmit={async (values) => {
          const { error: updateError } = await supabase
            .from('volunteers')
            .update(formValuesToVolunteerUpdate(values))
            .eq('id', volunteer.id)

          if (updateError) {
            throw new Error(updateError.message)
          }

          navigate('/volunteers')
        }}
      />
    </section>
  )
}
