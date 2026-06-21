import { describe, expect, it } from "vitest"
import {
  amountsAreSimilar,
  findSimilarPending,
} from "../lib/transaction-utils"
import type { Transaction } from "../lib/types"

function tx(overrides: Partial<Transaction> & Pick<Transaction, "id" | "description" | "amount">): Transaction {
  return {
    type: "expense",
    category: "nao-categorizado",
    date: "2026-06-01T12:00:00.000Z",
    needsReview: true,
    ...overrides,
  }
}

describe("amountsAreSimilar", () => {
  it("considera valores iguais", () => {
    expect(amountsAreSimilar(45, 45)).toBe(true)
  })

  it("aceita diferença de até um centavo", () => {
    expect(amountsAreSimilar(45, 45.01)).toBe(true)
    expect(amountsAreSimilar(45, 44.99)).toBe(true)
  })

  it("rejeita diferença maior que um centavo", () => {
    expect(amountsAreSimilar(45, 45.02)).toBe(false)
    expect(amountsAreSimilar(1, 45)).toBe(false)
  })
})

describe("findSimilarPending", () => {
  const source = tx({
    id: "src",
    description: "INTER PRE 20GB MENSAL",
    amount: 45,
    category: "assinaturas",
    needsReview: false,
  })

  const transactions = [
    source,
    tx({ id: "a", description: "INTER PRE 20GB MENSAL", amount: 45 }),
    tx({ id: "b", description: "INTER PRE 20GB MENSAL", amount: 45.01 }),
    tx({ id: "c", description: "INTER PRE 20GB MENSAL", amount: 1 }),
    tx({ id: "d", description: "OUTRA DESCRICAO QUALQUER", amount: 45 }),
    tx({
      id: "e",
      description: "INTER PRE 20GB MENSAL",
      amount: 45,
      category: "assinaturas",
      needsReview: false,
    }),
  ]

  it("agrupa apenas pendentes com mesma descrição e valor equivalente", () => {
    const similar = findSimilarPending(transactions, source)
    expect(similar.map((item) => item.id).sort()).toEqual(["a", "b"])
  })

  it("não agrupa quando o valor difere em mais de um centavo", () => {
    const similar = findSimilarPending(transactions, source)
    expect(similar.some((item) => item.id === "c")).toBe(false)
  })
})