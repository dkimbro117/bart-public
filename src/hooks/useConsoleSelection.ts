import { useEffect, useState } from 'react'

export function useConsoleSelection<T>(
  items: T[],
  getId: (item: T) => string,
  enabled: boolean,
) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setSelectedId(null)
      return
    }

    if (items.length === 0) {
      setSelectedId(null)
      return
    }

    setSelectedId((current) => {
      if (current && items.some((item) => getId(item) === current)) {
        return current
      }

      return getId(items[0])
    })
  }, [enabled, items, getId])

  const selected =
    selectedId === null
      ? null
      : (items.find((item) => getId(item) === selectedId) ?? null)

  return { selectedId, selected, setSelectedId }
}
