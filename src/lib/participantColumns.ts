/** Supabase select fragments — fetch only what each view needs (M-3). */

export const PARTICIPANT_SCAN =
  'id, display_id, first_name, last_initial, last_name, qr_token, active' as const

export const PARTICIPANT_ROSTER_LIST =
  'id, display_id, first_name, last_initial, last_name, active' as const

export const PARTICIPANT_ROSTER_LIVE =
  'id, display_id, first_name, last_initial, last_name, active' as const

/** Badge print may show full surname; /go and kiosk stay initials-only. */
export const PARTICIPANT_LANYARD =
  'id, display_id, first_name, last_initial, last_name, qr_token, active' as const

export const PARTICIPANT_CHECKOUT =
  'id, display_id, first_name, last_initial, last_name, guardian_name, authorized_pickups, qr_token, active' as const

/** Full staff edit view. Never add last_name to participant_portal_* RPCs. */
export const PARTICIPANT_DETAIL =
  'id, display_id, first_name, last_initial, last_name, grade, school, shirt_size, age, enrollment_status, how_heard, registration_date, cy_ref, guardian_name, authorized_pickups, parental_guardian_affirmation, media_release, youth_code_of_conduct, youth_pickup_authorization, transportation_permission, off_site_permission, medical_emergency_form, virtual_meeting_performance_agreement, qr_token, active, created_at' as const

/** Roster export / bulk forms — edit-participant fields staff track in-app. */
export const PARTICIPANT_ROSTER_EXPORT =
  'id, display_id, first_name, last_initial, last_name, grade, school, shirt_size, age, enrollment_status, how_heard, registration_date, cy_ref, guardian_name, authorized_pickups, parental_guardian_affirmation, media_release, youth_code_of_conduct, youth_pickup_authorization, transportation_permission, off_site_permission, medical_emergency_form, virtual_meeting_performance_agreement, active, created_at' as const

export const GUARDIAN_CONTACT =
  'participant_id, guardian_email, guardian_phone' as const
