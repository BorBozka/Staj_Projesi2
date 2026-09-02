import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Fetches one canonical report dataset from the `/api/reports/*` boundary with proper
 * loading / error / retry state and a stale-response guard: a tab or filter change that
 * triggers a new fetch discards any in-flight earlier response so it cannot overwrite the
 * newer state. The per-period (current vs. comparison) filtering stays in the report utils.
 */
export function useReportsDataset<T>(fetcher: () => Promise<T[]>): {
  data: T[]
  isLoading: boolean
  error: string | null
  retry: () => void
} {
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const requestId = useRef(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    const id = ++requestId.current
    setIsLoading(true)
    setError(null)
    void fetcherRef.current()
      .then((next) => {
        if (id !== requestId.current) return
        setData(next)
        setIsLoading(false)
      })
      .catch((cause: unknown) => {
        if (id !== requestId.current) return
        setError(cause instanceof Error ? cause.message : "Rapor verisi alınamadı.")
        setIsLoading(false)
      })
  }, [nonce])

  const retry = useCallback(() => setNonce((value) => value + 1), [])
  return { data, isLoading, error, retry }
}
