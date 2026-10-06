import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminAccessNotice from '../components/AdminAccessNotice'
import ConfirmPanel from '../components/ui/ConfirmPanel'
import SessionForm from '../components/sessions/SessionForm'
import { useAuth } from '../contexts/AuthContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { isStaffAdmin } from '../lib/auth'
import { formatSessionLabel } from '../lib/dates'
import {
  SESSION_LIST_COLUMNS,
  formValuesToSessionUpdate,
  sessionToFormValues,
  type Session,
  type SessionFormValues,
} from '../lib/sessions'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  btnDanger,
  btnGhost,
  btnSecondary,
  headingPage,
  linkBack,
  textSubtle,
} from '../ui/classes'

export default function SessionEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()
  const {
    refreshSessions,
    selectedSessionId,
    setSelectedSessionId,
  } = useSyncStatus()
  const isAdmin = isStaffAdmin(profile)
  const [session, setSession] = useState<Session | null>(null)
  const [initialValues, setInitialValues] = useState<SessionFormValues | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [settingCurrent, setSettingCurrent] = useState(false)

  useEffect(() => {
    if (!id || !isAdmin) {
      setLoading(false)
      return
    }

    let mounted = true

    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select(SESSION_LIST_COLUMNS)
        .eq('id', id!)
        .maybeSingle()

      if (!mounted) return

      if (fetchError) {
        setError(fetchError.message)
        setSession(null)
        setInitialValues(null)
      } else if (!data) {
        setError('Session not found.')
        setSession(null)
        setInitialValues(null)
      } else {
        const row = data as Session
        setSession(row)
        setInitialValues(sessionToFormValues(row))
      }
      setLoading(false)
    }

    void load()
    return () => {
      mounted = false
    }
  }, [id, isAdmin])

  async function handleDelete() {
    if (!session) return
    setDeleting(true)
    setError(null)

    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', session.id)

    setDeleting(false)

    if (deleteError) {
      setError(deleteError.message)
      setDeleteOpen(false)
      return
    }

    await refreshSessions()
    navigate('/sessions')
  }

  if (authLoading || loading) {
    return (
      <section className="mx-auto max-w-2xl">
        <p className={textSubtle}>Loading…</p>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <AdminAccessNotice
        title="Edit event"
        actionLabel="edit sessions"
        backTo="/sessions"
        backLabel="Back to sessions"
      />
    )
  }

  if (error && (!session || !initialValues)) {
    return (
      <section className="mx-auto max-w-2xl space-y-4">
        <Link to="/sessions" className={linkBack}>
          Back to sessions
        </Link>
        <p className={alertErrorInline}>{error}</p>
      </section>
    )
  }

  if (!session || !initialValues) {
    return (
      <section className="mx-auto max-w-2xl space-y-4">
        <Link to="/sessions" className={linkBack}>
          Back to sessions
        </Link>
        <p className={alertErrorInline}>Session not found.</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to="/sessions" className={linkBack}>
          Back to sessions
        </Link>
        <h1 className={`${headingPage} mt-3`}>Edit event</h1>
        <p className={`mt-1 ${textSubtle}`}>
          {formatSessionLabel(session.title, session.session_date)}
        </p>
      </div>

      {error && <p className={alertErrorInline}>{error}</p>}

      <SessionForm
        initialValues={initialValues}
        submitLabel="Save changes"
        onCancel={() => navigate('/sessions')}
        onSubmit={async (values) => {
          const { error: updateError } = await supabase
            .from('sessions')
            .update(formValuesToSessionUpdate(values))
            .eq('id', session.id)

          if (updateError) {
            throw new Error(updateError.message)
          }

          await refreshSessions()
          navigate('/sessions')
        }}
      />

      <div className="space-y-3 rounded-[20px] border border-cream-200 bg-cream-50/50 p-4">
        <p className="text-sm font-medium text-ink-800">On this device</p>
        <button
          type="button"
          className={btnSecondary}
          disabled={settingCurrent || selectedSessionId === session.id}
          onClick={() => {
            void (async () => {
              setSettingCurrent(true)
              try {
                await setSelectedSessionId(session.id)
              } finally {
                setSettingCurrent(false)
              }
            })()
          }}
        >
          {selectedSessionId === session.id
            ? 'Current session'
            : settingCurrent
              ? 'Setting…'
              : 'Use as current session'}
        </button>
        <p className="text-sm font-medium text-ink-800">Go do work</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {session.requires_check_in && (
            <>
              <Link to="/check-in" className={btnGhost}>
                Check in
              </Link>
              <Link to="/roster-live" className={btnGhost}>
                Live roster
              </Link>
              <Link to="/door-helpers" className={btnGhost}>
                BART Volunteers
              </Link>
            </>
          )}
          {session.supports_reading && (
            <Link to="/reading" className={btnGhost}>
              Reading log
            </Link>
          )}
          <Link to={`/reports?session=${session.id}`} className={btnGhost}>
            Reports
          </Link>
          <Link to={`/messages?session=${session.id}`} className={btnGhost}>
            Messages
          </Link>
        </div>
      </div>

      <div className="border-t border-cream-200 pt-6">
        {deleteOpen ? (
          <ConfirmPanel
            title="Delete this session?"
            tone="red"
            confirmLabel="Delete session"
            loading={deleting}
            onConfirm={() => void handleDelete()}
            onCancel={() => setDeleteOpen(false)}
          >
            <p>
              Removes {formatSessionLabel(session.title, session.session_date)}{' '}
              permanently. Attendance and reading logs tied to it may be blocked
              by the database if they still exist.
            </p>
          </ConfirmPanel>
        ) : (
          <button
            type="button"
            className={btnDanger}
            onClick={() => setDeleteOpen(true)}
          >
            Delete session
          </button>
        )}
      </div>
    </section>
  )
}
