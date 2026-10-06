import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSyncStatus } from '../contexts/SyncContext'
import { matchesParticipantLookup } from '../lib/checkIn'
import {
  fetchBroadcastHistory,
  fetchParticipantPickerRows,
  resolveBroadcastRecipients,
  sendBroadcast,
  type Broadcast,
  type BroadcastAudienceType,
  type BroadcastRecipientResolution,
  type SendBroadcastResult,
} from '../lib/broadcasts'
import { formatDateTime, formatSessionLabel } from '../lib/dates'
import { formatDisplayId, formatParticipantName } from '../lib/format'
import { markdownToHtml } from '../lib/markdown'
import ReminderSettingsPanel from '../components/messages/ReminderSettingsPanel'
import { BrandedEmptyState } from '../components/brand/BrandedStates'
import {
  inputClass,
  textareaClass,
  confirmBanner,
  sectionCard,
  tableBody,
  tableWrap,
} from '../ui/classes'

export default function MessagesPage() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const { sessions } = useSyncStatus()
  const isAdmin = profile?.role === 'admin'

  const [subject, setSubject] = useState('')
  const [bodyMarkdown, setBodyMarkdown] = useState('')
  const [audienceType, setAudienceType] = useState<BroadcastAudienceType>('all')
  const [sessionId, setSessionId] = useState('')
  const [participantSearch, setParticipantSearch] = useState('')
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([])
  const [participants, setParticipants] = useState<
    Awaited<ReturnType<typeof fetchParticipantPickerRows>>
  >([])
  const [recipientPreview, setRecipientPreview] =
    useState<BroadcastRecipientResolution | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [history, setHistory] = useState<Broadcast[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<SendBroadcastResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const querySessionId = searchParams.get('session') ?? ''

  const upcomingSessions = useMemo(
    () =>
      [...sessions].sort((left, right) =>
        right.session_date.localeCompare(left.session_date),
      ),
    [sessions],
  )

  useEffect(() => {
    if (
      querySessionId &&
      upcomingSessions.some((session) => session.id === querySessionId)
    ) {
      setAudienceType('session')
      setSessionId(querySessionId)
      return
    }
    if (!sessionId && upcomingSessions[0]) {
      setSessionId(upcomingSessions[0].id)
    }
  }, [querySessionId, sessionId, upcomingSessions])

  const audience = useMemo(() => {
    if (audienceType === 'session' && sessionId) {
      return { type: 'session' as const, session_id: sessionId }
    }
    if (audienceType === 'participants') {
      return { type: 'participants' as const, participant_ids: selectedParticipantIds }
    }
    return { type: 'all' as const }
  }, [audienceType, sessionId, selectedParticipantIds])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const rows = await fetchBroadcastHistory()
      setHistory(rows)
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load broadcast history.',
      )
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return

    void loadHistory()
    void fetchParticipantPickerRows()
      .then(setParticipants)
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load participants.',
        )
      })
  }, [isAdmin, loadHistory])

  const refreshPreview = useCallback(async () => {
    if (!isAdmin) return
    if (audienceType === 'participants' && selectedParticipantIds.length === 0) {
      setRecipientPreview(null)
      return
    }

    setPreviewLoading(true)
    setError(null)

    try {
      const preview = await resolveBroadcastRecipients(audience)
      setRecipientPreview(preview)
    } catch (previewError) {
      setRecipientPreview(null)
      setError(
        previewError instanceof Error
          ? previewError.message
          : 'Failed to resolve recipients.',
      )
    } finally {
      setPreviewLoading(false)
    }
  }, [audience, audienceType, isAdmin, selectedParticipantIds.length])

  useEffect(() => {
    void refreshPreview()
  }, [refreshPreview])

  const filteredParticipants = useMemo(() => {
    const query = participantSearch.trim()
    if (!query) {
      return participants
    }

    return participants.filter((participant) =>
      matchesParticipantLookup(
        {
          ...participant,
          active: true,
          qr_token: '',
          created_at: null,
          guardian_name: '',
          authorized_pickups: [],
        },
        query,
      ),
    )
  }, [participants, participantSearch])

  const bodyPreviewHtml = useMemo(
    () => (bodyMarkdown.trim() ? markdownToHtml(bodyMarkdown) : ''),
    [bodyMarkdown],
  )

  const canSend =
    subject.trim().length > 0 &&
    bodyMarkdown.trim().length > 0 &&
    (recipientPreview?.uniqueEmailCount ?? 0) > 0 &&
    !previewLoading &&
    !sending

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipantIds((current) =>
      current.includes(participantId)
        ? current.filter((id) => id !== participantId)
        : [...current, participantId],
    )
    setSendResult(null)
  }

  if (!isAdmin) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-slate-500">
          Guardian email broadcasts are limited to admin accounts.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="mt-1 text-slate-600">
          Send guardian broadcasts and configure automated session reminders.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <ReminderSettingsPanel
        onSaved={() => void loadHistory()}
        onError={(message) => setError(message)}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={`space-y-6 ${sectionCard}`}>
          <h2 className="text-lg font-semibold text-slate-900">Compose</h2>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value)
                setSendResult(null)
              }}
              placeholder="Session reminder"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Body (Markdown)
            </span>
            <textarea
              value={bodyMarkdown}
              onChange={(event) => {
                setBodyMarkdown(event.target.value)
                setSendResult(null)
              }}
              placeholder={'## This Saturday\n\nPlease arrive by **6:30 PM**.\n\n- Bring your book\n- [Chapter website](https://example.org)'}
              className={`min-h-48 ${textareaClass}`}
            />
            <p className="mt-2 text-xs text-slate-500">
              Supports headings (<code className="text-slate-500">##</code>), bold, italic,
              links, and bullet lists.
            </p>
          </label>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-700">Audience</legend>

            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-cream-200 bg-white px-4">
              <input
                type="radio"
                name="audience"
                checked={audienceType === 'all'}
                onChange={() => {
                  setAudienceType('all')
                  setSendResult(null)
                }}
              />
              <span>All active guardians</span>
            </label>

            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-cream-200 bg-white px-4">
              <input
                type="radio"
                name="audience"
                checked={audienceType === 'session'}
                onChange={() => {
                  setAudienceType('session')
                  setSendResult(null)
                }}
              />
              <span>Guardians for a session</span>
            </label>

            {audienceType === 'session' && (
              <select
                value={sessionId}
                onChange={(event) => {
                  setSessionId(event.target.value)
                  setSendResult(null)
                }}
                className={inputClass}
              >
                {upcomingSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {formatSessionLabel(session.title, session.session_date)}
                  </option>
                ))}
              </select>
            )}

            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-cream-200 bg-white px-4">
              <input
                type="radio"
                name="audience"
                checked={audienceType === 'participants'}
                onChange={() => {
                  setAudienceType('participants')
                  setSendResult(null)
                }}
              />
              <span>Selected boys</span>
            </label>

            {audienceType === 'participants' && (
              <div className="space-y-3 rounded-xl border border-cream-200 bg-cream-50/50 p-4">
                <input
                  type="search"
                  value={participantSearch}
                  onChange={(event) => setParticipantSearch(event.target.value)}
                  placeholder="Search name or #display_id"
                  className={inputClass}
                />
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {filteredParticipants.map((participant) => {
                    const checked = selectedParticipantIds.includes(participant.id)
                    return (
                      <label
                        key={participant.id}
                        className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-cream-200 px-3 hover:bg-cream-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleParticipant(participant.id)}
                        />
                        <span>
                          {formatParticipantName(
                            participant.first_name,
                            participant.last_initial,
                            participant.last_name,
                          )}{' '}
                          <span className="font-mono text-xs text-crimson-600">
                            {formatDisplayId(participant.display_id)}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
                <p className="text-sm text-slate-500">
                  {selectedParticipantIds.length} selected
                </p>
              </div>
            )}
          </fieldset>

          <div className="rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-4">
            <p className="text-sm font-medium text-slate-700">Recipients</p>
            {previewLoading ? (
              <p className="mt-2 text-slate-500">Resolving audience…</p>
            ) : recipientPreview ? (
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">
                    {recipientPreview.uniqueEmailCount}
                  </span>{' '}
                  unique guardian email
                  {recipientPreview.uniqueEmailCount === 1 ? '' : 's'} will receive this
                  message.
                </p>
                <p className="text-slate-500">{recipientPreview.audienceLabel}</p>
                {recipientPreview.skippedNoEmailCount > 0 && (
                  <p className="text-amber-800">
                    {recipientPreview.skippedNoEmailCount} boy
                    {recipientPreview.skippedNoEmailCount === 1 ? '' : 's'} skipped (no
                    guardian email on file).
                  </p>
                )}
                {recipientPreview.duplicateEmailsMerged > 0 && (
                  <p className="text-slate-500">
                    {recipientPreview.duplicateEmailsMerged} duplicate email
                    {recipientPreview.duplicateEmailsMerged === 1 ? '' : 's'} merged.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-slate-500">No recipients resolved yet.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canSend}
              onClick={() => {
                setConfirmOpen(true)
                setSendResult(null)
              }}
              className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl bg-crimson-600 px-5 py-3 text-base font-semibold text-white hover:bg-crimson-500 active:bg-crimson-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send broadcast
            </button>
          </div>

          {confirmOpen && recipientPreview && (
            <div className={confirmBanner}>
              <p className="font-semibold text-amber-900">Send this broadcast?</p>
              <p className="mt-2 text-sm text-amber-800">
                Email {recipientPreview.uniqueEmailCount} guardian
                {recipientPreview.uniqueEmailCount === 1 ? '' : 's'} with subject "
                {subject.trim()}".
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={sending}
                  onClick={async () => {
                    setSending(true)
                    setError(null)

                    try {
                      const result = await sendBroadcast({
                        subject: subject.trim(),
                        bodyMarkdown: bodyMarkdown.trim(),
                        audience,
                      })
                      setSendResult(result)
                      setConfirmOpen(false)
                      await loadHistory()
                    } catch (sendError) {
                      setError(
                        sendError instanceof Error
                          ? sendError.message
                          : 'Failed to send broadcast.',
                      )
                    } finally {
                      setSending(false)
                    }
                  }}
                  className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl bg-crimson-600 px-5 py-3 text-base font-semibold text-white hover:bg-crimson-500 active:bg-crimson-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? 'Sending…' : 'Confirm send'}
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => setConfirmOpen(false)}
                  className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl border border-crimson-600 bg-white px-5 py-3 text-base font-semibold text-crimson-700 hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className={sectionCard}>
            <h2 className="text-lg font-semibold text-slate-900">Preview</h2>
            {bodyPreviewHtml ? (
              <div
                className="prose prose-slate mt-4 max-w-none"
                dangerouslySetInnerHTML={{ __html: bodyPreviewHtml }}
              />
            ) : (
              <p className="mt-4 text-slate-500">Body preview will appear here.</p>
            )}
          </div>

          {sendResult && (
            <div className={`space-y-4 ${sectionCard}`}>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Send results</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {sendResult.sent} sent, {sendResult.failed} failed,{' '}
                  {sendResult.skipped_no_email} skipped (no email).
                  {sendResult.duplicate_emails_merged > 0 && (
                    <>
                      {' '}
                      {sendResult.duplicate_emails_merged} duplicate
                      {sendResult.duplicate_emails_merged === 1 ? '' : 's'} merged.
                    </>
                  )}
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-cream-200">
                <table className="min-w-full divide-y divide-cream-200 text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-cream-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Guardian</th>
                      <th className="px-4 py-3 font-medium">Boys</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200 text-slate-900">
                    {sendResult.results.map((result, index) => (
                      <tr key={`${result.guardian_email ?? 'skipped'}-${index}`}>
                        <td className="px-4 py-3">
                          <p>{result.guardian_name ?? '—'}</p>
                          <p className="text-xs text-slate-500">
                            {result.guardian_email ?? 'No email'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {result.participant_names.join(', ')}
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
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Past broadcasts</h2>
        {historyLoading ? (
          <p className="text-slate-500">Loading history…</p>
        ) : history.length === 0 ? (
          <BrandedEmptyState>No broadcasts sent yet.</BrandedEmptyState>
        ) : (
          <div className={tableWrap}>
            <table className="min-w-full divide-y divide-cream-200 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-cream-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Audience</th>
                  <th className="px-4 py-3 font-medium">Recipients</th>
                </tr>
              </thead>
              <tbody className={tableBody}>
                {history.map((broadcast) => (
                  <tr key={broadcast.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {broadcast.sent_at ? formatDateTime(broadcast.sent_at) : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold">{broadcast.subject}</td>
                    <td className="px-4 py-3 text-slate-600">{broadcast.audience}</td>
                    <td className="px-4 py-3">{broadcast.recipient_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
