import { describe, expect, it } from "vitest"

import { validatePasswordChange } from "@/features/account/account-utils"

describe("validatePasswordChange", () => {
  it("requires all fields and enforces the Local password contract", () => {
    expect(validatePasswordChange("", "password1", "password1")).toBe("Tüm parola alanları zorunludur.")
    expect(validatePasswordChange("current1", "short", "short")).toBe("Yeni şifre en az 8 karakter olmalıdır.")
    expect(validatePasswordChange("samepass", "samepass", "samepass")).toBe("Yeni şifre mevcut şifreyle aynı olamaz.")
    expect(validatePasswordChange("current1", "password1", "otherpass")).toBe("Yeni şifre tekrar alanıyla eşleşmelidir.")
    expect(validatePasswordChange("current1", "password1", "password1")).toBeUndefined()
  })
})
