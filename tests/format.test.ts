import { describe, expect, it } from "vitest"
import { formatDate, parseCalendarDate } from "../lib/format"

describe("calendar date formatting", () => {
  it("não desloca uma data sem horário para o dia anterior", () => {
    const date = parseCalendarDate("2026-06-18")

    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(5)
    expect(date.getDate()).toBe(18)
    expect(formatDate("2026-06-18")).toContain("18")
  })
})
