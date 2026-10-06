import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchStaffProfile } from '../lib/auth'
import {
  completeAuthFromUrl,
  stashAuthCodeFromUrl,
} from '../lib/completeAuthFromUrl'
import { defaultRouteForProfile } from '../lib/defaultRoute'
import { isAuthRecoveryCallback } from '../lib/authRedirect'
import { supabase } from '../lib/supabase'
import { surfacePage, textSubtle } from '../ui/classes'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Signing you in…')
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) {
      return
    }
    startedRef.current = true

    stashAuthCodeFromUrl()
    const recovery = isAuthRecoveryCallback()

    async function finishAuth() {
      setError(null)
      setMessage('Verifying your link…')

      try {
        const exchange = await completeAuthFromUrl()
        if (exchange.error) {
          setError(exchange.error)
          return
        }

        setMessage('Loading your account…')

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
          setError(
            'Sign-in link expired or invalid. Request a new activation link from the login page.',
          )
          return
        }

        const profile = await fetchStaffProfile(session.user.id)
        if (!profile) {
          setError(
            'Could not load your staff profile. Confirm your email is on the chapter allowlist, then try the activation link again.',
          )
          await supabase.auth.signOut()
          return
        }

        if (!profile.password_set_at || recovery) {
          navigate('/login/set-password', {
            replace: true,
            state: { recovery },
          })
          return
        }

        navigate(defaultRouteForProfile(profile), { replace: true })
      } catch (finishError) {
        setError(
          finishError instanceof Error
            ? finishError.message
            : 'Sign-in failed. Request a new activation link from the login page.',
        )
      }
    }

    void finishAuth()
  }, [navigate])

  if (error) {
    return (
      <main
        className={`${surfacePage} flex min-h-screen items-center justify-center px-4`}
      >
        <div className="max-w-md rounded-[20px] bg-white p-6 text-center shadow-card">
          <p className="text-lg font-semibold text-slate-900">Sign-in failed</p>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <Link
            to="/login"
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[14px] bg-crimson-600 px-5 text-base font-semibold text-cream-50 hover:bg-crimson-700"
          >
            Back to login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main
      className={`${surfacePage} flex min-h-screen items-center justify-center px-4`}
    >
      <p className={textSubtle}>{message}</p>
    </main>
  )
}
