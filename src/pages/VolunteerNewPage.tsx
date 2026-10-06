import { useNavigate } from 'react-router-dom'
import VolunteerForm from '../components/volunteers/VolunteerForm'
import {
  emptyVolunteerFormValues,
  formValuesToVolunteerInsert,
} from '../lib/volunteers'
import { supabase } from '../lib/supabase'
import { headingPage, textSubtle } from '../ui/classes'

export default function VolunteerNewPage() {
  const navigate = useNavigate()

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className={headingPage}>Add volunteer</h1>
        <p className={`mt-1 ${textSubtle}`}>
          ID and badge QR token are assigned automatically.
        </p>
      </div>

      <VolunteerForm
        initialValues={emptyVolunteerFormValues}
        submitLabel="Add volunteer"
        onCancel={() => navigate('/volunteers')}
        onSubmit={async (values) => {
          const { error } = await supabase
            .from('volunteers')
            .insert(formValuesToVolunteerInsert(values))

          if (error) {
            throw new Error(error.message)
          }

          navigate('/volunteers')
        }}
      />
    </section>
  )
}
