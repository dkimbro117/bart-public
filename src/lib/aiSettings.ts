import type { Tables, TablesUpdate } from '../types/database'
import { supabase } from './supabase'
import { AI_SETTINGS_ROW_ID } from './aiSettingsConstants'

export type AiSettings = Tables<'ai_settings'>

export type AiSettingsFormValues = {
  intake_cleanup: boolean
  quiz_drafting: boolean
  report_phrasing: boolean
  nl_query: boolean
}

export function aiSettingsToFormValues(settings: AiSettings): AiSettingsFormValues {
  return {
    intake_cleanup: settings.intake_cleanup,
    quiz_drafting: settings.quiz_drafting,
    report_phrasing: settings.report_phrasing,
    nl_query: settings.nl_query,
  }
}

export async function fetchAiSettings(): Promise<AiSettings> {
  const { data, error } = await supabase
    .from('ai_settings')
    .select('id, intake_cleanup, quiz_drafting, report_phrasing, nl_query, updated_at')
    .eq('id', AI_SETTINGS_ROW_ID)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function saveAiSettings(
  values: AiSettingsFormValues,
): Promise<AiSettings> {
  const update: TablesUpdate<'ai_settings'> = {
    intake_cleanup: values.intake_cleanup,
    quiz_drafting: values.quiz_drafting,
    report_phrasing: values.report_phrasing,
    nl_query: values.nl_query,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('ai_settings')
    .update(update)
    .eq('id', AI_SETTINGS_ROW_ID)
    .select('id, intake_cleanup, quiz_drafting, report_phrasing, nl_query, updated_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
