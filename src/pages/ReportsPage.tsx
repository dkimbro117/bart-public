import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TrendIndicator from '../components/reports/TrendIndicator'
import { BrandedEmptyState } from '../components/brand/BrandedStates'
import { useAuth } from '../contexts/AuthContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { formatSessionLabel, todayIsoDate } from '../lib/dates'
import { formatDisplayId, formatParticipantName } from '../lib/format'
import { matchesParticipantLookup } from '../lib/checkIn'
import { PARTICIPANT_ROSTER_LIST } from '../lib/participantColumns'
import type { Participant } from '../lib/participants'
import { pickDefaultSessionId } from '../lib/sessions'
import {
  downloadParticipantReportCsv,
  downloadSessionReportCsv,
  fetchGuardianEmailMap,
  fetchParticipantReport,
  fetchSessionReport,
  formatAttendanceStatus,
  formatQuizResult,
  summarizeSessionReport,
  withParticipantTrends,
  type ParticipantSessionSummary,
} from '../lib/reports'
import {
  sendSessionGuardianReports,
  type SendSessionGuardianReportsResult,
} from '../lib/guardianReports'
import {
  downloadRosterExportCsv,
  fetchRosterExportRows,
  type RosterExportRow,
} from '../lib/rosterExport'
import { supabase } from '../lib/supabase'
import {
  alertErrorInline,
  filterPill,
  filterPillActive,
  headingPage,
  inputClass,
  labelClass,
  sectionCard,
  tableBody,
  tableWrap,
  textSubtle,
} from '../ui/classes'

type ReportTab = 'session' | 'participant' | 'roster'

