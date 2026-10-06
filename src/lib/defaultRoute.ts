import type { Profile } from '../contexts/AuthContext'
import { isDoorHelper } from './auth'

/** Default staff landing after sign-in. */
export function defaultRouteForProfile(profile: Profile | null): string {
  if (isDoorHelper(profile)) {
    return '/check-in'
  }
  return '/'
}
