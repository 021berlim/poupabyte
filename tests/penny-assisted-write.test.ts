import { describe, expect, it } from "vitest"
import {
  buildAssistedWritePlan,
  buildProposedTransaction,
  buildUpdatedTransactions,
  hasAssistedWriteIntent,
  hasCreateIntent,
  isExplicitConfirmation,
  parseAmountFromText,
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
    expect(hasAssistedWriteIntent("registra uma despesa de R$ 45 no mercado")).toBe(true)
    expect(hasAssistedWriteIntent("como está meu saldo?")).toBe(false)
  })

  it("detects create intent", () => {
    expect(hasCreateIntent("adiciona um lançamento de R$ 30 no uber")).toBe(true)
    expect(hasCreateIntent("categoriza os lançamentos da Uber como Transporte")).toBe(false)
  })

  it("detects explicit confirmation", () => {
    expect(isExplicitConfirmation("sim")).toBe(true)
    expect(isExplicitConfirmation("confirma")).toBe(true)
    expect(isExplicitConfirmation("talvez depois")).toBe(false)
  })

  it("parses amounts from natural language", () => {
    expect(parseAmountFromText("R$ 24,50")).toBe(24.5)
    expect(parseAmountFromText("45 reais")).toBe(45)
  })

  it("builds a categorize plan for pending uber transactions", () => {
    const plan = buildAssistedWritePlan(transactions, "categoriza os lançamentos da Uber como Transporte")
    expect(plan?.transactionIds).toEqual(["tx-1", "tx-2"])
    expect(plan?.categoryId).toBe("transporte")
    expect(plan?.confirmationPrompt).toContain("Transporte")
  })

  it("builds a create plan when enabled", () => {
    const plan = buildAssistedWritePlan(
      transactions,
      "registra despesa de R$ 45 no mercado como alimentação",
      [],
      { createEnabled: true },
    )
    expect(plan?.action).toBe("create")
    expect(plan?.proposedTransaction?.amount).toBe(45)
    expect(plan?.proposedTransaction?.description).toMatch(/mercado/i)
    expect(plan?.proposedTransaction?.category).toBe("alimentacao")
    expect(plan?.confirmationPrompt).toContain("R$")
  })

  it("blocks create execution payload when disabled", () => {
    const plan = buildAssistedWritePlan(
      transactions,
      "registra despesa de R$ 45 no mercado",
      [],
      { createEnabled: false },
    )
    expect(plan?.action).toBe("create")
    expect(plan?.proposedTransaction).toBeUndefined()
    expect(plan?.confirmationPrompt).toContain("Minha conta")
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

  it("builds proposed transaction with defaults", () => {
    const proposed = buildProposedTransaction("adiciona despesa de uber de R$ 20", [], new Date("2026-06-21T10:00:00.000Z"))
    expect(proposed?.type).toBe("expense")
    expect(proposed?.amount).toBe(20)
    expect(proposed?.description).toMatch(/uber/i)
    expect(proposed?.date).toContain("2026-06-21")
  })
})