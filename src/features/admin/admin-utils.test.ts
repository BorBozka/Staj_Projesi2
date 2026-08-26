import { describe, expect, it } from "vitest"

import type { AdminUser } from "@/domain/admin"
import {
  canTransitionVisitorCard,
  clearAdminUsersSearchParams,
  defaultAdminUserFilters,
  doPasswordsMatch,
  filterAndSortAdminUsers,
  getAdminUserCompanyDisplay,
  hasActiveAdminUserFilters,
  isAdminUserFormDirty,
  isOperationalSettingsValid,
  isTemporaryPasswordValid,
  paginateAdminUsers,
  parseAdminUsersQuery,
  scopeAdminUsers,
  searchAdminUsers,
  setAdminUsersPage,
  setAdminUsersSort,
  shouldConfirmAdminRoleChange,
  shouldConfirmAnotherAdminDeactivation,
  shouldConfirmAnotherAdminDemotion,
  toggleAdminUserSort,
  updateAdminUsersSearchParams,
} from "@/features/admin/admin-utils"

const scope = (companyIds: string[]) => ({ companyIds, facilityIds: [], securityGateIds: [] })

const users: AdminUser[] = [
  { id: "1", fullName: "Zeynep Ada", username: "zeynep", email: "z@bplas.com", authenticationSource: "LOCAL", role: "EMPLOYEE", authorizationScope: scope(["a"]), active: true },
  { id: "2", fullName: "Ahmet Yıldız", username: "ahmet", email: "a@bplas.com", authenticationSource: "ACTIVE_DIRECTORY", role: "MANAGER", authorizationScope: scope(["b"]), active: false },
  { id: "3", fullName: "Bora Şen", username: "bora", email: "b@bplas.com", authenticationSource: "LOCAL", role: "ADMIN", authorizationScope: scope(["a", "b"]), active: true },
]

const companies = [{ id: "a", name: "BPLAS A.Ş." }, { id: "b", name: "BPLAS Otomotiv" }]

describe("Admin user filter + search + sort pipeline", () => {
  it("scopes by role, authentication source, status and company independently", () => {
    expect(scopeAdminUsers(users, { ...defaultAdminUserFilters, role: "ADMIN" }).map((u) => u.id)).toEqual(["3"])
    expect(scopeAdminUsers(users, { ...defaultAdminUserFilters, authenticationSource: "ACTIVE_DIRECTORY" }).map((u) => u.id)).toEqual(["2"])
    expect(scopeAdminUsers(users, { ...defaultAdminUserFilters, status: "passive" }).map((u) => u.id)).toEqual(["2"])
    expect(scopeAdminUsers(users, { ...defaultAdminUserFilters, companyId: "b" }).map((u) => u.id)).toEqual(["2", "3"])
  })

  it("searches only within the already-scoped result", () => {
    expect(searchAdminUsers(users, "ahmet")).toEqual([users[1]])
    const adminsOnly = scopeAdminUsers(users, { ...defaultAdminUserFilters, role: "ADMIN" })
    expect(searchAdminUsers(adminsOnly, "ahmet")).toEqual([])
  })

  it("combines filter, search and sort in the documented order and resets are the caller's responsibility", () => {
    const filters = { ...defaultAdminUserFilters, companyId: "b" }
    const sort = toggleAdminUserSort(null, "fullName")
    expect(filterAndSortAdminUsers(users, filters, sort, companies).map((u) => u.id)).toEqual(["2", "3"])
  })

  it("sorts the company column by resolved display text, not raw ids", () => {
    const sort = toggleAdminUserSort(null, "company")
    const sorted = filterAndSortAdminUsers(users, defaultAdminUserFilters, sort, companies)
    expect(sorted.map((u) => u.id)).toEqual(["1", "3", "2"])
  })

  it("toggles through the standard three-state ascending -> descending -> none cycle", () => {
    const asc = toggleAdminUserSort(null, "fullName")
    const desc = toggleAdminUserSort(asc, "fullName")
    const none = toggleAdminUserSort(desc, "fullName")
    expect(asc).toEqual({ field: "fullName", direction: "asc" })
    expect(desc).toEqual({ field: "fullName", direction: "desc" })
    expect(none).toBeNull()
  })

  it("paginates using the fixed page size", () => {
    expect(paginateAdminUsers(users, 1)).toHaveLength(3)
  })

  it("reports whether any filter or search term is active", () => {
    expect(hasActiveAdminUserFilters(defaultAdminUserFilters)).toBe(false)
    expect(hasActiveAdminUserFilters({ ...defaultAdminUserFilters, search: "ahmet" })).toBe(true)
    expect(hasActiveAdminUserFilters({ ...defaultAdminUserFilters, companyId: "a" })).toBe(true)
  })
})

