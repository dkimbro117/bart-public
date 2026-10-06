import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { fetchPortalBucksBalance } from '../../lib/bucks'
import { formatDisplayId, formatParticipantName } from '../../lib/format'
import {
  fetchPortalIdentity,
  fetchPortalLeaderboard,
  fetchPortalProgress,
  fetchPortalTodayStamps,
  type PortalIdentity,
  type PortalLeaderboardRow,
  type PortalProgress,
  type PortalTodayStamps,
} from '../../lib/participantPortal'
import {
  normalizeParticipantGoToken,
  participantGoQuizUrl,
  readParticipantGoToken,
  signOutParticipantGo,
  writeParticipantGoToken,
} from '../../lib/participantGoToken'
import { surfaceCard, textSubtle } from '../../ui/classes'

function StampCircle({ label, earned }: { label: string; earned: boolean }) {
  return (
    <li className="flex flex-col items-center gap-2 text-center">
      <span
        aria-hidden
        className={[
          'flex h-20 w-20 items-center justify-center rounded-full border-4',
          earned
            ? 'border-crimson-600 bg-crimson-600 text-cream-50'
            : 'border-dashed border-cream-300',
        ].join(' ')}
      >
        {earned && (
          <svg
            className="h-10 w-10"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </span>
      <span className="text-base font-semibold text-slate-900">{label}</span>
      <span
        className={`text-sm font-medium ${earned ? 'text-crimson-700' : 'text-slate-500'}`}
      >
        {earned ? 'Done!' : 'Not yet'}
      </span>
    </li>
  )
}

export default function GoProfilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<PortalIdentity | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [stamps, setStamps] = useState<PortalTodayStamps | null>(null)
  const [board, setBoard] = useState<PortalLeaderboardRow[]>([])
  const [progress, setProgress] = useState<PortalProgress | null>(null)

  const loadProfile = useCallback(async (rawToken: string) => {
    const token = normalizeParticipantGoToken(rawToken)
    if (!token) {
      setError('We could not find your badge. Scan it again.')
      setLoading(false)
      return
    }

    writeParticipantGoToken(token)
    setLoading(true)
    setError(null)

    try {
      const [nextContext, nextBalance, nextStamps, nextBoard, nextProgress] =
        await Promise.all([
          fetchPortalIdentity(token),
          fetchPortalBucksBalance(token),
          fetchPortalTodayStamps(token),
          fetchPortalLeaderboard(token),
          fetchPortalProgress(token).catch(() => null),
        ])
      setContext(nextContext)
      setBalance(nextBalance)
      setStamps(nextStamps)
      setBoard(nextBoard)
      setProgress(nextProgress)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'We could not open your badge. Ask a leader.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const fromQuery = searchParams.get('t')
    const stored = readParticipantGoToken()
    const token = fromQuery ?? stored
    if (!token) {
      navigate('/go', { replace: true })
      return
    }
    void loadProfile(token)
  }, [loadProfile, navigate, searchParams])

  if (loading) {
    return <p className={`text-lg ${textSubtle}`}>Opening your badge…</p>
  }

  if (error || !context) {
    return (
      <section className="space-y-4">
        <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-base text-amber-900">
          {error ?? 'We could not open your badge. Ask a leader.'}
        </p>
        <Button
          type="button"
          fullWidth
          className="min-h-16 text-xl"
          onClick={() => {
            signOutParticipantGo()
            navigate('/go', { replace: true })
          }}
        >
          Scan again
        </Button>
      </section>
    )
  }

  const token = readParticipantGoToken()

  return (
    <section className="space-y-5">
      <div className={`${surfaceCard} border border-cream-200 p-5 text-center`}>
        <p className="font-mono text-2xl font-bold text-crimson-600">
          {formatDisplayId(context.display_id)}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          {formatParticipantName(context.first_name, context.last_initial)}
        </h1>
        <p className="mt-4 text-sm uppercase tracking-wide text-slate-500">
          BART Bucks
        </p>
        <p className="text-5xl font-bold text-crimson-600">{balance ?? '—'}</p>
      </div>

      <div className={`${surfaceCard} border border-cream-200 p-5`}>
        <h2 className="text-lg font-semibold">Tonight’s stamps</h2>
        <ul className="mt-4 grid grid-cols-3 gap-3">
          <StampCircle label="Checked in" earned={Boolean(stamps?.check_in)} />
          <StampCircle label="Reading" earned={Boolean(stamps?.reading)} />
          <StampCircle label="Quiz" earned={Boolean(stamps?.quiz)} />
        </ul>
      </div>

      {progress && (
        <div className={`${surfaceCard} border border-cream-200 p-5 text-center`}>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            This week
          </p>
          <p className="text-4xl font-bold text-crimson-600">
            +{progress.earned_this_week} Bucks
          </p>
          {progress.streak > 1 && (
            <p className="mt-3 text-base font-medium text-slate-800">
              You came {progress.streak} reading nights in a row!
            </p>
          )}
          {progress.total > 0 && (
            <p className="mt-1 text-sm text-slate-500">
              You are #{progress.rank} of {progress.total}.
            </p>
          )}
        </div>
      )}

      {board.length > 0 && (
        <div className={`${surfaceCard} border border-cream-200 p-5`}>
          <h2 className="text-lg font-semibold">Top 3</h2>
          <ol className="mt-3 space-y-2">
            {board.slice(0, 3).map((row, index) => {
              const isMe = row.display_id === context.display_id
              return (
                <li
                  key={`${row.display_id}-${row.first_name}`}
                  className={`flex items-center justify-between rounded-lg px-2 py-1 text-base ${
                    isMe ? 'bg-crimson-50 font-bold text-crimson-800' : ''
                  }`}
                >
                  <span>
                    {index + 1}.{' '}
                    {isMe
                      ? 'You'
                      : formatParticipantName(row.first_name, row.last_initial)}
                  </span>
                  <span className="font-mono font-semibold">{row.balance}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      <Button
        type="button"
        fullWidth
        disabled={!token}
        className="min-h-16 text-xl"
        onClick={() => token && navigate(participantGoQuizUrl(token))}
      >
        {stamps?.quiz ? 'See quiz' : 'Take today’s quiz'}
      </Button>

      <button
        type="button"
        onClick={() => {
          signOutParticipantGo()
          navigate('/go', { replace: true })
        }}
        className="mx-auto block min-h-12 px-4 text-sm font-medium text-slate-500 underline underline-offset-4"
      >
        Not you?
      </button>
    </section>
  )
}
