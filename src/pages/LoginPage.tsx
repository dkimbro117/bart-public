import { FormEvent, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import BartWordmark, {
  BART_CHAPTER_LINE,
  BART_MISSION,
} from '../components/brand/BartWordmark'
import PatentNotice from '../components/brand/PatentNotice'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { markPasswordSet } from '../lib/auth'
import { formatAuthError, isSupabaseConfigured } from '../lib/authErrors'
import { authRedirectUrl } from '../lib/authRedirect'
import { defaultRouteForProfile } from '../lib/defaultRoute'
import { supabase } from '../lib/supabase'
import { surfacePage, textMuted, textSubtle } from '../ui/classes'

type LoginMode = 'signin' | 'activate' | 'forgot'

export default function LoginPage() {
  const { session, loading, profile } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<LoginMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const configError = isSupabaseConfigured()
    ? null
    : 'App is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel (or .env locally), then redeploy.'

  if (!loading && session && profile) {
    if (!profile.password_set_at) {
      return <Navigate to="/login/set-password" replace />
    }

    const from =
      (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname ?? defaultRouteForProfile(profile)
    return <Navigate to={from} replace />
  }

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const trimmedEmail = email.trim()

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })

    if (signInError) {
      setSubmitting(false)
      setError('Invalid email or password.')
      return
    }

    if (data.user) {
      try {
        await markPasswordSet(data.user.id)
      } catch {
        // Profile refresh happens via onAuthStateChange.
      }
    }

    setSubmitting(false)
  }

  async function handleEmailOnlySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSent(false)

    const trimmedEmail = email.trim()

    if (mode === 'activate') {
      const { data: onAllowlist, error: allowlistError } = await supabase.rpc(
        'is_staff_email',
        { check_email: trimmedEmail },
      )

      if (!allowlistError && onAllowlist === false) {
        setSubmitting(false)
        setError(
          'This email is not on the staff allowlist yet. A chapter admin must add it in Supabase (staff_allowlist table), then try again.',
        )
        return
      }
    }

    if (mode === 'forgot') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        { redirectTo: authRedirectUrl() },
      )

      setSubmitting(false)

      if (resetError) {
        setError(formatAuthError(resetError, 'forgot'))
        return
      }

      setSent(true)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: authRedirectUrl(),
        shouldCreateUser: true,
      },
    })

    setSubmitting(false)

    if (signInError) {
      console.error('Activation OTP failed', signInError)
      setError(formatAuthError(signInError, 'activate'))
      return
    }

    setSent(true)
  }

  function switchMode(next: LoginMode) {
    setMode(next)
    setError(null)
    setSent(false)
    setPassword('')
  }

  return (
    <main className={`${surfacePage} flex items-center justify-center px-4`}>
      <Card className="w-full max-w-md sm:p-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <BartWordmark size="lg" />
          </div>
          <p className="mt-4 text-lg font-semibold text-ink-900">{BART_MISSION}</p>
          <p className={`mt-1 text-sm ${textSubtle}`}>{BART_CHAPTER_LINE}</p>
          <p className="mt-5 text-base font-semibold text-ink-900">Staff sign-in</p>
          <p className={`mt-1 text-sm ${textMuted}`}>
            {mode === 'signin' &&
              'Allowlisted chapter staff only. Sign in with your password.'}
            {mode === 'activate' &&
              'First time? A chapter admin must add your work email to the staff allowlist first. Then we email you a link to activate your account.'}
            {mode === 'forgot' &&
              'Enter your work email and we will send a password reset link.'}
          </p>
        </div>

        {configError && (
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            {configError}
          </p>
        )}

        {sent ? (
          <div
            className="rounded-xl bg-emerald-50 px-4 py-5 text-center ring-1 ring-emerald-200"
            role="status"
          >
            <p className="text-lg font-semibold text-emerald-800">Check your email</p>
            <p className="mt-2 text-sm text-emerald-700">
              {mode === 'forgot' ? (
                <>
                  If <strong>{email}</strong> is registered, you will receive a
                  password reset link shortly.
                </>
              ) : (
                <>
                  If <strong>{email}</strong> is on the chapter allowlist, you will
                  receive an activation link shortly. After that, set a password for
                  faster sign-in.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="mt-4 text-sm font-semibold text-crimson-700 underline hover:text-crimson-800"
            >
              Back to sign in
            </button>
          </div>
        ) : mode === 'signin' ? (
          <form
            onSubmit={(event) => void handlePasswordSignIn(event)}
            className="space-y-4"
          >
            <Input
              label="Work email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@chapter.org"
              className="min-h-14 text-lg"
            />

            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-14 text-lg"
            />

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting || Boolean(configError)}
              fullWidth
              className="min-h-14 text-lg"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>

            <div className="flex flex-col gap-2 pt-2 text-center text-sm">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="font-semibold text-crimson-700 hover:text-crimson-800"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => switchMode('activate')}
                className="text-ink-700 underline hover:text-ink-900"
              >
                First time here? Activate with email link
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(event) => void handleEmailOnlySubmit(event)}
            className="space-y-4"
          >
            <Input
              label="Work email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@chapter.org"
              className="min-h-14 text-lg"
            />

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting || Boolean(configError)}
              fullWidth
              className="min-h-14 text-lg"
            >
              {submitting
                ? 'Sending…'
                : mode === 'forgot'
                  ? 'Send reset link'
                  : 'Send activation link'}
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-sm font-semibold text-crimson-700 hover:text-crimson-800"
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}
        <p className="mt-6 text-center text-sm">
          <a
            href="/family"
            className="font-semibold text-crimson-700 hover:text-crimson-800"
          >
            Parent or guardian? View your family
          </a>
        </p>
        <p className="mt-3 text-center text-sm">
          <Link
            to="/door"
            className="font-semibold text-crimson-700 hover:text-crimson-800"
          >
            BART Volunteer? Sign in with tonight’s PIN
          </Link>
        </p>
        <PatentNotice className="mt-4" />
      </Card>
    </main>
  )
}
