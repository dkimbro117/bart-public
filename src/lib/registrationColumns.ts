/** Supabase select fragments — fetch only what each view needs. */

export const REGISTRATION_QUEUE_LIST =
  'id, submission_id, mapped, raw_payload, received_at, status, form_id, jotform_forms(label)' as const