describe("Multi-company scope display", () => {
  it("renders a single company name as-is, with nothing truncated", () => {
    expect(getAdminUserCompanyDisplay(["a"], companies)).toEqual({ compact: "BPLAS A.Ş.", full: "BPLAS A.Ş.", truncated: false })
  })

  it("compacts multiple companies to the first name plus a remainder count, keeping the full list for a tooltip/aria-label", () => {
    expect(getAdminUserCompanyDisplay(["a", "b"], companies)).toEqual({ compact: "BPLAS A.Ş. +1", full: "BPLAS A.Ş., BPLAS Otomotiv", truncated: true })
  })

  it("falls back to an em dash when a user has no company scope at all", () => {
    expect(getAdminUserCompanyDisplay([], companies)).toEqual({ compact: "—", full: "—", truncated: false })
  })
})

describe("Admin users URL query persistence", () => {
  it("parses valid filter/sort/page values and falls back to defaults for invalid ones", () => {
    const parsed = parseAdminUsersQuery(new URLSearchParams("q=ahmet&role=MANAGER&auth=LOCAL&status=passive&company=company-1&sort=role&dir=desc&page=2"))
    expect(parsed).toEqual({
      filters: { search: "ahmet", role: "MANAGER", authenticationSource: "LOCAL", status: "passive", companyId: "company-1" },
      sort: { field: "role", direction: "desc" },
      page: 2,
    })
    const fallback = parseAdminUsersQuery(new URLSearchParams("role=NOT_A_ROLE&sort=notAField&page=-3"))
    expect(fallback.filters.role).toBe("all")
    expect(fallback.sort).toBeNull()
    expect(fallback.page).toBe(1)
  })

  it("resets the page whenever a filter or the search term changes", () => {
    const withPage = new URLSearchParams("role=ADMIN&page=3")
    expect(updateAdminUsersSearchParams(withPage, "status", "active").get("page")).toBeNull()
    expect(updateAdminUsersSearchParams(withPage, "q", "deniz").get("page")).toBeNull()
  })

  it("resets the page whenever sort changes, and clears both field and direction when sort is removed", () => {
    const withPage = new URLSearchParams("page=2")
    const sorted = setAdminUsersSort(withPage, { field: "fullName", direction: "asc" })
    expect(sorted.get("sort")).toBe("fullName")
    expect(sorted.get("dir")).toBe("asc")
    expect(sorted.get("page")).toBeNull()
    expect(setAdminUsersSort(new URLSearchParams("sort=fullName&dir=asc"), null).has("sort")).toBe(false)
  })

  it("keeps page 1 implicit and only writes the param for page 2+", () => {
    expect(setAdminUsersPage(new URLSearchParams(), 1).has("page")).toBe(false)
    expect(setAdminUsersPage(new URLSearchParams(), 3).get("page")).toBe("3")
  })

  it("clears search and filters but preserves the current sort", () => {
    const cleared = clearAdminUsersSearchParams(new URLSearchParams("q=x&role=ADMIN&status=active&company=company-1&page=2&sort=fullName&dir=asc"))
    expect(cleared.toString()).toBe("sort=fullName&dir=asc")
  })
})

describe("Temporary password validation", () => {
  it("requires a minimum-length, non-blank password", () => {
    expect(isTemporaryPasswordValid("")).toBe(false)
    expect(isTemporaryPasswordValid("   ")).toBe(false)
    expect(isTemporaryPasswordValid("short1")).toBe(false)
    expect(isTemporaryPasswordValid("longenough1")).toBe(true)
  })

  it("requires the confirmation to match exactly", () => {
    expect(doPasswordsMatch("longenough1", "longenough1")).toBe(true)
    expect(doPasswordsMatch("longenough1", "longenough2")).toBe(false)
    expect(doPasswordsMatch("longenough1", "")).toBe(false)
  })
})