export default function ReportsPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [searchParams] = useSearchParams()
  const { sessions, selectedSessionId } = useSyncStatus()
  const [tab, setTab] = useState<ReportTab>('session')
  const [sessionId, setSessionId] = useState('')
  const [participantId, setParticipantId] = useState('')
  const [participantSearch, setParticipantSearch] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [sessionRows, setSessionRows] = useState<ParticipantSessionSummary[]>([])
  const [participantRows, setParticipantRows] = useState<ParticipantSessionSummary[]>(
    [],
  )
  const [loadingParticipants, setLoadingParticipants] = useState(true)
  const [loadingSession, setLoadingSession] = useState(false)
  const [loadingParticipant, setLoadingParticipant] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardianSendConfirmOpen, setGuardianSendConfirmOpen] = useState(false)
  const [sendingGuardianReports, setSendingGuardianReports] = useState(false)
  const [guardianSendResult, setGuardianSendResult] =
    useState<SendSessionGuardianReportsResult | null>(null)
  const [guardianEmailMap, setGuardianEmailMap] = useState<
    Map<string, string | null>
  >(new Map())
  const [rosterRows, setRosterRows] = useState<RosterExportRow[]>([])
  const [rosterSelectedIds, setRosterSelectedIds] = useState<Set<string>>(
    new Set(),
  )
  const [rosterSearch, setRosterSearch] = useState('')
  const [loadingRoster, setLoadingRoster] = useState(false)

  const querySessionId = searchParams.get('session') ?? ''

  const todaySessionId = useMemo(() => {
    return pickDefaultSessionId(sessions, todayIsoDate()) ?? ''
  }, [sessions])

  useEffect(() => {
    if (
      querySessionId &&
      sessions.some((session) => session.id === querySessionId)
    ) {
      setSessionId(querySessionId)
      return
    }
    if (!sessionId && (selectedSessionId || todaySessionId)) {
      setSessionId(selectedSessionId || todaySessionId)
    }
  }, [querySessionId, sessionId, selectedSessionId, sessions, todaySessionId])

  useEffect(() => {
    let mounted = true

    async function loadParticipants() {
      setLoadingParticipants(true)

      const { data, error: fetchError } = await supabase
        .from('participants')
        .select(PARTICIPANT_ROSTER_LIST)
        .eq('active', true)
        .order('display_id', { ascending: true })

      if (!mounted) return

      if (fetchError) {
        setError(fetchError.message)
        setParticipants([])
      } else {
        setParticipants(
          (data ?? []).map((row) => ({
            ...row,
            guardian_name: '',
            authorized_pickups: [],
            qr_token: '',
            created_at: null,
          })),
        )
      }

      setLoadingParticipants(false)
    }

    void loadParticipants()

    return () => {
      mounted = false
    }
  }, [])

  const loadSessionReport = useCallback(async () => {
    if (!sessionId) {
      setSessionRows([])
      return
    }

    setLoadingSession(true)
    setError(null)

    try {
      const rows = await fetchSessionReport(sessionId)
      setSessionRows(rows)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load session report.',
      )
      setSessionRows([])
    } finally {
      setLoadingSession(false)
    }
  }, [sessionId])

  const loadParticipantReport = useCallback(async () => {
    if (!participantId) {
      setParticipantRows([])
      return
    }

    setLoadingParticipant(true)
    setError(null)

    try {
      const rows = await fetchParticipantReport(participantId)
      setParticipantRows(rows)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load participant report.',
      )
      setParticipantRows([])
    } finally {
      setLoadingParticipant(false)
    }
  }, [participantId])

  const loadRosterExport = useCallback(async () => {
    setLoadingRoster(true)
    setError(null)
    try {
      const rows = await fetchRosterExportRows()
      setRosterRows(rows)
      setRosterSelectedIds(
        new Set(rows.filter((row) => row.active).map((row) => row.id)),
      )
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load roster export.',
      )
      setRosterRows([])
    } finally {
      setLoadingRoster(false)
    }
  }, [])

  useEffect(() => {
    if (tab !== 'roster') return
    void loadRosterExport()
  }, [tab, loadRosterExport])

  useEffect(() => {
    if (tab === 'session') {
      void loadSessionReport()
    }
  }, [tab, loadSessionReport])

  useEffect(() => {
    if (tab === 'participant') {
      void loadParticipantReport()
    }
  }, [tab, loadParticipantReport])

  const selectedSession =
    sessions.find((session) => session.id === sessionId) ?? null
  const sessionSummary = useMemo(
    () => summarizeSessionReport(sessionRows),
    [sessionRows],
  )

  const guardianEmailCounts = useMemo(() => {
    let withEmail = 0
    let withoutEmail = 0

    for (const row of sessionRows) {
      const email = row.participant_id
        ? guardianEmailMap.get(row.participant_id)
        : null
      if (email?.trim()) {
        withEmail += 1
      } else {
        withoutEmail += 1
      }
    }

    return { withEmail, withoutEmail }
  }, [sessionRows, guardianEmailMap])

  useEffect(() => {
    if (!isAdmin || sessionRows.length === 0) {
      setGuardianEmailMap(new Map())
      return
    }

    let mounted = true
    const participantIds = sessionRows
      .map((row) => row.participant_id)
      .filter((id): id is string => Boolean(id))

    void fetchGuardianEmailMap(participantIds).then(
      (map) => {
        if (mounted) {
          setGuardianEmailMap(map)
        }
      },
      () => {
        if (mounted) {
          setGuardianEmailMap(new Map())
        }
      },
    )

    return () => {
      mounted = false
    }
  }, [isAdmin, sessionRows])

  const filteredParticipants = useMemo(
    () =>
      participants.filter((participant) =>
        matchesParticipantLookup(participant, participantSearch),
      ),
    [participants, participantSearch],
  )

  const selectedParticipant =
    participants.find((participant) => participant.id === participantId) ?? null

  const participantHistory = useMemo(
    () => withParticipantTrends(participantRows),
    [participantRows],
  )

  const filteredRosterRows = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase()
    if (!q) return rosterRows
    return rosterRows.filter((row) => {
      const name = formatParticipantName(
        row.first_name,
        row.last_initial,
        row.last_name,
      ).toLowerCase()
      return (
        name.includes(q) ||
        row.first_name.toLowerCase().includes(q) ||
        String(row.display_id).includes(q) ||
        (row.guardian_name ?? '').toLowerCase().includes(q)
      )
    })
  }, [rosterRows, rosterSearch])

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className={headingPage}>Reports</h1>
          <p className={`mt-1 ${textSubtle}`}>
            Session and participant summaries, plus full roster export matching
            edit-participant fields.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('session')}
            className={[
              'min-h-12 touch-manipulation px-4 text-base font-semibold',
              tab === 'session' ? filterPillActive : filterPill,
            ].join(' ')}
          >
            By session
          </button>
          <button
            type="button"
            onClick={() => setTab('participant')}
            className={[
              'min-h-12 touch-manipulation px-4 text-base font-semibold',
              tab === 'participant' ? filterPillActive : filterPill,
            ].join(' ')}
          >
            By participant
          </button>
          <button
            type="button"
            onClick={() => setTab('roster')}
            className={[
              'min-h-12 touch-manipulation px-4 text-base font-semibold',
              tab === 'roster' ? filterPillActive : filterPill,
            ].join(' ')}
          >
            Roster export
          </button>
        </div>
      </div>

      {error && (
        <p className={alertErrorInline}>
          {error}
        </p>
      )}

      {tab === 'session' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <label className="block flex-1">
              <span className={labelClass}>
                Session
              </span>
              <select
                value={sessionId}
                disabled={sessions.length === 0}
                onChange={(event) => {
                  setSessionId(event.target.value)
                  setGuardianSendConfirmOpen(false)
                  setGuardianSendResult(null)
                }}
                className={inputClass}
              >
                {sessions.length === 0 ? (
                  <option value="">No sessions available</option>
                ) : (
                  sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {formatSessionLabel(session.title, session.session_date)}
                    </option>
                  ))
                )}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              {isAdmin && (
                <button
                  type="button"
                  disabled={
                    loadingSession ||
                    sessionRows.length === 0 ||
                    !selectedSession ||
                    guardianEmailCounts.withEmail === 0
                  }
                  onClick={() => {
                    setGuardianSendResult(null)
                    setGuardianSendConfirmOpen(true)
                  }}
                  className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl border border-crimson-600 bg-white px-5 py-3 text-base font-semibold text-crimson-700 hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send guardian reports
                </button>
              )}

              <button
                type="button"
                disabled={loadingSession || sessionRows.length === 0 || !selectedSession}
                onClick={() => {
                  if (!selectedSession) return
                  downloadSessionReportCsv(
                    sessionRows,
                    selectedSession.title,
                    selectedSession.session_date,
                    isAdmin ? guardianEmailMap : undefined,
                  )
                }}
                className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl bg-crimson-600 px-5 py-3 text-base font-semibold text-white hover:bg-crimson-500 active:bg-crimson-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Export CSV
              </button>
            </div>
          </div>

          {isAdmin && guardianSendConfirmOpen && selectedSession && (
            <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 ring-1 ring-amber-200">
              <p className="font-semibold text-amber-900">Send guardian reports?</p>
              <p className="mt-2 text-sm text-amber-800">
                Email {guardianEmailCounts.withEmail} guardian
                {guardianEmailCounts.withEmail === 1 ? '' : 's'} for{' '}
                {formatSessionLabel(
                  selectedSession.title,
                  selectedSession.session_date,
                )}
                .
                {guardianEmailCounts.withoutEmail > 0 && (
                  <>
                    {' '}
                    {guardianEmailCounts.withoutEmail} boy
                    {guardianEmailCounts.withoutEmail === 1 ? '' : 's'} will be
                    skipped (no guardian email on file).
                  </>
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={sendingGuardianReports}
                  onClick={async () => {
                    setSendingGuardianReports(true)
                    setError(null)
                    setGuardianSendResult(null)

                    try {
                      const result = await sendSessionGuardianReports(sessionId)
                      setGuardianSendResult(result)
                      setGuardianSendConfirmOpen(false)
                    } catch (sendError) {
                      setError(
                        sendError instanceof Error
                          ? sendError.message
                          : 'Failed to send guardian reports.',
                      )
                    } finally {
                      setSendingGuardianReports(false)
                    }
                  }}
                  className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl bg-crimson-600 px-5 py-3 text-base font-semibold text-white hover:bg-crimson-500 active:bg-crimson-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingGuardianReports ? 'Sending…' : 'Confirm send'}
                </button>
                <button
                  type="button"
                  disabled={sendingGuardianReports}
                  onClick={() => setGuardianSendConfirmOpen(false)}
                  className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl border border-crimson-600 bg-white px-5 py-3 text-base font-semibold text-crimson-700 hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isAdmin && guardianSendResult && (
            <div className={`space-y-4 ${sectionCard} px-4 py-4`}>
              <div>
                <p className="font-semibold text-slate-900">Guardian email results</p>
                <p className="mt-1 text-sm text-slate-500">
                  {guardianSendResult.sent} sent, {guardianSendResult.failed} failed,{' '}
                  {guardianSendResult.skipped_no_email} skipped (no email).
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-cream-200">
                <table className="min-w-full divide-y divide-cream-200 text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-cream-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Boy</th>
                      <th className="px-4 py-3 font-medium">Guardian email</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200 text-slate-900">
                    {guardianSendResult.results.map((result) => (
                      <tr key={result.participant_id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{result.participant_name}</p>
                          {result.display_id != null && (
                            <p className="font-mono text-xs text-crimson-600">
                              {formatDisplayId(result.display_id)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {result.guardian_email ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          {result.status === 'sent' && (
                            <span className="text-emerald-700">Sent</span>
                          )}
                          {result.status === 'failed' && (
                            <span className="text-red-700">
                              Failed
                              {result.error ? `: ${result.error}` : ''}
                            </span>
                          )}
                          {result.status === 'skipped_no_email' && (
                            <span className="text-slate-500">Skipped (no email)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className={`${sectionCard} px-4 py-4`}>
              <p className="text-sm text-slate-500">Headcount (attended)</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {sessionSummary.headcount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {sessionSummary.boysWithActivity} with any activity logged
              </p>
            </div>
            <div className={`${sectionCard} px-4 py-4`}>
              <p className="text-sm text-slate-500">Avg minutes read</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {sessionSummary.avgMinutes.toFixed(1)}
              </p>
            </div>
            <div className={`${sectionCard} px-4 py-4`}>
              <p className="text-sm text-slate-500">Avg quiz score</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {sessionSummary.avgQuizPercent == null
                  ? '—'
                  : `${sessionSummary.avgQuizPercent.toFixed(0)}%`}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {sessionSummary.quizAttemptCount} quiz
                {sessionSummary.quizAttemptCount === 1 ? '' : 'zes'} taken
              </p>
            </div>
          </div>

          {loadingSession ? (
            <p className="text-slate-500">Loading session report…</p>
          ) : sessionRows.length === 0 ? (
            <BrandedEmptyState>
              No activity logged for this session yet.
            </BrandedEmptyState>
          ) : (
            <div className={tableWrap}>
              <table className="min-w-full divide-y divide-cream-200 text-left text-sm">
                <thead className="sticky top-0 z-10 bg-cream-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Boy</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Minutes</th>
                    <th className="px-4 py-3 font-medium">Quiz</th>
                    <th className="px-4 py-3 font-medium">Pickup</th>
                  </tr>
                </thead>
                <tbody className={tableBody}>
                  {sessionRows.map((row) => (
                    <tr key={`${row.participant_id}-${row.session_id}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">
                          {formatParticipantName(
                            row.first_name ?? '',
                            row.last_initial ?? '',
                          )}
                        </p>
                        <p className="font-mono text-xs text-crimson-600">
                          {formatDisplayId(row.display_id ?? 0)}
                        </p>
                      </td>
                      <td className="px-4 py-3">{formatAttendanceStatus(row)}</td>
                      <td className="px-4 py-3">{row.minutes_read ?? 0}</td>
                      <td className="px-4 py-3">{formatQuizResult(row)}</td>
                      <td className="px-4 py-3">{row.pickup_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'participant' && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className={labelClass}>
                Search participant
              </span>
              <input
                type="search"
                value={participantSearch}
                disabled={loadingParticipants}
                onChange={(event) => setParticipantSearch(event.target.value)}
                placeholder="Name or #display_id"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>
                Participant
              </span>
              <select
                value={participantId}
                disabled={loadingParticipants || filteredParticipants.length === 0}
                onChange={(event) => setParticipantId(event.target.value)}
                className={inputClass}
              >
                <option value="">Select a boy</option>
                {filteredParticipants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {formatParticipantName(
                      participant.first_name,
                      participant.last_initial,
                      participant.last_name,
                    )}{' '}
                    ({formatDisplayId(participant.display_id)})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={
                loadingParticipant ||
                participantHistory.length === 0 ||
                !selectedParticipant
              }
              onClick={() => {
                if (!selectedParticipant) return
                downloadParticipantReportCsv(
                  participantHistory,
                  formatParticipantName(
                    selectedParticipant.first_name,
                    selectedParticipant.last_initial,
                    selectedParticipant.last_name,
                  ),
                  selectedParticipant.display_id,
                )
              }}
              className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl bg-crimson-600 px-5 py-3 text-base font-semibold text-white hover:bg-crimson-500 active:bg-crimson-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Export CSV
            </button>
          </div>

          {!participantId ? (
            <BrandedEmptyState>
              Choose a participant to see session history and trends.
            </BrandedEmptyState>
          ) : loadingParticipant ? (
            <p className="text-slate-500">Loading participant history…</p>
          ) : participantHistory.length === 0 ? (
            <BrandedEmptyState>
              No session activity logged for this boy yet.
            </BrandedEmptyState>
          ) : (
            <div className={tableWrap}>
              <table className="min-w-full divide-y divide-cream-200 text-left text-base">
                <thead className="sticky top-0 z-10 bg-cream-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Session</th>
                    <th className="px-4 py-3 font-medium">Attended</th>
                    <th className="px-4 py-3 font-medium">Minutes</th>
                    <th className="px-4 py-3 font-medium">Quiz</th>
                    <th className="px-4 py-3 font-medium">Trends</th>
                  </tr>
                </thead>
                <tbody className={tableBody}>
                  {participantHistory.map((row) => (
                    <tr key={`${row.participant_id}-${row.session_id}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{row.session_title}</p>
                        <p className="text-xs text-slate-500">{row.session_date}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{formatAttendanceStatus(row)}</span>
                          <TrendIndicator direction={row.trends.attendance} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{row.minutes_read ?? 0}</span>
                          <TrendIndicator direction={row.trends.minutes} />
                        </div>
                      </td>
                      <td className="px-4 py-3">{formatQuizResult(row)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Quiz</span>
                          <TrendIndicator direction={row.trends.quizPercent} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-cream-200 px-4 py-2 text-xs text-slate-500">
                Trends compare each session to the boy&apos;s previous session: ↑ improved, ↓
                declined, — unchanged.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'roster' && (
        <div className="space-y-6">
          <div className={`${sectionCard} space-y-4`}>
            <p className={`text-sm ${textSubtle}`}>
              Export every field from Edit participant (including guardian
              contact and required forms). Choose all boys or a selection.
            </p>
            <label className="block">
              <span className={labelClass}>Search</span>
              <input
                type="search"
                value={rosterSearch}
                onChange={(event) => setRosterSearch(event.target.value)}
                placeholder="Name, badge #, or guardian"
                className={inputClass}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl border border-crimson-600 bg-white px-5 py-3 text-base font-semibold text-crimson-700 hover:bg-cream-100"
                onClick={() =>
                  setRosterSelectedIds(new Set(filteredRosterRows.map((row) => row.id)))
                }
              >
                Select shown
              </button>
              <button
                type="button"
                className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl border border-crimson-600 bg-white px-5 py-3 text-base font-semibold text-crimson-700 hover:bg-cream-100"
                onClick={() =>
                  setRosterSelectedIds(
                    new Set(
                      rosterRows.filter((row) => row.active).map((row) => row.id),
                    ),
                  )
                }
              >
                Select active
              </button>
              <button
                type="button"
                className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl border border-crimson-600 bg-white px-5 py-3 text-base font-semibold text-crimson-700 hover:bg-cream-100"
                onClick={() => setRosterSelectedIds(new Set())}
              >
                Clear
              </button>
              <button
                type="button"
                disabled={loadingRoster || rosterSelectedIds.size === 0}
                onClick={() => {
                  const selected = rosterRows.filter((row) =>
                    rosterSelectedIds.has(row.id),
                  )
                  downloadRosterExportCsv(selected)
                }}
                className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl bg-crimson-600 px-5 py-3 text-base font-semibold text-white hover:bg-crimson-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Export {rosterSelectedIds.size || ''} CSV
              </button>
            </div>
            <p className={`text-sm ${textSubtle}`}>
              {loadingRoster
                ? 'Loading roster…'
                : `${rosterSelectedIds.size} selected · ${filteredRosterRows.length} shown`}
            </p>
          </div>

          {loadingRoster ? (
            <p className="text-slate-500">Loading…</p>
          ) : filteredRosterRows.length === 0 ? (
            <BrandedEmptyState>No boys match.</BrandedEmptyState>
          ) : (
            <ul className={`${sectionCard} max-h-[28rem] divide-y divide-cream-200 overflow-y-auto p-0`}>
              {filteredRosterRows.map((row) => {
                const checked = rosterSelectedIds.has(row.id)
                return (
                  <li key={row.id}>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2.5">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-cream-300 text-crimson-600"
                        checked={checked}
                        onChange={() => {
                          setRosterSelectedIds((current) => {
                            const next = new Set(current)
                            if (next.has(row.id)) next.delete(row.id)
                            else next.add(row.id)
                            return next
                          })
                        }}
                      />
                      <span className="w-14 shrink-0 font-mono text-sm font-semibold text-crimson-600">
                        {formatDisplayId(row.display_id)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                        {formatParticipantName(
                          row.first_name,
                          row.last_initial,
                          row.last_name,
                        )}
                      </span>
                      {!row.active && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                          Inactive
                        </span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
