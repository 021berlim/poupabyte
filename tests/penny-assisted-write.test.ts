import { describe, expect, it } from "vitest"
import {
  buildAssistedWritePlan,
  buildUpdatedTransactions,
  hasAssistedWriteIntent,
  isExplicitConfirmation,
  resolveCategoryFromText,
} from "../lib/penny-assisted-write"
import type { Transaction } from "../lib/types"

const transactions: Transaction[] = [
  {
    id: "tx-1",
    type: "expense",
    description: "UBER TRIP",
    amount: 24,
    category: "nao-categorizado",
    date: "2026-06-10T12:00:00.000Z",
    needsReview: true,
  },
  {
    id: "tx-2",
    type: "expense",
    description: "UBER TRIP",
    amount: 18,
    category: "nao-categorizado",
    date: "2026-06-12T12:00:00.000Z",
    needsReview: true,
  },
  {
    id: "tx-3",
    type: "expense",
    description: "Supermercado",
    amount: 220,
    category: "alimentacao",
    date: "2026-06-08T12:00:00.000Z",
  },
]

describe("penny assisted write", () => {
  it("detects assisted write intent", () => {
    expect(hasAssistedWriteIntent("categoriza os lançamentos da Uber como Transporte")).toBe(true)
    expect(hasAssistedWriteIntent("como está meu saldo?")).toBe(false)
  })

  it("detects explicit confirmation", () => {
    expect(isExplicitConfirmation("sim")).toBe(true)
    expect(isExplicitConfirmation("confirma")).toBe(true)
    expect(isExplicitConfirmation("talvez depois")).toBe(false)
  })

  it("builds a categorize plan for pending uber transactions", () => {
    const plan = buildAssistedWritePlan(transactions, "categoriza os lançamentos da Uber como Transporte")
    expect(plan?.transactionIds).toEqual(["tx-1", "tx-2"])
    expect(plan?.categoryId).toBe("transporte")
    expect(plan?.confirmationPrompt).toContain("Transporte")
  })

  it("resolves categories from natural language", () => {
    expect(resolveCategoryFromText("transporte")?.category).toBe("transporte")
    expect(resolveCategoryFromText("alimentação")?.category).toBe("alimentacao")
  })

  it("applies category and confirmation updates", () => {
    const plan = buildAssistedWritePlan(transactions, "categoriza os lançamentos da Uber como Transporte")
    expect(plan).not.toBeNull()
    const updated = buildUpdatedTransactions(transactions, plan!)
    expect(updated).toHaveLength(2)
    expect(updated.every((tx) => tx.category === "transporte" && tx.needsReview === false)).toBe(true)
  })
})