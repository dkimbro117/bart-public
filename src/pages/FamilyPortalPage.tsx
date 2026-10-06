import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  emailFamilyPortalLink,
  fetchGuardianPortalFamily,
  formatUpcomingEventLabel,
  formatUpcomingSessionDate,
  type GuardianPortalChild,
  type GuardianPortalFamily,
  type GuardianPortalUpcomingSession,
} from '../lib/guardianPortal'
import { formatDisplayId, formatParticipantName } from '../lib/format'
import {
  PARTICIPANT_FORM_CONSENTS,
  type ParticipantFormConsentKey,
} from '../lib/participants'
import {
  alertErrorInline,
  btnPrimary,
  inputClass,
  labelClass,
  surfaceCard,
  textMuted,
  textSubtle,
} from '../ui/classes'

/** Shorter parent-facing labels (staff roster keeps the longer names). */
const PARENT_FORM_LABELS: Record<ParticipantFormConsentKey, string> = {
  parental_guardian_affirmation: 'Affirmation / waiver (B1)',
  media_release: 'Media release (B2)',
  youth_code_of_conduct: 'Code of conduct (B3)',
  youth_pickup_authorization: 'Pick-up authorization (B4)',
  transportation_permission: 'Transportation (B5)',
  off_site_permission: 'Off-site permission (B7)',
  medical_emergency_form: 'Medical / emergency (B8)',
  virtual_meeting_performance_agreement: 'Virtual meeting agreement (B9)',
}

function formProgress(child: GuardianPortalChild): {
  complete: number
  total: number
  missing: ParticipantFormConsentKey[]
} {
  const missing: ParticipantFormConsentKey[] = []
  let complete = 0
  for (const { key } of PARTICIPANT_FORM_CONSENTS) {
    if (child[key]) {
      complete += 1
    } else {
      missing.push(key)
    }
  }
  return { complete, total: PARTICIPANT_FORM_CONSENTS.length, missing }
}

function Stamp({ label, done }: { label: string; done: boolean }) {
  return (
    <li
      className={`rounded-xl px-3 py-2 text-center text-sm font-semibold ${
        done
          ? 'bg-emerald-50 text-emerald-800'
          : 'bg-cream-100 text-ink-500'
      }`}
    >
      <span className="block text-[11px] font-medium uppercase tracking-wide opacity-80">
        {label}
      </span>
      {done ? 'Done' : 'Not yet'}
    </li>
  )
}

