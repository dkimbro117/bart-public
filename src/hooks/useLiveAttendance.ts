import { useEffect, useRef, useState } from 'react'
import {
  fetchSessionAttendance,
  type AttendanceWithParticipant,
} from '../lib/attendance'
import { getConnectionState, subscribeSyncStatus } from '../lib/sync'
import { supabase } from '../lib/supabase'

const REALTIME_REFETCH_MS = 500

export function useLiveAttendance(sessionId: string) {
  const [rows, setRows] = useState<AttendanceWithParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingLocalData, setUsingLocalData] = useState(false)
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setRows([])
      setLoading(false)
      setError(null)
      setUsingLocalData(false)
      return
    }

    let mounted = true

    async function refresh() {
      try {
        const connection = getConnectionState()
        const nextRows = await fetchSessionAttendance(sessionId)
        if (!mounted) return
        setRows(nextRows)
        setUsingLocalData(connection !== 'online')
        setError(null)
      } catch (refreshError) {
        if (!mounted) return
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : 'Failed to load live roster.',
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
      .channel(`attendance-session-${sessionId}`)
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
      .subscribe((status) => {
        if (!mounted) return

        if (status === 'SUBSCRIBED') {
          setError((current) =>
            current?.includes('Live updates unavailable') ? null : current,
          )
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError(
            'Live updates unavailable. Run database migrations and refresh, or check your connection.',
          )
        }
      })

    return () => {
      mounted = false
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current)
      }
      unsubscribeSync()
      void supabase.removeChannel(channel)
    }
  }, [sessionId])

  return { rows, loading, error, usingLocalData }
}
