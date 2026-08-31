import { describe, expect, it } from "vitest"

import { MockVisitTypeStore } from "@/services/mock-visit-type-store"

describe("MockVisitTypeStore", () => {
  it("rejects a duplicate name regardless of Turkish casing or surrounding whitespace", () => {
    const store = new MockVisitTypeStore()
    expect(() => store.save({ name: "toplantı", active: true })).toThrow("Bu ziyaret türü zaten tanımlı.")
    expect(() => store.save({ name: "TOPLANTI", active: true })).toThrow("Bu ziyaret türü zaten tanımlı.")
    expect(() => store.save({ name: "  Toplantı  ", active: true })).toThrow("Bu ziyaret türü zaten tanımlı.")
  })

  it("rejects an empty name", () => {
    const store = new MockVisitTypeStore()
    expect(() => store.save({ name: "   ", active: true })).toThrow("Ziyaret türü adı boş olamaz.")
  })

  it("rejects updating an id that does not exist", () => {
    const store = new MockVisitTypeStore()
    expect(() => store.save({ id: "type-nope", name: "Yeni", active: true })).toThrow("Ziyaret türü bulunamadı.")
  })

  it("returns a defensive copy that cannot mutate stored state", () => {
    const store = new MockVisitTypeStore()
    const first = store.getAll()
    first.splice(0, first.length)
    first.push({ id: "hacked", name: "Hacked", active: true })
    expect(store.getAll().map((type) => type.id)).toContain("meeting")
    expect(store.getAll().some((type) => type.id === "hacked")).toBe(false)
  })

  it("adds a trimmed new type and updates an existing one in place", () => {
    const store = new MockVisitTypeStore()
    const created = store.save({ name: "  Denetim Takibi  ", active: true })
    expect(created.name).toBe("Denetim Takibi")
    expect(store.getAll().some((type) => type.id === created.id && type.name === "Denetim Takibi")).toBe(true)

    const deactivated = store.save({ id: "audit", name: "Denetim", active: false })
    expect(deactivated).toMatchObject({ id: "audit", active: false })
    expect(store.getAll().filter((type) => type.id === "audit")).toHaveLength(1)
  })
})
