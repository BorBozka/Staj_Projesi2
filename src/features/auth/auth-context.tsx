import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import type { SessionService, SessionUser } from "@/services/session-service"

interface AuthContextValue {
  currentUser: SessionUser | null
  authenticated: boolean
  initializing: boolean
  loading: boolean
  login(username: string, password: string): Promise<SessionUser>
  logout(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ service, children }: { service: SessionService; children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    void service.getCurrentSession().then((session) => {
      if (active) {
        setCurrentUser(session)
        setInitializing(false)
      }
    })
    return service.subscribe((session) => {
      if (active) {
        setCurrentUser(session)
        setInitializing(false)
      }
    })
  }, [service])

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true)
    try {
      const session = await service.login(username, password)
      setCurrentUser(session)
      return session
    } finally {
      setLoading(false)
    }
  }, [service])

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await service.logout()
      setCurrentUser(null)
    } finally {
      setLoading(false)
    }
  }, [service])

  const value = useMemo(() => ({ currentUser, authenticated: currentUser !== null, initializing, loading, login, logout }), [currentUser, initializing, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth, AuthProvider içinde kullanılmalıdır.")
  return context
}
