import { useNavigate } from 'react-router-dom'
import ParticipantForm from '../components/participants/ParticipantForm'
import {
  emptyParticipantFormValues,
  formValuesToContactInsert,
  formValuesToParticipantInsert,
} from '../lib/participants'
import { supabase } from '../lib/supabase'
import { headingPage, textSubtle } from '../ui/classes'

export default function ParticipantNewPage() {
  const navigate = useNavigate()

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className={headingPage}>Add participant</h1>
        <p className={`mt-1 ${textSubtle}`}>
          ID and QR token are assigned automatically.
        </p>
      </div>

      <ParticipantForm
        initialValues={emptyParticipantFormValues}
        submitLabel="Add participant"
        showContactFields
        onCancel={() => navigate('/roster')}
        onSubmit={async (values) => {
          const { data, error } = await supabase
            .from('participants')
            .insert(formValuesToParticipantInsert(values))
            .select('id')
            .single()

          if (error) {
            throw new Error(error.message)
          }

          const contact = formValuesToContactInsert(data.id, values)
          if (contact.guardian_email || contact.guardian_phone) {
            const { error: contactError } = await supabase
              .from('participant_guardian_contacts')
              .insert(contact)

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
