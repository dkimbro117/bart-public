/** Post-auth redirect target for magic links and password reset emails. */
export function authRedirectUrl(): string {
  return `${window.location.origin}/auth/callback`
}

/** True when the URL indicates a password-recovery redirect from Supabase. */
export function isAuthRecoveryCallback(): boolean {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  if (hashParams.get('type') === 'recovery') {
    return true
  }
  const searchParams = new URLSearchParams(window.location.search)
  return searchParams.get('type') === 'recovery'
}
