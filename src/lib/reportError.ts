export function reportError(error: unknown, context?: string): void {
  const message = error instanceof Error ? error.message : String(error)
  const payload = {
    message,
    context,
    at: new Date().toISOString(),
  }

  if (import.meta.env.DEV) {
    console.error('[bart]', payload, error)
  }

  const endpoint = import.meta.env.VITE_ERROR_REPORT_URL
  if (typeof endpoint === 'string' && endpoint.length > 0) {
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Monitoring must never break the door flow.
    })
  }
}
