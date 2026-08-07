import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import type { RescheduleVisitInput, Visit, VisitInput, VisitReferenceData } from "@/domain/visits"
import type { VisitService } from "@/services"

interface VisitContextValue {
  visits: Visit[]
  referenceData: VisitReferenceData | null
  isLoading: boolean
  error: string | null
  createVisit(input: VisitInput): Promise<Visit>
  updateVisit(id: string, input: VisitInput): Promise<Visit>
  rescheduleVisit(id: string, input: RescheduleVisitInput): Promise<Visit>
  cancelVisit(id: string): Promise<Visit>
}

const VisitContext = createContext<VisitContextValue | null>(null)

export function VisitProvider({ service, children }: { service: VisitService; children: React.ReactNode }) {
  const [visits, setVisits] = useState<Visit[]>([])
  const [referenceData, setReferenceData] = useState<VisitReferenceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [nextVisits, nextReferenceData] = await Promise.all([
        service.listVisits(),
        service.getReferenceData(),
      ])
      setVisits(nextVisits)
      setReferenceData(nextReferenceData)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Ziyaretler yüklenemedi.")
    } finally {
      setIsLoading(false)
    }
  }, [service])

  useEffect(() => {
    void load()
  }, [load])

  const refreshVisits = useCallback(async () => setVisits(await service.listVisits()), [service])

  const createVisit = useCallback(
    async (input: VisitInput) => {
      const created = await service.createVisit(input)
      await refreshVisits()
      return created
    },
    [refreshVisits, service],
  )

  const updateVisit = useCallback(
    async (id: string, input: VisitInput) => {
      const updated = await service.updateVisit(id, input)
      await refreshVisits()
      return updated
    },
    [refreshVisits, service],
  )

  const rescheduleVisit = useCallback(
    async (id: string, input: RescheduleVisitInput) => {
      const updated = await service.rescheduleVisit(id, input)
      await refreshVisits()
      return updated
    },
    [refreshVisits, service],
  )

  const cancelVisit = useCallback(
    async (id: string) => {
      const updated = await service.cancelVisit(id)
      await refreshVisits()
      return updated
    },
    [refreshVisits, service],
  )

  const value = useMemo(
    () => ({
      visits,
      referenceData,
      isLoading,
      error,
      createVisit,
      updateVisit,
      rescheduleVisit,
      cancelVisit,
    }),
    [visits, referenceData, isLoading, error, createVisit, updateVisit, rescheduleVisit, cancelVisit],
  )

  return <VisitContext.Provider value={value}>{children}</VisitContext.Provider>
}

// The hook intentionally shares this module with its provider so the context remains private.
// eslint-disable-next-line react-refresh/only-export-components
export function useVisits() {
  const context = useContext(VisitContext)
  if (!context) throw new Error("useVisits, VisitProvider içinde kullanılmalıdır.")
  return context
}
