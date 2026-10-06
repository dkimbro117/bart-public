import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { stashAuthCodeFromUrl, urlHasAuthCallbackParams } from '../lib/completeAuthFromUrl'

/** Send magic-link landings on `/` (or any path) to `/auth/callback` before tokens are lost. */
export default function AuthLinkRedirect() {
  const location = useLocation()
  const navigate = useNavigate()
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (location.pathname === '/auth/callback') {
      stashAuthCodeFromUrl()
      return
    }

    if (!urlHasAuthCallbackParams()) {
      return
    }

    stashAuthCodeFromUrl()

    if (redirectedRef.current) {
      return
    }
    redirectedRef.current = true

    navigate(`/auth/callback${location.search}${location.hash}`, { replace: true })
  }, [location.pathname, location.search, location.hash, navigate])

  return null
}
