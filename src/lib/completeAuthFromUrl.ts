import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from './supabase'

const PENDING_CODE_KEY = 'bart:pending-auth-code'
const EXCHANGED_CODE_KEY = 'bart:exchanged-auth-code'

export function urlHasAuthCallbackParams(): boolean {
  const search = new URLSearchParams(window.location.search)
  if (
    search.has('code') ||
    search.has('token_hash') ||
    search.has('error') ||
    search.has('error_description')
  ) {
    return true
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return (
    hash.has('access_token') ||
    hash.has('error') ||
    hash.has('error_description')
  )
}

/** Stash PKCE code before React Strict Mode or redirects strip the query string. */
export function stashAuthCodeFromUrl(): string | null {
  const code = new URLSearchParams(window.location.search).get('code')
  if (code) {
    sessionStorage.setItem(PENDING_CODE_KEY, code)
    return code
  }
  return sessionStorage.getItem(PENDING_CODE_KEY)
}

function clearStashedAuthCode(): void {
  sessionStorage.removeItem(PENDING_CODE_KEY)
}

function cleanAuthParamsFromUrl(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('token_hash')
  url.searchParams.delete('type')
  url.searchParams.delete('error')
  url.searchParams.delete('error_description')

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
  if (hashParams.has('access_token') || hashParams.has('error')) {
    url.hash = ''
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(message))
    }, ms)

    promise
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer)
        reject(error)
      })
  })
}

async function waitForSession(maxMs = 8000): Promise<boolean> {
  const started = Date.now()
  while (Date.now() - started < maxMs) {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      return true
    }
    await new Promise((resolve) => {
      window.setTimeout(resolve, 200)
    })
  }
  return false
}

async function exchangePkceCode(code: string): Promise<{ error?: string }> {
  if (sessionStorage.getItem(EXCHANGED_CODE_KEY) === code) {
    clearStashedAuthCode()
    cleanAuthParamsFromUrl()
    return {}
  }

  const { error } = await withTimeout(
    supabase.auth.exchangeCodeForSession(code),
    15000,
    'Sign-in timed out. Request a new activation link and try again.',
  )

    if (error) {
    const verifierMissing = error.message
      .toLowerCase()
      .includes('code verifier')

    if (verifierMissing) {
      return {
        error:
          'This link must be opened in the same browser where you requested it. Request a new activation link on this device, then open the email using Safari or Chrome (tap ⋯ → Open in Browser if your mail app shows a preview).',
      }
    }

    const alreadyUsed =
      error.message.toLowerCase().includes('already') ||
      error.message.toLowerCase().includes('expired') ||
      error.message.toLowerCase().includes('invalid')

    if (alreadyUsed) {
      const hasSession = await waitForSession(3000)
      if (hasSession) {
        sessionStorage.setItem(EXCHANGED_CODE_KEY, code)
        clearStashedAuthCode()
        cleanAuthParamsFromUrl()
        return {}
      }
    }

    return { error: error.message }
  }

  sessionStorage.setItem(EXCHANGED_CODE_KEY, code)
  clearStashedAuthCode()
  cleanAuthParamsFromUrl()
  return {}
}

async function exchangeHashTokens(hash: string): Promise<{ error?: string }> {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')

  if (!accessToken) {
    return { error: 'Sign-in link expired or invalid. Request a new activation link.' }
  }

  const { error } = await withTimeout(
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken ?? '',
    }),
    15000,
    'Sign-in timed out. Request a new activation link and try again.',
  )

  if (error) {
    return { error: error.message }
  }

  cleanAuthParamsFromUrl()
  return {}
}

function emailOtpTypeFromUrl(typeParam: string | null): EmailOtpType {
  switch (typeParam) {
    case 'signup':
    case 'invite':
    case 'magiclink':
    case 'recovery':
    case 'email_change':
    case 'email':
      return typeParam
    default:
      return 'email'
  }
}

async function verifyTokenHashFromUrl(
  tokenHash: string,
  typeParam: string | null,
): Promise<{ error?: string }> {
  const { error } = await withTimeout(
    supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: emailOtpTypeFromUrl(typeParam),
    }),
    15000,
    'Sign-in timed out. Request a new activation link and try again.',
  )

  if (error) {
    return { error: error.message }
  }

  cleanAuthParamsFromUrl()
  return {}
}

/** Exchange PKCE code, token hash, or hash tokens from an email link (single handler — no detectSessionInUrl). */
export async function completeAuthFromUrl(): Promise<{ error?: string }> {
  const url = new URL(window.location.href)
  const oauthError =
    url.searchParams.get('error_description') ?? url.searchParams.get('error')
  if (oauthError) {
    return { error: oauthError }
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
  const hashError =
    hashParams.get('error_description') ?? hashParams.get('error')
  if (hashError) {
    return { error: hashError }
  }

  const tokenHash = url.searchParams.get('token_hash')
  if (tokenHash) {
    return verifyTokenHashFromUrl(tokenHash, url.searchParams.get('type'))
  }

  const code = stashAuthCodeFromUrl()
  if (code) {
    return exchangePkceCode(code)
  }

  if (hashParams.has('access_token')) {
    return exchangeHashTokens(url.hash)
  }

  const hasSession = await waitForSession(2000)
  if (hasSession) {
    cleanAuthParamsFromUrl()
    return {}
  }

  return {
    error: 'Sign-in link expired or invalid. Request a new activation link from the login page.',
  }
}
