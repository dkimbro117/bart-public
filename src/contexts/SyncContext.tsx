import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CachedSession } from '../lib/db'
import {
  type ConnectionState,
  clearPickupCache,
  flushOutbox,
  getConnectionState,
  getLastFlushError,
  getOutboxNotice,
  getPendingCount,
  hasCachedRoster,
  loadSessions,
  pingServer,
  primeCache,
  primeTodaySession,
  startSyncEngine,
  subscribeSyncStatus,
} from '../lib/sync'
import { useAuth } from './AuthContext'

type SyncContextValue = {
  connectionState: ConnectionState
  /** @deprecated Use connectionState === 'online' */
  online: boolean
  pendingCount: number
  rosterCached: boolean
  rosterCacheChecking: boolean
  sessions: CachedSession[]
  selectedSessionId: string
  setSelectedSessionId: (sessionId: string) => Promise<void>
  refreshSessions: () => Promise<void>
  syncNow: () => Promise<void>
  refreshRoster: () => Promise<void>
  initializing: boolean
  syncError: string | null
}

const SyncContext = createContext<SyncContextValue | null>(null)

const PING_INTERVAL_MS = 30_000
const LAST_USER_KEY = 'bart_last_user_id'

export function SyncProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [connectionState, setConnectionState] =
    useState<ConnectionState>(getConnectionState())
  const [pendingCount, setPendingCount] = useState(0)
  const [rosterCached, setRosterCached] = useState(false)
  const [rosterCacheChecking, setRosterCacheChecking] = useState(true)
  const [sessions, setSessions] = useState<CachedSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [initializing, setInitializing] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    setConnectionState(getConnectionState())
    setPendingCount(await getPendingCount())
    setRosterCached(await hasCachedRoster())
    setRosterCacheChecking(false)

    const flushError = getLastFlushError()
    const notice = await getOutboxNotice()
    if (flushError) {
      setSyncError(flushError)
    } else if (notice.message) {
      setSyncError(notice.message)
    }
  }, [])

  useEffect(() => {
    return startSyncEngine()
  }, [])

  useEffect(() => {
    return subscribeSyncStatus(() => {
      void refreshStatus()
    })
  }, [refreshStatus])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void pingServer().then(() => refreshStatus())
    }, PING_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [refreshStatus])

  const userId = session?.user.id

  useEffect(() => {
    if (!userId) {
      setSessions([])
      setSelectedSessionId('')
      setInitializing(false)
      setRosterCached(false)
      setRosterCacheChecking(false)
      return
    }

    const activeUserId = userId
    let mounted = true

    async function initialize() {
      setInitializing(true)
      setSyncError(null)

      const lastUserId = sessionStorage.getItem(LAST_USER_KEY)
      if (lastUserId && lastUserId !== activeUserId) {
        await clearPickupCache()
      }
      sessionStorage.setItem(LAST_USER_KEY, activeUserId)

      try {
        const sessionId = await primeTodaySession()
        if (!mounted) return

        const nextSessions = await loadSessions()
        if (!mounted) return

        const resolvedSessionId = sessionId ?? nextSessions[0]?.id ?? ''
        setSessions(nextSessions)
        setSelectedSessionId(resolvedSessionId)
        setPendingCount(await getPendingCount())
        setConnectionState(getConnectionState())

        let cached = await hasCachedRoster()
        if (
          !cached &&
          resolvedSessionId &&
          getConnectionState() !== 'offline'
        ) {
          await primeCache(resolvedSessionId)
          cached = await hasCachedRoster()
        }
        setRosterCached(cached)
      } catch (error) {
        if (!mounted) return
        setSyncError(
          error instanceof Error
            ? error.message
            : 'Failed to initialize offline cache.',
        )
      } finally {
        if (mounted) {
          setInitializing(false)
          setRosterCacheChecking(false)
        }
      }
    }

    void initialize()

    return () => {
      mounted = false
    }
  }, [userId])

  const setSelectedSessionIdAndPrime = useCallback(
    async (sessionId: string) => {
      setSelectedSessionId(sessionId)
      if (getConnectionState() === 'offline' || !sessionId) {
        return
      }

      setSyncError(null)
      try {
        await clearPickupCache()
        await primeCache(sessionId)
        setRosterCached(await hasCachedRoster())
      } catch (error) {
        setSyncError(
          error instanceof Error
            ? error.message
            : 'Failed to refresh session cache.',
        )
      }
    },
    [],
  )

  const refreshSessions = useCallback(async () => {
    try {
      const nextSessions = await loadSessions()
      setSessions(nextSessions)
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : 'Failed to refresh sessions.',
      )
    }
  }, [])

  const syncNow = useCallback(async () => {
    setSyncError(null)
    const result = await flushOutbox()
    setPendingCount(result.remaining)
    setConnectionState(getConnectionState())
    if (result.error) {
      setSyncError(result.error)
    }
  }, [])

  const refreshRoster = useCallback(async () => {
    if (!selectedSessionId) {
      return
    }

    if (getConnectionState() === 'offline') {
      setSyncError('Go online to refresh roster data from Supabase.')
      return
    }

    setSyncError(null)
    try {
      const reachable = await pingServer()
      if (!reachable) {
        setSyncError('Server unreachable. Check Wi‑Fi and try again.')
        setConnectionState(getConnectionState())
        return
      }

      await clearPickupCache()
      await primeCache(selectedSessionId)
      const nextSessions = await loadSessions()
      setSessions(nextSessions)
      setConnectionState(getConnectionState())
      setRosterCached(await hasCachedRoster())
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'Failed to refresh roster.',
      )
    }
  }, [selectedSessionId])

  const value = useMemo(
    () => ({
      connectionState,
      online: connectionState === 'online',
      pendingCount,
      rosterCached,
      rosterCacheChecking,
      sessions,
      selectedSessionId,
      setSelectedSessionId: setSelectedSessionIdAndPrime,
      refreshSessions,
      syncNow,
      refreshRoster,
      initializing,
      syncError,
    }),
    [
      connectionState,
      pendingCount,
      rosterCached,
      rosterCacheChecking,
      sessions,
      selectedSessionId,
      setSelectedSessionIdAndPrime,
      refreshSessions,
      syncNow,
      refreshRoster,
      initializing,
      syncError,
    ],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSyncStatus() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSyncStatus must be used within SyncProvider')
  }
  return context
}
