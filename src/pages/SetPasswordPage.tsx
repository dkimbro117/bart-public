import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { fetchStaffProfile, markPasswordSet } from '../lib/auth'
import { defaultRouteForProfile } from '../lib/defaultRoute'
import { supabase } from '../lib/supabase'
import { surfacePage, textSubtle } from '../ui/classes'

const MIN_PASSWORD_LENGTH = 8

export default function SetPasswordPage() {
  const { session, profile, loading, refreshProfile } = useAuth()
  const location = useLocation()
  const recovery = Boolean(
    (location.state as { recovery?: boolean } | null)?.recovery,
  )
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [resolvedProfile, setResolvedProfile] = useState(profile)
  const [waitingForSession, setWaitingForSession] = useState(true)

  useEffect(() => {
    if (profile) {
      setResolvedProfile(profile)
    }
  }, [profile])

  useEffect(() => {
    let cancelled = false

    async function ensureSession() {
      if (loading) {
        return
      }

      if (session?.user.id) {
        if (!profile) {
          const fetched = await fetchStaffProfile(session.user.id)
          if (!cancelled && fetched) {
            setResolvedProfile(fetched)
          }
        }
        if (!cancelled) {
          setWaitingForSession(false)
        }
        return
      }

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      if (cancelled) {
        return
      }

      if (currentSession?.user.id) {
        const fetched = await fetchStaffProfile(currentSession.user.id)
        if (fetched) {
          setResolvedProfile(fetched)
        }
        setWaitingForSession(false)
        return
      }

      setWaitingForSession(false)
    }

    void ensureSession()

    return () => {
      cancelled = true
    }
  }, [loading, session, profile])

  if (waitingForSession || loading) {
    return (
      <main
        className={`${surfacePage} flex min-h-screen items-center justify-center px-4`}
      >
        <p className={textSubtle}>Loading…</p>
      </main>
    )
  }

  if (!session && !resolvedProfile) {
    return <Navigate to="/login" replace />
  }

  if (resolvedProfile?.password_set_at && !recovery) {
    return <Navigate to={defaultRouteForProfile(resolvedProfile)} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setSubmitting(false)
      setError(updateError.message)
      return
    }

    try {
      const userId = session?.user.id ?? resolvedProfile?.id
      if (userId) {
        await markPasswordSet(userId)
        await refreshProfile()
        const refreshed = await fetchStaffProfile(userId)
        if (refreshed) {
          setResolvedProfile(refreshed)
        }
      }
      setDone(true)
    } catch (markError) {
      setSubmitting(false)
      setError(
        markError instanceof Error
          ? markError.message
          : 'Password saved but profile update failed. Try signing in again.',
      )
    }
  }

  if (done && resolvedProfile) {
    return <Navigate to={defaultRouteForProfile(resolvedProfile)} replace />
  }

  return (
    <main className={`${surfacePage} flex items-center justify-center px-4`}>
      <Card className="w-full max-w-md sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-crimson-600">
            {recovery ? 'Choose a new password' : 'Set your password'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {recovery
              ? 'Enter a new password for your account.'
              : 'Use this password to sign in next time — no magic link needed.'}
          </p>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-14 text-lg"
          />

          <Input
            label="Confirm password"
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="min-h-14 text-lg"
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            fullWidth
            className="min-h-14 text-lg"
          >
            {submitting ? 'Saving…' : 'Save password'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          <Link to="/login" className="font-semibold text-crimson-700 hover:text-crimson-800">
            Back to login
          </Link>
        </p>
      </Card>
    </main>
  )
}
