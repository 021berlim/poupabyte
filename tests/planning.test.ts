import { describe, expect, it } from "vitest"
import { buildMonthlyPlanning } from "../lib/planning"
import { EMPTY_FINANCIAL_PROFILE } from "../lib/seed"
import type { Transaction } from "../lib/types"

describe("monthly planning income", () => {
  it("soma cashback recebido à renda declarada disponível", () => {
    const profile = {
      ...EMPTY_FINANCIAL_PROFILE,
      configured: true,
      monthlySalary: 500,
    }
    const transactions: Transaction[] = [
      {
        id: "cashback",
        type: "income",
        description: "Cashback - INTER PRE 20GB MENSAL",
        amount: 1.8,
        category: "outras-receitas",
        date: "2026-06-18T12:00:00.000Z",
        source: "pdf-import",
      },
    ]

    const planning = buildMonthlyPlanning(
      profile,
      transactions,
      [],
      [],
      [],
      [],
      new Date("2026-06-21T12:00:00-03:00"),
    )

    expect(planning.receivedIncome).toBe(1.8)
    expect(planning.extraIncomeDetected).toBe(1.8)
    expect(planning.safeToSpend).toBe(1.8)
    expect(planning.projectedSavings).toBe(501.8)
  })

  it("não soma novamente um salário já incluído na renda declarada", () => {
    const profile = {
      ...EMPTY_FINANCIAL_PROFILE,
      configured: true,
      monthlySalary: 500,
    }
    const transactions: Transaction[] = [
      {
        id: "salary",
        type: "income",
        description: "Salário mensal",
        amount: 500,
        category: "salario",
        date: "2026-06-05T12:00:00.000Z",
      },
    ]

    const planning = buildMonthlyPlanning(
      profile,
      transactions,
      [],
      [],
      [],
      [],
      new Date("2026-06-21T12:00:00-03:00"),
    )

    expect(planning.safeToSpend).toBe(500)
  })
})
