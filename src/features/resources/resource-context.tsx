import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import type { FacilityResource, ResourceInput } from "@/domain/resources"
import type { ResourceCatalogService } from "@/services"

interface ResourceContextValue {
  resources: FacilityResource[]
  isLoading: boolean
  error: string | null
  reload(): Promise<void>
  createResource(input: ResourceInput): Promise<FacilityResource>
  updateResource(id: string, input: ResourceInput): Promise<FacilityResource>
  setResourceActive(id: string, isActive: boolean): Promise<FacilityResource>
}

const ResourceContext = createContext<ResourceContextValue | null>(null)

export function ResourceProvider({ service, children }: { service: ResourceCatalogService; children: React.ReactNode }) {
  const [resources, setResources] = useState<FacilityResource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setResources(await service.listResources())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Kaynaklar yüklenemedi.")
    } finally {
      setIsLoading(false)
    }
  }, [service])

  useEffect(() => {
    void load()
  }, [load])

  const refreshResources = useCallback(async () => {
    setResources(await service.listResources())
  }, [service])

  const createResource = useCallback(async (input: ResourceInput) => {
    const created = await service.createResource(input)
    await refreshResources()
    return created
  }, [refreshResources, service])

  const updateResource = useCallback(async (id: string, input: ResourceInput) => {
    const updated = await service.updateResource(id, input)
    await refreshResources()
    return updated
  }, [refreshResources, service])

  const setResourceActive = useCallback(async (id: string, isActive: boolean) => {
    const updated = await service.setResourceActive(id, isActive)
    await refreshResources()
    return updated
  }, [refreshResources, service])

  const value = useMemo(() => ({
    resources,
    isLoading,
    error,
    reload: load,
    createResource,
    updateResource,
    setResourceActive,
  }), [resources, isLoading, error, load, createResource, updateResource, setResourceActive])

  return <ResourceContext.Provider value={value}>{children}</ResourceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useResources() {
  const context = useContext(ResourceContext)
  if (!context) throw new Error("useResources, ResourceProvider içinde kullanılmalıdır.")
  return context
}
