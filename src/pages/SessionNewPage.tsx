import { useNavigate, useSearchParams } from 'react-router-dom'
import AdminAccessNotice from '../components/AdminAccessNotice'
import SessionForm from '../components/sessions/SessionForm'
import { useAuth } from '../contexts/AuthContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { isStaffAdmin } from '../lib/auth'
import { isIsoDateString, todayIsoDate } from '../lib/dates'
import {
  emptySessionFormValues,
  formValuesToSessionInsert,
} from '../lib/sessions'
import { supabase } from '../lib/supabase'
import { headingPage, textSubtle } from '../ui/classes'

export default function SessionNewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { profile, loading } = useAuth()
  const { refreshSessions } = useSyncStatus()

  const dateParam = searchParams.get('date')
  const initialDate =
    dateParam && isIsoDateString(dateParam) ? dateParam : todayIsoDate()

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
        title="New event"
        actionLabel="create sessions"
        backTo="/sessions"
        backLabel="Back to sessions"
      />
    )
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className={headingPage}>New event</h1>
        <p className={`mt-1 ${textSubtle}`}>
          Reading sessions default to check-in + kiosk. Other types leave reading
          off unless you enable it.
        </p>
      </div>

      <SessionForm
        key={initialDate}
        initialValues={emptySessionFormValues(initialDate)}
        submitLabel="Create event"
        onCancel={() => navigate('/sessions')}
        onSubmit={async (values) => {
          const { data, error } = await supabase
            .from('sessions')
            .insert(formValuesToSessionInsert(values))
            .select('id')
            .single()

          if (error) {
            throw new Error(error.message)
          }

          await refreshSessions()
          navigate(`/sessions/${data.id}`)
        }}
      />
    </section>
  )
}
