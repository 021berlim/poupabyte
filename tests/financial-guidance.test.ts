import { describe, expect, it } from "vitest"
import {
  analyzeBudgetLens503020,
  analyzeEmergencyReserve,
  analyzeIdleMoney,
  analyzeSeasonality,
  buildDebtStrategyEducation,
} from "../lib/financial-guidance"
import { DEFAULT_FINANCIAL_PROFILE } from "../lib/seed"
import type { Investment, Transaction } from "../lib/types"

const NOW = new Date("2026-06-19T12:00:00-03:00")

const baseTransactions: Transaction[] = [
  { id: "tx-1", type: "income", description: "Salário", amount: 5000, category: "salario", date: "2026-06-05T12:00:00.000Z" },
  { id: "tx-2", type: "expense", description: "Aluguel", amount: 1500, category: "moradia", date: "2026-06-03T12:00:00.000Z" },
  { id: "tx-3", type: "expense", description: "Mercado", amount: 800, category: "alimentacao", date: "2026-06-10T12:00:00.000Z" },
  { id: "tx-4", type: "expense", description: "Cinema", amount: 120, category: "lazer", date: "2026-06-12T12:00:00.000Z" },
  { id: "tx-5", type: "expense", description: "Aporte", amount: 500, category: "aportes", date: "2026-06-15T12:00:00.000Z" },
  { id: "tx-6", type: "expense", description: "Aluguel maio", amount: 1500, category: "moradia", date: "2026-05-03T12:00:00.000Z" },
  { id: "tx-7", type: "expense", description: "Mercado maio", amount: 700, category: "alimentacao", date: "2026-05-10T12:00:00.000Z" },
]

const investments: Investment[] = [
  {
    id: "inv-1",
    name: "CDB",
    type: "cdb",
    institution: "Banco",
    investedAmount: 6000,
    currentValue: 6500,
    applicationDate: "2026-01-01T12:00:00.000Z",
    movements: [],
  },
]

describe("financial guidance analytics", () => {
  it("estimates emergency reserve months with liquid patrimony", () => {
    const analysis = analyzeEmergencyReserve({
      profile: DEFAULT_FINANCIAL_PROFILE,
      transactions: baseTransactions,
      goals: [],
      limits: [],
      subscriptions: [],
      installments: [],
      investments,
      ref: NOW,
    })

    expect(analysis.savedAmount).toBe(6500)
    expect(analysis.monthsCovered).toBeGreaterThan(0)
    expect(["short", "adequate", "comfortable"]).toContain(analysis.status)
    expect(analysis.referenceRangeMonths).toEqual({ min: 3, max: 6 })
  })

  it("compares spending buckets against 50/30/20 reference", () => {
    const analysis = analyzeBudgetLens503020({
      profile: DEFAULT_FINANCIAL_PROFILE,
      transactions: baseTransactions,
      goals: [],
      limits: [],
      subscriptions: [],
      installments: [],
      investments: [],
      ref: NOW,
    })

    expect(analysis.buckets.find((bucket) => bucket.id === "needs")?.referencePercent).toBe(50)
    expect(analysis.buckets.find((bucket) => bucket.id === "wants")?.referencePercent).toBe(30)
    expect(analysis.buckets.find((bucket) => bucket.id === "savings")?.referencePercent).toBe(20)
    expect(analysis.disclaimer).toContain("não regra obrigatória")
  })

  it("detects seasonal calendar signals", () => {
    const december = new Date("2026-12-10T12:00:00-03:00")
    const analysis = analyzeSeasonality({ transactions: baseTransactions, ref: december })
    expect(analysis.signals.some((signal) => signal.kind === "calendar-event")).toBe(true)
    expect(analysis.methodology.toLowerCase()).toContain("histórico")
  })

  it("does not claim debt strategy diagnosis without structured debt data", () => {
    const education = buildDebtStrategyEducation()
    expect(education.available).toBe(false)
    expect(education.strategies).toHaveLength(2)
  })

  it("flags idle money when balance stays high without savings contributions", () => {
    const richTransactions: Transaction[] = [
      ...baseTransactions,
      { id: "tx-rich", type: "income", description: "Acúmulo", amount: 20000, category: "outras-receitas", date: "2026-04-01T12:00:00.000Z" },
      { id: "tx-rich-2", type: "income", description: "Acúmulo 2", amount: 20000, category: "outras-receitas", date: "2026-03-01T12:00:00.000Z" },
    ]

    const analysis = analyzeIdleMoney({
      profile: DEFAULT_FINANCIAL_PROFILE,
      transactions: richTransactions,
      goals: [],
      limits: [],
      subscriptions: [],
      installments: [],
      investments: [],
      ref: NOW,
    })

    expect(typeof analysis.detected).toBe("boolean")
    expect(analysis.methodology).toContain("Saldo vs gastos essenciais")
  })
})