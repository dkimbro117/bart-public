import { useEffect, useRef, useState } from 'react'
import {
  fetchSessionAttendanceCounts,
  type AttendanceCounts,
} from '../lib/attendance'
import { getConnectionState, subscribeSyncStatus } from '../lib/sync'
import { supabase } from '../lib/supabase'

const REALTIME_REFETCH_MS = 500

const EMPTY_COUNTS: AttendanceCounts = { checkedIn: 0, checkedOut: 0 }

export function useAttendanceCounts(sessionId: string) {
  const [counts, setCounts] = useState<AttendanceCounts>(EMPTY_COUNTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setCounts(EMPTY_COUNTS)
      setLoading(false)
      setError(null)
      return
    }

    let mounted = true

    async function refresh() {
      try {
        const nextCounts = await fetchSessionAttendanceCounts(sessionId)
        if (!mounted) return
        setCounts(nextCounts)
        setError(null)
      } catch (refreshError) {
        if (!mounted) return
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : 'Failed to load attendance counts.',
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    function scheduleRefresh() {
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current)
      }
      refetchTimerRef.current = setTimeout(() => {
        void refresh()
      }, REALTIME_REFETCH_MS)
    }

    void refresh()

    const unsubscribeSync = subscribeSyncStatus(() => {
      scheduleRefresh()
    })

    const channel = supabase
      .channel(`attendance-counts-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          if (getConnectionState() === 'online') {
            scheduleRefresh()
          }
        },
      )
      .subscribe()

    return () => {
      mounted = false
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current)
      }
      unsubscribeSync()
      void supabase.removeChannel(channel)
    }
  }, [sessionId])

  return { counts, loading, error }
}