function FormStatusList({ child }: { child: GuardianPortalChild }) {
  return (
    <ul className="mt-3 divide-y divide-cream-200 border-t border-cream-200">
      {PARTICIPANT_FORM_CONSENTS.map(({ key }) => {
        const onFile = child[key]
        return (
          <li
            key={key}
            className="flex items-center justify-between gap-3 py-2.5 text-sm"
          >
            <span className={onFile ? 'text-ink-700' : 'font-medium text-ink-900'}>
              {PARENT_FORM_LABELS[key]}
            </span>
            <span
              className={
                onFile
                  ? 'shrink-0 font-semibold text-emerald-700'
                  : 'shrink-0 font-semibold text-amber-800'
              }
            >
              {onFile ? 'Complete' : 'Needs form'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function ChildCard({ child }: { child: GuardianPortalChild }) {
  const { complete, total, missing } = formProgress(child)
  const allDone = missing.length === 0
  const tonight = child.tonight

  return (
    <li className={`${surfaceCard} space-y-5 p-5`}>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink-900">
            {formatParticipantName(
              child.first_name,
              child.last_initial,
              child.last_name,
            )}
          </h2>
          <span className="font-mono text-sm font-semibold text-crimson-600">
            {formatDisplayId(child.display_id)}
          </span>
        </div>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-ink-900">B.A.R.T. Bucks</h3>
        <p className="mt-1 font-display text-3xl font-bold text-crimson-700">
          {child.bucks_balance}
        </p>
        <p className={`mt-1 text-sm ${textSubtle}`}>
          Chapter rank #{child.rank}
          {child.total_boys > 0 ? ` of ${child.total_boys}` : ''}
          {child.earned_this_week > 0
            ? ` · +${child.earned_this_week} this week`
            : ''}
          {child.streak > 1 ? ` · ${child.streak}-night streak` : ''}
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink-900">Tonight</h3>
        {tonight.has_session ? (
          <>
            {tonight.session_title ? (
              <p className={`mt-1 text-sm ${textSubtle}`}>{tonight.session_title}</p>
            ) : null}
            <ul className="mt-2 grid grid-cols-3 gap-2">
              <Stamp label="Check-in" done={tonight.check_in} />
              <Stamp label="Reading" done={tonight.reading} />
              <Stamp label="Quiz" done={tonight.quiz} />
            </ul>
            {child.quiz ? (
              <p className={`mt-2 text-sm ${textSubtle}`}>
                {child.quiz.attempted
                  ? `Quiz “${child.quiz.title}”: ${child.quiz.score ?? 0}/${child.quiz.total ?? 0}`
                  : `Tonight’s quiz: ${child.quiz.title} (not taken yet)`}
              </p>
            ) : null}
          </>
        ) : (
          <p className={`mt-1 text-sm ${textSubtle}`}>
            No gathering scheduled for today.
          </p>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink-900">Required forms</h3>
        <p
          className={`mt-1 text-sm font-semibold ${
            allDone ? 'text-emerald-700' : 'text-amber-900'
          }`}
        >
          {allDone
            ? `All ${total} required forms on file`
            : `${complete} of ${total} forms complete`}
        </p>
        {!allDone && (
          <p className={`mt-1 text-sm ${textSubtle}`}>
            Still needed:{' '}
            {missing.map((key) => PARENT_FORM_LABELS[key]).join(', ')}. Complete
            them with the chapter’s JotForm links, or ask a B.A.R.T. leader.
          </p>
        )}
        <FormStatusList child={child} />
      </section>
    </li>
  )
}

function UpcomingList({
  sessions,
  note,
}: {
  sessions: GuardianPortalUpcomingSession[]
  note: string | null
}) {
  if (sessions.length === 0 && !note) return null

  return (
    <section className={`${surfaceCard} p-5`}>
      <h2 className="font-display text-lg font-bold text-ink-900">Coming up</h2>
      {note ? <p className={`mt-1 text-sm ${textSubtle}`}>{note}</p> : null}
      {sessions.length === 0 ? (
        <p className={`mt-3 text-sm ${textMuted}`}>No upcoming dates on the calendar yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-cream-200">
          {sessions.map((session) => (
            <li key={session.id} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold text-crimson-700">
                {formatUpcomingSessionDate(session.session_date)}
              </p>
              <p className="mt-0.5 text-base font-semibold text-ink-900">
                {session.title}
              </p>
              <p className={`mt-0.5 text-sm ${textMuted}`}>
                {formatUpcomingEventLabel(session.event_type)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className={`mt-3 text-xs ${textMuted}`}>
        Dates subject to change per the chapter calendar.
      </p>
    </section>
  )
}

function RequestLinkForm({ heading }: { heading?: string }) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    message: string
    status: 'sent' | 'not_found'
  } | null>(null)

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
          : 'Could not send family link.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      {heading ? (
        <p className="text-base font-semibold text-ink-900">{heading}</p>
      ) : null}
      <p className={`text-sm ${textSubtle}`}>
        Enter the email from your boy’s B.A.R.T. registration. We’ll send a
        private link — no password. The same link works all season.
      </p>
      <label className="block">
        <span className={labelClass}>Your email</span>
        <input
          type="email"
          required
          disabled={submitting}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
          placeholder="you@example.com"
          autoComplete="email"
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
        {submitting ? 'Sending…' : 'Email me my family link'}
      </button>
    </form>
  )
}

export default function FamilyPortalPage() {
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('t')?.trim() ?? '', [searchParams])
  const [family, setFamily] = useState<GuardianPortalFamily | null>(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      if (!token) {
        setFamily(null)
        setError(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const result = await fetchGuardianPortalFamily(token)
        if (!mounted) return
        setFamily(result)
      } catch (loadError) {
        if (!mounted) return
        setFamily(null)
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load family view.',
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [token])

  const childCount = family?.children.length ?? 0
  const boysLabel =
    childCount === 1 ? '1 boy' : childCount > 1 ? `${childCount} boys` : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">
          Your boys
        </h1>
        <p className={`mt-2 text-sm leading-relaxed ${textSubtle}`}>
          {token
            ? 'Progress, forms, and upcoming B.A.R.T. gatherings. View only — updates go through chapter JotForm or staff.'
            : 'See progress and form status for your B.A.R.T. boys. No staff login needed.'}
        </p>
      </div>

      {!token && <RequestLinkForm />}

      {token && loading && <p className={textMuted}>Loading…</p>}
      {token && error && (
        <div className="space-y-4">
          <p className={alertErrorInline}>{error}</p>
          <RequestLinkForm heading="Email me my link again" />
        </div>
      )}

      {family && !loading && (
        <>
          <p className={`text-sm ${textMuted}`}>
            Opened with your registration email
            {boysLabel ? ` · ${boysLabel}` : ''}
          </p>

          <UpcomingList
            sessions={family.upcoming_sessions}
            note={family.calendar_note}
          />

          {family.children.length === 0 ? (
            <div className={`${surfaceCard} p-5`}>
              <p className="text-ink-800">
                No active boys are linked to this email yet. Contact a chapter
                leader if that looks wrong.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {family.children.map((child) => (
                <ChildCard key={child.participant_id} child={child} />
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t border-cream-200 pt-5 text-center">
            <p className={`text-sm ${textMuted}`}>
              Bookmark this page — your link stays the same all season.
            </p>
            <p className={`text-sm ${textMuted}`}>
              <Link
                to="/family"
                className="font-semibold text-crimson-700 hover:text-crimson-800"
              >
                Email me this link again
              </Link>
            </p>
          </div>
        </>
      )}
    </div>
  )
}
