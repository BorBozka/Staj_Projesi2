export interface ChangePasswordInput {
  userId: string
  currentPassword: string
  newPassword: string
}

export interface AccountService {
  getAvatar(userId: string): Promise<string | undefined>
  changePassword(input: ChangePasswordInput): Promise<void>
  updateAvatar(userId: string, avatar: string): Promise<void>
  removeAvatar(userId: string): Promise<void>
}
