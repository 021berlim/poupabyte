import { describe, expect, it } from "vitest"
import {
  buildPlanningIncomeBase,
  confirmedImportedIncome,
  salaryConfirmedThisMonth,
} from "@/lib/statement-cash"
import { EMPTY_FINANCIAL_PROFILE } from "@/lib/seed"
import type { Transaction } from "@/lib/types"

const ref = new Date("2026-06-21T12:00:00-03:00")

describe("statement cash rules", () => {
  it("conta apenas pdf-import confirmado", () => {
    const transactions: Transaction[] = [
      {
        id: "1",
        type: "income",
        description: "PIX recebido",
        amount: 120,
        category: "outras-receitas",
        date: "2026-06-10T12:00:00.000Z",
        source: "pdf-import",
        needsReview: false,
      },
      {
        id: "2",
        type: "income",
        description: "PIX recebido pendente",
        amount: 80,
        category: "outras-receitas",
        date: "2026-06-11T12:00:00.000Z",
        source: "pdf-import",
        needsReview: true,
      },
    ]

    expect(confirmedImportedIncome(transactions, ref)).toBe(120)
  })

  it("libera salário no planejamento somente após confirmação", () => {
    const profile = { ...EMPTY_FINANCIAL_PROFILE, monthlySalary: 3000, configured: true }
    const transactions: Transaction[] = [
      {
        id: "salary",
        type: "income",
        description: "Salário",
        amount: 3000,
        category: "salario",
        date: "2026-06-05T12:00:00.000Z",
        source: "pdf-import",
        needsReview: false,
      },
    ]

    expect(salaryConfirmedThisMonth(transactions, profile, ref)).toBe(true)
    const incomeBase = buildPlanningIncomeBase(profile, transactions, ref)
    expect(incomeBase.planningIncome).toBe(3000)
  })
})