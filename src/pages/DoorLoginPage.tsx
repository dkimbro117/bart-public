import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import BartWordmark from '../components/brand/BartWordmark'
import PatentNotice from '../components/brand/PatentNotice'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { isDoorHelper } from '../lib/auth'
import { defaultRouteForProfile } from '../lib/defaultRoute'
import { redeemDoorGrant } from '../lib/doorGrants'
import { DOOR_ACCESS_ENDED_KEY } from '../hooks/useDoorAccessGuard'
import { supabase } from '../lib/supabase'
import { inputClass, labelClass, surfacePage, textMuted } from '../ui/classes'

export default function DoorLoginPage() {
  const { session, profile, loading, signOut } = useAuth()
  const [pin, setPin] = useState('')
  const [helperName, setHelperName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [endedNotice, setEndedNotice] = useState(false)

  useEffect(() => {
    const saved = sessionStorage.getItem('bart_door_helper_name')
    if (saved) setHelperName(saved)
    if (sessionStorage.getItem(DOOR_ACCESS_ENDED_KEY) === '1') {
      setEndedNotice(true)
      sessionStorage.removeItem(DOOR_ACCESS_ENDED_KEY)
    }
  }, [])

  // Already on a door PIN shift — go to the door screens.
  if (!loading && session && profile && isDoorHelper(profile)) {
    return <Navigate to={defaultRouteForProfile(profile)} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Staff leftover session blocks a new door PIN login — clear it first.
      if (session) {
        await supabase.auth.signOut()
      }

      const tokens = await redeemDoorGrant({ pin, helperName })
      sessionStorage.setItem('bart_door_helper_name', tokens.helper_name)
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      })
      if (sessionError) {
        throw sessionError
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not start the door session.',
      )
      setSubmitting(false)
    }
  }

  async function handleStaffSignOut() {
    setSigningOut(true)
    setError(null)
    try {
      await signOut()
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : 'Could not sign out.',
      )
      setSigningOut(false)
    }
  }

  const staffBlocking =
    !loading && Boolean(session && profile && !isDoorHelper(profile))

  return (
    <main className={`${surfacePage} flex items-center justify-center px-4`}>
      <Card className="w-full max-w-md sm:p-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <BartWordmark size="lg" />
          </div>
          <p className="mt-5 text-base font-semibold text-ink-900">
            BART Volunteer sign-in
          </p>
          <p className={`mt-1 text-sm ${textMuted}`}>
            Enter tonight’s shared PIN from staff, then your name. Access lasts
            only while door night is active — when staff ends it, you need a new
            PIN.
          </p>
        </div>

        {endedNotice && (
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            Door night ended. Ask staff for the new PIN to sign in again.
          </p>
        )}

        {loading ? (
          <p className={`text-center text-sm ${textMuted}`}>Loading…</p>
        ) : staffBlocking ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
              You’re signed in with a staff account
              {profile?.full_name ? ` (${profile.full_name})` : ''}. Sign out
              first to use tonight’s volunteer PIN, or keep using staff tools.
            </p>
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}
            <Button
              type="button"
              disabled={signingOut}
              fullWidth
              className="min-h-14"
              onClick={() => void handleStaffSignOut()}
            >
              {signingOut ? 'Signing out…' : 'Sign out and use PIN'}
            </Button>
            <p className="text-center text-sm">
              <Link
                to={defaultRouteForProfile(profile)}
                className="font-semibold text-crimson-700"
              >
                Stay signed in as staff
              </Link>
            </p>
          </div>
        ) : (
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="space-y-4"
          >
            <Input
              label="Tonight’s PIN"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="123456"
              className="min-h-14 text-center text-2xl tracking-[0.4em]"
            />

            <label className="block">
              <span className={labelClass}>Your name</span>
              <input
                className={inputClass}
                required
                minLength={2}
                value={helperName}
                onChange={(event) => setHelperName(event.target.value)}
                placeholder="First and last name"
                autoComplete="name"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={
                submitting || pin.length !== 6 || helperName.trim().length < 2
              }
              fullWidth
              className="min-h-14"
            >
              {submitting ? 'Opening door…' : 'Start door shift'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="font-semibold text-crimson-700">
            Staff email sign-in
          </Link>
        </p>
        <PatentNotice className="mt-4" />
      </Card>
    </main>
  )
}