describe("Admin role change confirmations", () => {
  it("only asks for confirmation when the new role is Admin and the previous role was not", () => {
    expect(shouldConfirmAdminRoleChange(null, "ADMIN")).toBe(true)
    expect(shouldConfirmAdminRoleChange("EMPLOYEE", "ADMIN")).toBe(true)
    expect(shouldConfirmAdminRoleChange("ADMIN", "ADMIN")).toBe(false)
    expect(shouldConfirmAdminRoleChange("EMPLOYEE", "MANAGER")).toBe(false)
  })

  it("asks for confirmation before demoting or deactivating someone else's Admin account, but not your own", () => {
    const otherAdmin = users[2] // role: "ADMIN"
    expect(shouldConfirmAnotherAdminDemotion("current-user", otherAdmin, "EMPLOYEE")).toBe(true)
    expect(shouldConfirmAnotherAdminDemotion(otherAdmin.id, otherAdmin, "EMPLOYEE")).toBe(false)
    expect(shouldConfirmAnotherAdminDemotion("current-user", otherAdmin, "ADMIN")).toBe(false)
    expect(shouldConfirmAnotherAdminDeactivation("current-user", otherAdmin, false)).toBe(true)
    expect(shouldConfirmAnotherAdminDeactivation(otherAdmin.id, otherAdmin, false)).toBe(false)
    expect(shouldConfirmAnotherAdminDeactivation("current-user", otherAdmin, true)).toBe(false)
  })

  it("never asks for confirmation on a non-Admin's role or status change", () => {
    const employee = users[0]
    expect(shouldConfirmAnotherAdminDemotion("current-user", employee, "MANAGER")).toBe(false)
    expect(shouldConfirmAnotherAdminDeactivation("current-user", employee, false)).toBe(false)
  })
})

describe("Edit dialog dirty-state", () => {
  const localUser = users[0] // authenticationSource: "LOCAL"
  const adUser = users[1] // authenticationSource: "ACTIVE_DIRECTORY"

  it("is not dirty when the draft exactly matches the original record", () => {
    expect(isAdminUserFormDirty(localUser, { ...localUser })).toBe(false)
    expect(isAdminUserFormDirty(adUser, { ...adUser })).toBe(false)
  })

  it("treats role, active and company-scope changes as dirty for both Local and AD users", () => {
    expect(isAdminUserFormDirty(localUser, { ...localUser, role: "MANAGER" })).toBe(true)
    expect(isAdminUserFormDirty(localUser, { ...localUser, active: false })).toBe(true)
    expect(isAdminUserFormDirty(localUser, { ...localUser, authorizationScope: scope(["b"]) })).toBe(true)
    expect(isAdminUserFormDirty(adUser, { ...adUser, role: "EMPLOYEE" })).toBe(true)
    expect(isAdminUserFormDirty(adUser, { ...adUser, active: true })).toBe(true)
    expect(isAdminUserFormDirty(adUser, { ...adUser, authorizationScope: scope(["a"]) })).toBe(true)
  })

  it("ignores company-scope order when comparing, so re-checking the same set isn't dirty", () => {
    expect(isAdminUserFormDirty(localUser, { ...localUser, authorizationScope: scope(["a"]) })).toBe(false)
    const multi = { ...localUser, authorizationScope: scope(["a", "b"]) }
    expect(isAdminUserFormDirty(multi, { ...multi, authorizationScope: scope(["b", "a"]) })).toBe(false)
  })

  it("treats identity field edits as dirty for a Local user but ignores them entirely for an AD user (read-only there)", () => {
    expect(isAdminUserFormDirty(localUser, { ...localUser, fullName: "Değişti" })).toBe(true)
    expect(isAdminUserFormDirty(localUser, { ...localUser, username: "degisti" })).toBe(true)
    expect(isAdminUserFormDirty(localUser, { ...localUser, email: "degisti@bplas.com" })).toBe(true)
    // AD identity fields are never actually editable in the UI, but even a hypothetical draft
    // with a different name must not be treated as a real, persistable change.
    expect(isAdminUserFormDirty(adUser, { ...adUser, fullName: "Değişti" })).toBe(false)
  })

  it("returns to not-dirty once a change is reverted back to the original value", () => {
    const changed = { ...localUser, role: "MANAGER" as const }
    expect(isAdminUserFormDirty(localUser, changed)).toBe(true)
    const reverted = { ...changed, role: localUser.role }
    expect(isAdminUserFormDirty(localUser, reverted)).toBe(false)
  })
})

describe("Admin configuration rules", () => {
  it("does not allow an in-use card to be released from inventory", () => {
    expect(canTransitionVisitorCard("IN_USE", "AVAILABLE")).toBe(false)
    expect(canTransitionVisitorCard("NOT_RETURNED", "AVAILABLE")).toBe(false)
    expect(canTransitionVisitorCard("LOST", "AVAILABLE")).toBe(true)
  })

  it("validates only the two defined operational parameters", () => {
    expect(isOperationalSettingsValid({ overdueToleranceMinutes: 15, overdueAlertRepeatMinutes: 10 })).toBe(true)
    expect(isOperationalSettingsValid({ overdueToleranceMinutes: -1, overdueAlertRepeatMinutes: 10 })).toBe(false)
    expect(isOperationalSettingsValid({ overdueToleranceMinutes: 10, overdueAlertRepeatMinutes: 0 })).toBe(false)
  })
})
