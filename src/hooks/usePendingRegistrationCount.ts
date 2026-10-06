import { useCallback, useEffect, useState } from 'react'
import {
  fetchPendingRegistrationCount,
  REGISTRATIONS_CHANGED_EVENT,
} from '../lib/registrations'

export function usePendingRegistrationCount() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const nextCount = await fetchPendingRegistrationCount()
      setCount(nextCount)
    } catch {
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()

    const handleChange = () => {
      void refresh()
    }

    window.addEventListener(REGISTRATIONS_CHANGED_EVENT, handleChange)
    return () => {
      window.removeEventListener(REGISTRATIONS_CHANGED_EVENT, handleChange)
    }
  }, [refresh])

  return { count, loading, refresh }
}
