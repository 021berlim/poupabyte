import { describe, expect, it } from "vitest"
import { migrateLegacyTransactions, transactionCashDelta } from "../lib/transaction-cash"
import type { Transaction } from "../lib/types"

describe("transaction cash impact", () => {
  it("ignora transferências entre contas próprias no saldo", () => {
    const tx: Transaction = {
      id: "1",
      type: "transfer",
      description: "PIX entre contas",
      amount: 100,
      category: "transferencias",
      date: "2026-06-10T12:00:00.000Z",
    }
    expect(transactionCashDelta(tx)).toBe(0)
  })

  it("migra PIX enviado legado para despesa", () => {
    const legacy: Transaction = {
      id: "2",
      type: "transfer",
      description: "PIX ENVIADO - Maria",
      amount: 50,
      category: "transferencias",
      date: "2026-06-10T12:00:00.000Z",
    }
    const [migrated] = migrateLegacyTransactions([legacy])
    expect(migrated.type).toBe("expense")
    expect(migrated.category).toBe("outros-gastos")
    expect(transactionCashDelta(migrated)).toBe(-50)
  })
})