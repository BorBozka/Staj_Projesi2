import type { AccountService, ChangePasswordInput } from "@/services/account-service"

const avatarStoragePrefix = "visitor-management:account-avatar:"
const avatarChangedEvent = "visitor-management:account-avatar-changed"

function getStorage() {
  if (typeof window === "undefined") return undefined
  try { return window.localStorage } catch { return undefined }
}

function avatarStorageKey(userId: string) {
  return `${avatarStoragePrefix}${userId}`
}

function announceAvatarChange(userId: string) {
  if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") window.dispatchEvent(new CustomEvent(avatarChangedEvent, { detail: { userId } }))
}

/** Mock-only account adapter. The production adapter will call authenticated account endpoints. */
export class MockAccountService implements AccountService {
  async getAvatar(userId: string) {
    return getStorage()?.getItem(avatarStorageKey(userId)) ?? undefined
  }

  async changePassword({ currentPassword, newPassword }: ChangePasswordInput) {
    // Credential verification deliberately belongs to the future authentication backend.
    if (!currentPassword.trim() || !newPassword.trim()) throw new Error("Parola alanları boş olamaz.")
  }

  async updateAvatar(userId: string, avatar: string) {
    if (!avatar.startsWith("data:image/")) throw new Error("Geçerli bir görsel kaydedilemedi.")
    getStorage()?.setItem(avatarStorageKey(userId), avatar)
    announceAvatarChange(userId)
  }

  async removeAvatar(userId: string) {
    getStorage()?.removeItem(avatarStorageKey(userId))
    announceAvatarChange(userId)
  }
}

export { avatarChangedEvent }
