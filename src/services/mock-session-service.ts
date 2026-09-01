import type { SessionService } from "@/services/session-service"
import type { SessionUser } from "@/services/session-service"
import { applicationRoles, authenticationSources } from "@/domain/admin"
import { MockAuthenticationStore } from "@/services/mock-authentication-store"

const sessionStorageKey = "visitor-management:session"

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function getSessionStorage(): StorageLike | undefined {
  if (typeof window === "undefined") return undefined
  try { return window.sessionStorage } catch { return undefined }
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") return false
  const session = value as Partial<SessionUser>
  return typeof session.id === "string"
    && typeof session.username === "string"
    && typeof session.fullName === "string"
    && typeof session.initials === "string"
    && typeof session.roleLabel === "string"
    && (applicationRoles as readonly string[]).includes(session.role ?? "")
    && (authenticationSources as readonly string[]).includes(session.authenticationSource ?? "")
}

/**
 * Mock adapter for browser-session authentication. A future API-backed implementation retains
 * this contract while handling tokens and server-side credential checks.
 */
export class MockSessionService implements SessionService {
  private readonly listeners = new Set<(session: SessionUser | null) => void>()

  constructor(private readonly authStore = new MockAuthenticationStore(), private readonly storage = getSessionStorage()) {}

  async login(username: string, password: string) {
    const user = this.authStore.authenticate(username, password)
    if (!user) throw new Error("Kullanıcı adı veya şifre hatalı.")
    this.storage?.setItem(sessionStorageKey, JSON.stringify(user))
    this.notify(user)
    return user
  }

  async logout() {
    this.storage?.removeItem(sessionStorageKey)
    this.notify(null)
  }

  async getCurrentSession() {
    const serialized = this.storage?.getItem(sessionStorageKey)
    if (!serialized) return null
    try {
      const parsed: unknown = JSON.parse(serialized)
      if (isSessionUser(parsed)) return parsed
      this.storage?.removeItem(sessionStorageKey)
      return null
    } catch {
      this.storage?.removeItem(sessionStorageKey)
      return null
    }
  }

  subscribe(listener: (session: SessionUser | null) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(session: SessionUser | null) {
    this.listeners.forEach((listener) => listener(session))
  }
}
