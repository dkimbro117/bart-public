import { isAuthError, type AuthError } from '@supabase/supabase-js'

const SIGN_IN_FALLBACK = 'Sign-in failed. Please try again.'

function isBlankMessage(message: string | undefined): boolean {
  const trimmed = message?.trim()
  return !trimmed || trimmed === '{}'
}

function activationOrigin(): string {
  return typeof window !== 'undefined'
    ? window.location.origin
    : 'https://your-app.vercel.app'
}

function activationFallback(error?: AuthError): string {
  const origin = activationOrigin()
  const callback = `${origin}/auth/callback`
  const details =
    error?.status != null || error?.code
      ? ` (${[error?.status, error?.code].filter(Boolean).join(', ')})`
      : ''

  return [
    `Could not send activation link${details}.`,
    'Check:',
    `(1) your work email is in Supabase → SQL → staff_allowlist,`,
    `(2) Authentication → URL configuration → Site URL is ${origin},`,
    `(3) Redirect URLs includes ${callback} (or ${origin}/**),`,
    '(4) Vercel env vars VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY match this Supabase project.',
  ].join(' ')
}

function mapKnownAuthMessage(message: string, context: 'activate' | 'signin' | 'forgot'): string | null {
  if (/not authorized|not on the staff allowlist|staff allowlist/i.test(message)) {
    return 'This email is not on the staff allowlist yet. A chapter admin must add it in Supabase (staff_allowlist table), then try again.'
  }

  if (/database error saving new user|user already registered/i.test(message)) {
    return 'This email may not be on the staff allowlist, or an account already exists. Ask an admin to add or verify your email in staff_allowlist, then try again.'
  }

  if (/redirect/i.test(message)) {
    const callback = `${activationOrigin()}/auth/callback`
    return `${message} In Supabase → Authentication → URL configuration, set Site URL to ${activationOrigin()} and add Redirect URL ${callback} (exact match).`
  }

  if (/rate limit|too many requests/i.test(message)) {
    return 'Too many email requests. Wait a few minutes and try again.'
  }

  if (context === 'forgot' && /user not found/i.test(message)) {
    return message
  }

  return null
}

/** True when Vite env vars were present at build time. */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return Boolean(
    url &&
      key &&
      url !== 'undefined' &&
      key !== 'undefined' &&
      !url.includes('your-project'),
  )
}

export function formatAuthError(
  error: unknown,
  context: 'activate' | 'signin' | 'forgot' = 'signin',
): string {
  const fallback =
    context === 'activate'
      ? activationFallback(isAuthError(error) ? error : undefined)
      : SIGN_IN_FALLBACK

  if (typeof error === 'string') {
    const trimmed = error.trim()
    if (isBlankMessage(trimmed)) {
      return fallback
    }
    return mapKnownAuthMessage(trimmed, context) ?? trimmed
  }

  if (isAuthError(error)) {
    const msg = error.message?.trim()

    if (!isBlankMessage(msg)) {
      return mapKnownAuthMessage(msg!, context) ?? msg!
    }

    if (error.status === 0) {
      return 'Network error — check your connection. If this is a new deploy, confirm VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel and redeploy.'
    }

    if (error.code === 'P0001') {
      return 'This email is not authorized for B.A.R.T. staff access. Ask an admin to add it to the staff allowlist.'
    }

    if (error.code) {
      return `${fallback}`
    }
  }

  if (error instanceof Error && !isBlankMessage(error.message)) {
    return mapKnownAuthMessage(error.message.trim(), context) ?? error.message.trim()
  }

  return fallback
}
