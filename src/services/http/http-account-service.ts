import { apiClient } from "@/lib/http"
import { clearStoredAvatar, readStoredAvatar, writeStoredAvatar } from "@/services/account-avatar-store"
import type { AccountService, ChangePasswordInput } from "@/services/account-service"

/**
 * Password change goes to the backend; the authenticated session is the actor, so the
 * frontend-supplied `userId` is intentionally never sent. Avatars remain a client-side
 * `localStorage` preference (see {@link readStoredAvatar}).
 */
export class HttpAccountService implements AccountService {
  async getAvatar(userId: string): Promise<string | undefined> {
    return readStoredAvatar(userId)
  }

  async changePassword({ currentPassword, newPassword }: ChangePasswordInput): Promise<void> {
    await apiClient.post<void>("/account/change-password", { currentPassword, newPassword })
  }

  async updateAvatar(userId: string, avatar: string): Promise<void> {
    writeStoredAvatar(userId, avatar)
  }

  async removeAvatar(userId: string): Promise<void> {
    clearStoredAvatar(userId)
  }
}
