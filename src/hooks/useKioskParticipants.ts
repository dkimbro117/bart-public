import { useEffect, useState } from 'react'
import { loadCachedParticipantsForManualSearch } from '../lib/checkIn'
import type { Participant } from '../lib/participants'
import { isOnline } from '../lib/sync'
import { supabase } from '../lib/supabase'

export function useKioskParticipants(enabled: boolean) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    let mounted = true

    async function loadParticipants() {
      setLoading(true)
      setError(null)

      try {
        if (isOnline()) {
          const { data, error: queryError } = await supabase
            .from('participants')
            .select('id, display_id, first_name, last_initial, qr_token, active')
            .eq('active', true)
            .order('display_id', { ascending: true })

          if (!mounted) return

          if (queryError) {
            setError(queryError.message)
            setParticipants([])
          } else {
            setParticipants(
              (data ?? []).map((row) => ({
                ...row,
                guardian_name: '',
                authorized_pickups: [],
                created_at: null,
              })),
            )
          }
        } else {
          const cached = await loadCachedParticipantsForManualSearch()
          if (!mounted) return
          setParticipants(cached)
        }
      } catch (loadError) {
        if (!mounted) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load participants.',
        )
        setParticipants([])
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadParticipants()

    return () => {
      mounted = false
    }
  }, [enabled])

  return { participants, loading, error }
}
