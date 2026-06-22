import { describe, expect, it } from "vitest"
import {
  applyOnboardingAnswers,
  buildInitialLimits,
  getDashboardFocus,
  pennyIncomeMessage,
  suggestMonthlyReserve,
} from "@/lib/onboarding-personalization"
import { getIncomePlanningMultiplier } from "@/lib/income"
import { EMPTY_FINANCIAL_PROFILE } from "@/lib/seed"

describe("onboarding personalization", () => {
  it("maps fixed salary income type with predictable planning", () => {
    const result = applyOnboardingAnswers(
      {
        income: {
          incomeType: "salario-fixo",
          monthlyIncome: 5000,
          salaryDay: 5,
        },
        objective: "reserva-emergencia",
        budgetWeight: "moradia",
      },
      EMPTY_FINANCIAL_PROFILE,
    )

    expect(result.profile.incomeType).toBe("salario-fixo")
    expect(result.profile.monthlySalary).toBe(5000)
    expect(result.profile.salaryDay).toBe(5)
    expect(result.profile.monthlyReserve).toBe(500)
    expect(result.limits.some((limit) => limit.category === "moradia")).toBe(true)
  })

  it("uses conservative limits for autonomo with high variability", () => {
    const conservative = buildInitialLimits(4000, "controlar-gastos", "alimentacao", "autonomo", "bastante")
    const stable = buildInitialLimits(4000, "controlar-gastos", "alimentacao", "autonomo", "pouco")
    const conservativeFood = conservative.find((limit) => limit.category === "alimentacao")?.amount ?? 0
    const stableFood = stable.find((limit) => limit.category === "alimentacao")?.amount ?? 0
    expect(conservativeFood).toBeLessThan(stableFood)
    expect(getIncomePlanningMultiplier({ incomeType: "autonomo", incomeVariability: "bastante" })).toBe(0.75)
  })

  it("allows onboarding without income amount for occasional and no-income paths", () => {
    const occasional = applyOnboardingAnswers(
      {
        income: { incomeType: "ocasional", monthlyIncome: 0 },
        objective: "entender-gastos",
        budgetWeight: "nao-sei",
      },
      EMPTY_FINANCIAL_PROFILE,
    )
    const noIncome = applyOnboardingAnswers(
      {
        income: { incomeType: "sem-renda", monthlyIncome: 0 },
        objective: "entender-gastos",
        budgetWeight: "nao-sei",
      },
      EMPTY_FINANCIAL_PROFILE,
    )

    expect(occasional.profile.monthlySalary).toBe(0)
    expect(occasional.limits).toHaveLength(0)
    expect(noIncome.profile.incomeType).toBe("sem-renda")
    expect(noIncome.limits).toHaveLength(0)
    expect(suggestMonthlyReserve(0, "reserva-emergencia", "sem-renda")).toBe(0)
  })

  it("stores business owner personal withdrawal, not gross revenue", () => {
    const result = applyOnboardingAnswers(
      {
        income: {
          incomeType: "negocio-proprio",
          monthlyIncome: 3500,
          businessSeparation: "ainda-nao",
        },
        objective: "planejar-metas",
        budgetWeight: "lazer",
        goal: { name: "Viagem", target: 3000, deadline: "2026-12-31T00:00:00.000Z" },
      },
      EMPTY_FINANCIAL_PROFILE,
    )

    expect(result.profile.monthlySalary).toBe(3500)
    expect(result.profile.businessSeparation).toBe("ainda-nao")
    expect(result.goal?.name).toBe("Viagem")
  })

  it("returns dashboard focus adapted to income type", () => {
    expect(getDashboardFocus("entender-gastos", undefined, "autonomo").showIncomeTracking).toBe(true)
    expect(getDashboardFocus("controlar-gastos", undefined, "ocasional").showLimitsProminent).toBe(false)
    expect(getDashboardFocus("sair-dividas", undefined, "sem-renda").showCommittedPercent).toBe(false)
    expect(pennyIncomeMessage("renda-variavel")).toContain("ajustam")
    expect(pennyIncomeMessage("salario-fixo")).toContain("limites")
  })
})