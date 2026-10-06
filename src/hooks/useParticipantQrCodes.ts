import { useEffect, useState } from 'react'
import type { Participant } from '../lib/participants'
import { generateQrDataUrl } from '../lib/qr'

const QR_BATCH_SIZE = 6

function scheduleIdleTask(task: () => void | Promise<void>): Promise<void> {
  return new Promise((resolve) => {
    const run = () => {
      void Promise.resolve(task()).finally(resolve)
    }

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => run())
    } else {
      window.setTimeout(run, 0)
    }
  })
}

export function useParticipantQrCodes(participants: Participant[]) {
  const [qrByParticipantId, setQrByParticipantId] = useState<
    Record<string, string>
  >({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (participants.length === 0) {
      setQrByParticipantId({})
      setLoading(false)
      setError(null)
      return
    }

    let mounted = true

    async function buildQrCodes() {
      setLoading(true)
      setError(null)
      setQrByParticipantId({})

      try {
        const accumulated: Record<string, string> = {}

        for (let index = 0; index < participants.length; index += QR_BATCH_SIZE) {
          if (!mounted) return

          const batch = participants.slice(index, index + QR_BATCH_SIZE)

          await scheduleIdleTask(async () => {
            const entries = await Promise.all(
              batch.map(async (participant) => {
                const dataUrl = await generateQrDataUrl(participant.qr_token)
                return [participant.id, dataUrl] as const
              }),
            )

            for (const [id, dataUrl] of entries) {
              accumulated[id] = dataUrl
            }
          })

          if (!mounted) return

          setQrByParticipantId({ ...accumulated })
        }
      } catch (qrError) {
        if (!mounted) return

        const message =
          qrError instanceof Error
            ? qrError.message
            : 'Failed to generate QR codes.'
        setError(message)
        setQrByParticipantId({})
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void buildQrCodes()

    return () => {
      mounted = false
    }
  }, [participants])

  return { qrByParticipantId, loading, error }
}
