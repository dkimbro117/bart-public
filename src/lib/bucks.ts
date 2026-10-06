import type { Tables } from '../types/database'
import { formatDisplayId, formatParticipantName } from './format'
import { supabase } from './supabase'

export type BucksSettings = Tables<'bucks_settings'>
export type BucksLedgerRow = Tables<'bucks_ledger'>
export type ParticipantBucksBalance = Tables<'participant_bucks_balance'>

export type BucksSettingsFormValues = {
  points_per_check_in: number
  points_per_reading_minute: number
  points_per_quiz_attempt: number
  points_quiz_perfect_bonus: number
  points_per_participation: number
}

export const BUCKS_BALANCE_LIST =
  'participant_id, display_id, first_name, last_initial, active, balance, ledger_entries' as const

export const BUCKS_LEDGER_LIST =
  'id, participant_id, session_id, amount, reason, source_kind, source_id, note, created_by, created_at' as const

const REASON_LABELS: Record<string, string> = {
  check_in: 'Check-in',
  reading: 'Reading',
  quiz: 'Quiz',
  participation: 'Participation',
  cash: 'Cash / in-person',
  adjustment: 'Adjustment',
  spend: 'Spend / redeem',
}

export function formatBucksReason(reason: string): string {
  return REASON_LABELS[reason] ?? reason
}

export function formatBucksAmount(amount: number): string {
  const sign = amount > 0 ? '+' : ''
  return `${sign}${amount}`
}

export async function fetchBucksBalances(activeOnly = true): Promise<
  ParticipantBucksBalance[]
> {
  let query = supabase
    .from('participant_bucks_balance')
    .select(BUCKS_BALANCE_LIST)
    .order('display_id', { ascending: true })

  if (activeOnly) {
    query = query.eq('active', true)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }
  return data ?? []
}

export async function fetchParticipantBucksBalance(
  participantId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('participant_bucks_balance')
    .select('balance')
    .eq('participant_id', participantId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data?.balance ?? 0
}

export async function fetchParticipantLedger(
  participantId: string,
  limit = 25,
): Promise<BucksLedgerRow[]> {
  const { data, error } = await supabase
    .from('bucks_ledger')
    .select(BUCKS_LEDGER_LIST)
    .eq('participant_id', participantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }
  return data ?? []
}

export async function fetchBucksSettings(): Promise<BucksSettings> {
  const { data, error } = await supabase
    .from('bucks_settings')
    .select(
      'id, points_per_check_in, points_per_reading_minute, points_per_quiz_attempt, points_quiz_perfect_bonus, points_per_participation, updated_at',
    )
    .eq('id', 1)
    .single()

  if (error) {
    throw new Error(error.message)
  }
  return data
}

export function settingsToFormValues(
  settings: BucksSettings,
): BucksSettingsFormValues {
  return {
    points_per_check_in: settings.points_per_check_in,
    points_per_reading_minute: settings.points_per_reading_minute,
    points_per_quiz_attempt: settings.points_per_quiz_attempt,
    points_quiz_perfect_bonus: settings.points_quiz_perfect_bonus,
    points_per_participation: settings.points_per_participation ?? 5,
  }
}

export async function saveBucksSettings(
  values: BucksSettingsFormValues,
): Promise<void> {
  const { error } = await supabase
    .from('bucks_settings')
    .update({
      points_per_check_in: values.points_per_check_in,
      points_per_reading_minute: values.points_per_reading_minute,
      points_per_quiz_attempt: values.points_per_quiz_attempt,
      points_quiz_perfect_bonus: values.points_quiz_perfect_bonus,
      points_per_participation: values.points_per_participation,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (error) {
    throw new Error(error.message)
  }
}

/** Positive = credit adjustment; negative = spend/redeem. */
export async function recordBucksAdjustment(input: {
  participantId: string
  amount: number
  note?: string
  sessionId?: string | null
  reason?: 'participation' | 'cash' | 'adjustment' | 'spend'
}): Promise<string> {
  const { data, error } = await supabase.rpc('record_bucks_adjustment', {
    p_participant_id: input.participantId,
    p_amount: input.amount,
    p_note: input.note?.trim() || undefined,
    p_session_id: input.sessionId ?? undefined,
    p_reason: input.reason ?? undefined,
  })

  if (error) {
    throw new Error(error.message)
  }
  return data
}

export function balanceLabel(row: ParticipantBucksBalance): string {
  return `${formatParticipantName(row.first_name ?? '', row.last_initial ?? '?')} (${formatDisplayId(row.display_id ?? 0)})`
}

export async function fetchPortalBucksBalance(
  qrToken: string,
): Promise<number | null> {
  const { data, error } = await supabase.rpc('participant_portal_bucks_balance', {
    p_qr_token: qrToken,
  })

  if (error) {
    // Migration may not be applied yet — treat as unavailable.
    console.warn('Bucks balance unavailable:', error.message)
    return null
  }
  return data
}
