import type { AuthenticationSource, ApplicationRole } from "@/domain/admin"

export interface SessionUser {
  id: string
  username: string
  fullName: string
  initials: string
  role: ApplicationRole
  roleLabel: string
  authenticationSource: AuthenticationSource
}

export interface SessionService {
  login(username: string, password: string): Promise<SessionUser>
  logout(): Promise<void>
  getCurrentSession(): Promise<SessionUser | null>
  subscribe(listener: (session: SessionUser | null) => void): () => void
}
