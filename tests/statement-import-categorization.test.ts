import { describe, expect, it } from "vitest"
import { parseCsvStatement } from "../lib/parse-tabular-statement"
import { suggestStatementCategory } from "../lib/statement-import"

describe("statement import categorization", () => {
  it("uses outros-gastos for unknown imported expenses", () => {
    const suggestion = suggestStatementCategory("LANCAMENTO DESCONHECIDO 123", "expense")

    expect(suggestion.category).toBe("outros-gastos")
    expect(suggestion.confidence).toBeGreaterThanOrEqual(0.6)
  })

  it("keeps unknown imported income in outras-receitas", () => {
    const suggestion = suggestStatementCategory("CREDITO DESCONHECIDO 123", "income")

    expect(suggestion.category).toBe("outras-receitas")
  })

  it("applies the same fallback to CSV imports", () => {
    const [transaction] = parseCsvStatement(
      [
        "data;descricao;valor",
        "10/06/2026;LANCAMENTO DESCONHECIDO 123;-15,00",
      ].join("\n"),
    )

    expect(transaction.category).toBe("outros-gastos")
  })
})
