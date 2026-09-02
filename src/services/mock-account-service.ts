import { avatarChangedEvent, clearStoredAvatar, readStoredAvatar, writeStoredAvatar } from "@/services/account-avatar-store"
import type { AccountService, ChangePasswordInput } from "@/services/account-service"
import { MockAuthenticationStore } from "@/services/mock-authentication-store"

/** Mock-only account adapter (test/dev fixture). Avatars share the same client-side store. */
export class MockAccountService implements AccountService {
  constructor(private readonly authStore = new MockAuthenticationStore()) {}
  async getAvatar(userId: string) {
    return readStoredAvatar(userId)
  }

  async changePassword({ userId, currentPassword, newPassword }: ChangePasswordInput) {
    if (!currentPassword.trim() || !newPassword.trim()) throw new Error("Parola alanları boş olamaz.")
    this.authStore.changePassword(userId, currentPassword, newPassword)
  }

  async updateAvatar(userId: string, avatar: string) {
    writeStoredAvatar(userId, avatar)
  }

  async removeAvatar(userId: string) {
    clearStoredAvatar(userId)
  }
}

export { avatarChangedEvent }
