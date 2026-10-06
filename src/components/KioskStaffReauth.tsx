import { FormEvent, useEffect, useState } from 'react'
import { getKioskStaffEmail } from '../lib/kioskMode'
import { supabase } from '../lib/supabase'
import { btnPrimary, inputClass, labelClass, modalCard, alertErrorInline, surfacePage, textSubtle } from '../ui/classes'

type KioskStaffReauthProps = {
  staffEmail?: string | null
}

export default function KioskStaffReauth({
  staffEmail: staffEmailProp,
}: KioskStaffReauthProps) {
  const staffEmail = staffEmailProp ?? getKioskStaffEmail() ?? ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(true)

  useEffect(() => {
    let mounted = true

    async function trySilentRefresh() {
      const { data, error: refreshError } = await supabase.auth.refreshSession()
      if (!mounted) {
        return
      }

      if (!refreshError && data.session) {
        window.location.reload()
        return
      }

      setRefreshing(false)
    }

    void trySilentRefresh()

    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!staffEmail) {
      setError('Staff email is missing. Ask a volunteer to unlock the tablet.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: staffEmail,
      password,
    })

    if (signInError) {
      setError('Incorrect password. Try again.')
      setSubmitting(false)
      return
    }

    window.location.reload()
  }

  if (refreshing) {
    return (
      <main
        className={`${surfacePage} flex min-h-dvh items-center justify-center px-4`}
      >
        <p className={`text-lg ${textSubtle}`}>Reconnecting staff session…</p>
      </main>
    )
  }

  return (
    <main
      className={`${surfacePage} flex min-h-dvh items-center justify-center px-4`}
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className={modalCard}
      >
        <h1 className="text-xl font-bold text-slate-900">Staff check-in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Session paused for safety. Enter the staff password to continue — the
          reading kiosk stays on this screen.
        </p>

        <label className={`${labelClass} mt-4 block`}>
          Staff email
          <input
            type="email"
            readOnly
            value={staffEmail}
            className={`${inputClass} mt-2 min-h-12 bg-cream-50`}
          />
        </label>

        <label className={`${labelClass} mt-4 block`}>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClass} mt-2 min-h-12`}
          />
        </label>

        {error && <p className={`mt-4 ${alertErrorInline}`}>{error}</p>}

        <button
          type="submit"
          disabled={submitting || !password}
          className={`${btnPrimary} mt-6 min-h-12 w-full`}
        >
          {submitting ? 'Signing in…' : 'Continue kiosk'}
        </button>
      </form>
    </main>
  )
}
