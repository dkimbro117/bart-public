import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { fetchStaffProfile, type StaffProfile } from '../lib/auth'
import { supabase } from '../lib/supabase'

export type Profile = StaffProfile

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const nextProfile = await fetchStaffProfile(userId)
    setProfile(nextProfile)
    if (!nextProfile) {
      await supabase.auth.signOut()
      setSession(null)
    }
    return nextProfile
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) {
      setProfile(null)
      return
    }
    await loadProfile(session.user.id)
  }, [loadProfile, session?.user.id])

  useEffect(() => {
    let mounted = true

    async function init() {
      setLoading(true)
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      setSession(data.session)
      if (data.session?.user.id) {
        await loadProfile(data.session.user.id)
      }
      if (mounted) {
        setLoading(false)
      }
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      // Tab focus refreshes the JWT without changing the signed-in user.
      if (event === 'TOKEN_REFRESHED') {
        setSession(nextSession)
        return
      }

      // init() already loads session + profile on mount.
      if (event === 'INITIAL_SESSION') {
        setSession(nextSession)
        return
      }

      if (event === 'USER_UPDATED') {
        setSession(nextSession)
        if (nextSession?.user.id) {
          await loadProfile(nextSession.user.id)
        }
        return
      }

      setLoading(true)
      setSession(nextSession)
      if (nextSession?.user.id) {
        await loadProfile(nextSession.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
