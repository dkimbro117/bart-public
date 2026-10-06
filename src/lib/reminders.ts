import {
  renderReminderTemplate,
  SAMPLE_REMINDER_CONTEXT,
} from './reminderTemplates'
import { supabase } from './supabase'
import type { Tables, TablesUpdate } from '../types/database'

export type ReminderSettings = Tables<'reminder_settings'>

export type ReminderSettingsFormValues = {
  enabled: boolean
  days_before: number
  subject_template: string
  body_template: string
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettingsFormValues = {
  enabled: false,
  days_before: 2,
  subject_template: 'Reminder: {{session_title}} on {{session_date}}',
  body_template: `## Reading session coming up

Hi {{guardian_name}},

**{{session_title}}** is on **{{session_date}}**. Please ensure your son brings his book!`,
}

export function reminderSettingsToFormValues(
  settings: ReminderSettings,
): ReminderSettingsFormValues {
  return {
    enabled: settings.enabled,
    days_before: settings.days_before,
    subject_template: settings.subject_template,
    body_template: settings.body_template,
  }
}

export async function fetchReminderSettings(): Promise<ReminderSettings | null> {
  const { data, error } = await supabase
    .from('reminder_settings')
    .select('id, enabled, days_before, subject_template, body_template, updated_at')
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function saveReminderSettings(
  id: string,
  values: ReminderSettingsFormValues,
): Promise<ReminderSettings> {
  const update: TablesUpdate<'reminder_settings'> = {
    enabled: values.enabled,
    days_before: values.days_before,
    subject_template: values.subject_template.trim(),
    body_template: values.body_template.trim(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('reminder_settings')
    .update(update)
    .eq('id', id)
    .select('id, enabled, days_before, subject_template, body_template, updated_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function createReminderSettings(
  values: ReminderSettingsFormValues,
): Promise<ReminderSettings> {
  const { data, error } = await supabase
    .from('reminder_settings')
    .insert({
      enabled: values.enabled,
      days_before: values.days_before,
      subject_template: values.subject_template.trim(),
      body_template: values.body_template.trim(),
    })
    .select('id, enabled, days_before, subject_template, body_template, updated_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export function previewReminderSubject(template: string): string {
  return renderReminderTemplate(template, SAMPLE_REMINDER_CONTEXT)
}

export function previewReminderBody(template: string): string {
  return renderReminderTemplate(template, SAMPLE_REMINDER_CONTEXT)
}

export type SendSessionRemindersResult = {
  enabled: boolean
  days_before: number
  target_session_date: string
  sessions_matched: number
  results: Array<{
    session_id: string
    session_title: string
    session_date: string
    status: string
    broadcast_id?: string
    sent?: number
    failed?: number
    skipped_no_email?: number
  }>
}

export async function triggerSessionReminders(): Promise<SendSessionRemindersResult> {
  const { data, error } = await supabase.functions.invoke('send-session-reminders', {
    body: {},
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const message =
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'Failed to run session reminders.'
    throw new Error(message)
  }

  return data as SendSessionRemindersResult
}
