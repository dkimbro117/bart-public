import type { Tables } from '../types/database'
import { supabase } from './supabase'

export type StaffProfile = Pick<
  Tables<'profiles'>,
  'id' | 'full_name' | 'role' | 'password_set_at'
>

export function isStaffAdmin(
  profile: StaffProfile | null | undefined,
): profile is StaffProfile & { role: 'admin' } {
  return profile?.role === 'admin'
}

export function isDoorHelper(
  profile: StaffProfile | null | undefined,
): boolean {
  return profile?.role === 'door'
}

export function isChapterStaff(
  profile: StaffProfile | null | undefined,
): boolean {
  return profile?.role === 'admin' || profile?.role === 'volunteer'
}

const PROFILE_SELECT = 'id, full_name, role, password_set_at'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/** Load staff profile; retries while handle_new_user trigger may still be running. */
export async function fetchStaffProfile(
  userId: string,
  maxAttempts = 5,
): Promise<StaffProfile | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle()

    if (data) {
      return data
    }

    if (error) {
      const missingColumn =
        error.message.includes('password_set_at') ||
        error.code === '42703' ||
        error.code === 'PGRST204'

      if (missingColumn) {
        const { data: fallback, error: fallbackError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', userId)
          .maybeSingle()

        if (fallback) {
          return { ...fallback, password_set_at: null }
        }

        if (fallbackError && attempt === maxAttempts - 1) {
          return null
        }
      } else if (attempt === maxAttempts - 1) {
        return null
      }
    }

    if (attempt < maxAttempts - 1) {
      await sleep(400 * (attempt + 1))
    }
  }

  return null
}

export async function markPasswordSet(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ password_set_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    const missingColumn =
      error.message.includes('password_set_at') ||
      error.code === '42703' ||
      error.code === 'PGRST204'

    if (missingColumn) {
      throw new Error(
        'Password column not ready — run `supabase db push` to apply the latest migration, then try again.',
      )
    }

    throw new Error(error.message)
  }
}
