import { describe, expect, it } from "vitest"

import { createOperationalSettingsDraft, getOperationalSettingsDraftValue, getOverdueAlertRepeatError, getOverdueToleranceError, isOperationalSettingsDraftDirty } from "@/features/admin/operational-settings-form"

const persisted = { overdueToleranceMinutes: 15, overdueAlertRepeatMinutes: 10 }

describe("Operational settings form", () => {
  it("validates tolerance as a non-negative integer without converting an empty input to zero", () => {
    expect(getOverdueToleranceError("")).not.toBeNull()
    expect(getOverdueToleranceError("-1")).not.toBeNull()
    expect(getOverdueToleranceError("0")).toBeNull()
    expect(getOverdueToleranceError("15")).toBeNull()
    expect(getOverdueToleranceError("1.5")).not.toBeNull()
  })

  it("validates alert repeat as an integer of at least one", () => {
    expect(getOverdueAlertRepeatError("")).not.toBeNull()
    expect(getOverdueAlertRepeatError("-1")).not.toBeNull()
    expect(getOverdueAlertRepeatError("0")).not.toBeNull()
    expect(getOverdueAlertRepeatError("1")).toBeNull()
    expect(getOverdueAlertRepeatError("10")).toBeNull()
    expect(getOverdueAlertRepeatError("2.5")).not.toBeNull()
  })

  it("keeps persisted equality clean and tracks real or invalid draft changes", () => {
    expect(isOperationalSettingsDraftDirty(persisted, createOperationalSettingsDraft(persisted))).toBe(false)
    expect(isOperationalSettingsDraftDirty(persisted, { ...createOperationalSettingsDraft(persisted), overdueToleranceMinutes: "20" })).toBe(true)
    expect(isOperationalSettingsDraftDirty(persisted, { ...createOperationalSettingsDraft(persisted), overdueAlertRepeatMinutes: "20" })).toBe(true)
    expect(isOperationalSettingsDraftDirty(persisted, { overdueToleranceMinutes: "20", overdueAlertRepeatMinutes: "20" })).toBe(true)
    expect(isOperationalSettingsDraftDirty(persisted, { ...createOperationalSettingsDraft(persisted), overdueToleranceMinutes: "" })).toBe(true)
  })

  it("produces a domain value only for a complete valid draft", () => {
    expect(getOperationalSettingsDraftValue(createOperationalSettingsDraft(persisted))).toEqual(persisted)
    expect(getOperationalSettingsDraftValue({ overdueToleranceMinutes: "", overdueAlertRepeatMinutes: "10" })).toBeNull()
    expect(getOperationalSettingsDraftValue({ overdueToleranceMinutes: "1.5", overdueAlertRepeatMinutes: "10" })).toBeNull()
  })
})
