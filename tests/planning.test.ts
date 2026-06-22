import { describe, expect, it } from "vitest"
import { buildMonthlyPlanning } from "../lib/planning"
import { EMPTY_FINANCIAL_PROFILE } from "../lib/seed"
import type { ImportSummary, Transaction } from "../lib/types"

const ref = new Date("2026-06-21T12:00:00-03:00")

function importIncome(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "income-1",
    type: "income",
    description: "Cashback - INTER PRE 20GB MENSAL",
    amount: 1.8,
    category: "outras-receitas",
    date: "2026-06-18T12:00:00.000Z",
    source: "pdf-import",
    needsReview: false,
    ...overrides,
  }
}

describe("monthly planning income", () => {
  it("usa apenas entradas confirmadas do extrato para disponível", () => {
    const profile = {
      ...EMPTY_FINANCIAL_PROFILE,
      configured: true,
      monthlySalary: 500,
    }
    const transactions: Transaction[] = [importIncome()]

    const planning = buildMonthlyPlanning(profile, transactions, [], [], [], [], ref)

    expect(planning.receivedIncome).toBe(1.8)
    expect(planning.importBasedIncome).toBe(1.8)
    expect(planning.safeToSpend).toBe(1.8)
    expect(planning.salaryConfirmed).toBe(false)
    expect(planning.monthlyIncome).toBe(1.8)
  })

  it("ignora lançamentos do extrato ainda pendentes de confirmação", () => {
    const profile = {
      ...EMPTY_FINANCIAL_PROFILE,
      configured: true,
      monthlySalary: 500,
    }
    const transactions: Transaction[] = [
      importIncome({ needsReview: true }),
      importIncome({ id: "expense-1", type: "expense", amount: 50, category: "alimentacao" }),
    ]

    const planning = buildMonthlyPlanning(profile, transactions, [], [], [], [], ref)

    expect(planning.safeToSpend).toBe(0)
    expect(planning.importBasedIncome).toBe(0)
  })

  it("prioriza saldo disponível informado no extrato", () => {
    const profile = {
      ...EMPTY_FINANCIAL_PROFILE,
      configured: true,
      monthlySalary: 500,
    }
    const lastImport: ImportSummary = {
      fileName: "extrato.pdf",
      importedAt: "2026-06-20T12:00:00.000Z",
      totalFound: 1,
      importedCount: 1,
      incomeTotal: 1.8,
      expenseTotal: 0,
      autoCategorized: 1,
      pendingReview: 0,
      duplicates: 0,
      categoriesUpdated: 1,
      availableBalance: 0.09,
    }

    const planning = buildMonthlyPlanning(profile, [importIncome()], [], [], [], [], ref, lastImport)

    expect(planning.statementAvailableBalance).toBe(0.09)
    expect(planning.safeToSpend).toBe(0.09)
  })

  it("só usa salário declarado após confirmação nas movimentações", () => {
    const profile = {
      ...EMPTY_FINANCIAL_PROFILE,
      configured: true,
      monthlySalary: 500,
      salaryDay: 5,
    }
    const transactions: Transaction[] = [
      importIncome({
        id: "salary",
        description: "Salário mensal",
        amount: 500,
        category: "salario",
      }),
    ]

    const planning = buildMonthlyPlanning(profile, transactions, [], [], [], [], ref)

    expect(planning.salaryConfirmed).toBe(true)
    expect(planning.safeToSpend).toBe(500)
    expect(planning.monthlyIncome).toBe(500)
    expect(planning.projectedSavings).toBe(500)
  })

  it("calcula comprometimento e sobra com base no extrato", () => {
    const profile = {
      ...EMPTY_FINANCIAL_PROFILE,
      configured: true,
      monthlySalary: 1000,
      monthlyReserve: 100,
    }
    const transactions: Transaction[] = [
      importIncome({ amount: 1000 }),
      importIncome({
        id: "expense-1",
        type: "expense",
        amount: 400,
        category: "alimentacao",
      }),
    ]

    const planning = buildMonthlyPlanning(profile, transactions, [], [], [], [], ref)

    expect(planning.importBasedIncome).toBe(1000)
    expect(planning.importBasedExpenses).toBe(400)
    expect(planning.statementNet).toBe(600)
    expect(planning.pendingObligations).toBe(100)
    expect(planning.safeToSpend).toBe(500)
    expect(planning.statementCommittedPercent).toBe(50)
  })

  it("não projeta com salário declarado sem confirmação no extrato", () => {
    const profile = {
      ...EMPTY_FINANCIAL_PROFILE,
      configured: true,
      monthlySalary: 500,
    }
    const transactions: Transaction[] = [
      {
        id: "manual-salary",
        type: "income",
        description: "Salário mensal",
        amount: 500,
        category: "salario",
        date: "2026-06-05T12:00:00.000Z",
        source: "manual",
      },
    ]

    const planning = buildMonthlyPlanning(profile, transactions, [], [], [], [], ref)

    expect(planning.salaryConfirmed).toBe(false)
    expect(planning.safeToSpend).toBe(0)
    expect(planning.monthlyIncome).toBe(0)
  })
})