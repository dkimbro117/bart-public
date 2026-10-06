import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isDoorHelper } from '../lib/auth'
import { supabase } from '../lib/supabase'

export const DOOR_ACCESS_ENDED_KEY = 'bart_door_access_ended'

const POLL_MS = 12_000

/**
 * Door helpers only keep access while is_active_door() is true
 * (grant + night unrevoked and not expired). When staff ends the night
 * or the PIN expires, sign them out and send them back to /door.
 */
export function useDoorAccessGuard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const doorOnly = isDoorHelper(profile)

  useEffect(() => {
    if (!doorOnly) return

    let cancelled = false
    let ending = false

    async function endAccess() {
      if (cancelled || ending) return
      ending = true
      try {
        sessionStorage.setItem(DOOR_ACCESS_ENDED_KEY, '1')
        await signOut()
        navigate('/door', { replace: true })
      } catch {
        ending = false
      }
    }

    async function check() {
      if (cancelled || document.visibilityState === 'hidden') return

      const { data, error } = await supabase.rpc('is_active_door')
      if (cancelled) return

      if (error || data !== true) {
        await endAccess()
      }
    }

    void check()
    const intervalId = window.setInterval(() => {
      void check()
    }, POLL_MS)

    function onVisible() {
      if (document.visibilityState === 'visible') {
        void check()
      }
    }

    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [doorOnly, navigate, signOut])
}
