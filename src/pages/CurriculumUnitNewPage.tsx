import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminAccessNotice from '../components/AdminAccessNotice'
import CurriculumUnitForm from '../components/curriculum/CurriculumUnitForm'
import { useAuth } from '../contexts/AuthContext'
import { isStaffAdmin } from '../lib/auth'
import {
  emptyCurriculumUnitFormValues,
  formValuesToCurriculumUnitInsert,
} from '../lib/curriculum'
import { supabase } from '../lib/supabase'
import { headingPage, textSubtle } from '../ui/classes'

function curriculumWriteErrorMessage(message: string): string {
  if (message.includes('row-level security')) {
    return 'Only admin accounts can create curriculum units. If you were just promoted, sign out and back in, then try again. Otherwise ask a program lead for admin access.'
  }
  return message
}

export default function CurriculumUnitNewPage() {
  const navigate = useNavigate()
  const { profile, loading, refreshProfile } = useAuth()

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  if (loading) {
    return (
      <section className="mx-auto max-w-2xl">
        <p className={textSubtle}>Loading account…</p>
      </section>
    )
  }

  if (!isStaffAdmin(profile)) {
    return (
      <AdminAccessNotice
        title="New curriculum unit"
        actionLabel="create or edit curriculum units"
        backTo="/curriculum"
        backLabel="Back to curriculum"
      />
    )
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className={headingPage}>New curriculum unit</h1>
        <p className={`mt-1 ${textSubtle}`}>
          Add the unit details now; you can author the quiz on the next screen.
        </p>
      </div>

      <CurriculumUnitForm
        initialValues={emptyCurriculumUnitFormValues}
        submitLabel="Create unit"
        onCancel={() => navigate('/curriculum')}
        onSubmit={async (values) => {
          const { data, error } = await supabase
            .from('curriculum_units')
            .insert(formValuesToCurriculumUnitInsert(values))
            .select('id')
            .single()

          if (error) {
            throw new Error(curriculumWriteErrorMessage(error.message))
          }

          navigate(`/curriculum/${data.id}`)
        }}
      />
    </section>
  )
}
