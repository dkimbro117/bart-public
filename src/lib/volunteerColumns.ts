/** Supabase select fragments — fetch only what each view needs. */

export const VOLUNTEER_ROSTER_LIST =
  'id, display_id, full_name, email, phone, active' as const

export const VOLUNTEER_SCAN =
  'id, display_id, full_name, qr_token, active' as const

export const VOLUNTEER_DETAIL =
  'id, display_id, full_name, email, phone, qr_token, active, created_at' as const

export const VOLUNTEER_LANYARD =
  'id, display_id, full_name, qr_token, active' as const

export const VOLUNTEER_LIVE =
  'id, display_id, full_name, active' as const
