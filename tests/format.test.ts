import { describe, expect, it } from "vitest"
import { formatDate, parseCalendarDate, pluralPhrase } from "../lib/format"

describe("calendar date formatting", () => {
  it("não desloca uma data sem horário para o dia anterior", () => {
    const date = parseCalendarDate("2026-06-18")

    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(5)
    expect(date.getDate()).toBe(18)
    expect(formatDate("2026-06-18")).toContain("18")
  })
})

describe("pluralPhrase", () => {
  it("usa singular com contagem 1", () => {
    expect(pluralPhrase(1, "limite", "limites")).toBe("1 limite")
    expect(pluralPhrase(1, "próxima do prazo", "próximas do prazo")).toBe("1 próxima do prazo")
  })

  it("usa plural com contagem diferente de 1", () => {
    expect(pluralPhrase(3, "limite", "limites")).toBe("3 limites")
  })
})
