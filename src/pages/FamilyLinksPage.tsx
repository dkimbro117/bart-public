import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isStaffAdmin } from '../lib/auth'
import { emailFamilyPortalLink } from '../lib/guardianPortal'
import {
  alertErrorInline,
  btnPrimary,
  inputClass,
  labelClass,
  textSubtle,
} from '../ui/classes'

export default function FamilyLinksPage() {
  const { profile } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    message: string
    status: 'sent' | 'not_found'
  } | null>(null)

  if (!isStaffAdmin(profile)) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const response = await emailFamilyPortalLink(email)
      setResult(response)
      if (response.status === 'sent') {
        setEmail('')
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not email family link.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Email family link
        </h1>
        <p className={`mt-1 text-sm ${textSubtle}`}>
          Parents use{' '}
          <a
            href="/family"
            className="font-medium text-crimson-700 hover:text-crimson-800"
          >
            /family
          </a>{' '}
          themselves — same private link all season. Use this only to resend
          that email. You do not need to copy or forward a URL.
        </p>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <label className="block">
          <span className={labelClass}>Guardian email</span>
          <input
            type="email"
            required
            disabled={submitting}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="parent@example.com"
          />
        </label>

        {error && <p className={alertErrorInline}>{error}</p>}
        {result && (
          <div
            className={
              result.status === 'sent'
                ? 'rounded-[20px] border border-emerald-200 bg-emerald-50 p-4'
                : 'rounded-[20px] border border-amber-200 bg-amber-50 p-4'
            }
          >
            <p className="text-sm font-semibold text-ink-900">
              {result.status === 'sent' ? 'Link sent' : 'Email not on roster'}
            </p>
            <p className="mt-1 text-sm text-ink-800">{result.message}</p>
          </div>
        )}

        <button type="submit" disabled={submitting} className={btnPrimary}>
          {submitting ? 'Sending…' : 'Email link to parent'}
        </button>
      </form>
    </section>
  )
}
