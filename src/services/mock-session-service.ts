import type { SessionService } from "@/services/session-service"

/**
 * Authentication UI will replace this with session clearing and a /login redirect.
 * Keeping the action behind this adapter lets the shared account UI stay unchanged.
 */
export class MockSessionService implements SessionService {
  async logout() {}
}
