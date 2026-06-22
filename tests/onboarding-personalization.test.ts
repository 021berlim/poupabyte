import { describe, expect, it } from "vitest"
import {
  applyOnboardingAnswers,
  buildInitialLimits,
  getDashboardFocus,
  suggestMonthlyReserve,
} from "@/lib/onboarding-personalization"
import { EMPTY_FINANCIAL_PROFILE } from "@/lib/seed"

describe("onboarding personalization", () => {
  it("maps financial moment to objective and reserve for savings path", () => {
    const result = applyOnboardingAnswers(
      {
        income: {
          monthlySalary: 5000,
          salaryDay: 5,
          expectedExtraIncome: 0,
          extraIncomeFrequency: "none",
        },
        objective: "reserva-emergencia",
        budgetWeight: "moradia",
      },
      EMPTY_FINANCIAL_PROFILE,
    )

    expect(result.profile.objective).toBe("reserva-emergencia")
    expect(result.profile.monthlyReserve).toBe(500)
    expect(result.profile.budgetWeight).toBe("moradia")
    expect(result.limits.some((limit) => limit.category === "moradia")).toBe(true)
  })

  it("skips extra income fields when frequency is none", () => {
    const result = applyOnboardingAnswers(
      {
        income: {
          monthlySalary: 4000,
          salaryDay: 10,
          expectedExtraIncome: 0,
          extraIncomeFrequency: "none",
        },
        objective: "entender-gastos",
        budgetWeight: "nao-sei",
      },
      EMPTY_FINANCIAL_PROFILE,
    )

    expect(result.profile.expectedExtraIncome).toBe(0)
    expect(result.profile.extraIncomeFrequency).toBe("none")
    expect(result.limits).toHaveLength(0)
  })

  it("creates envelope limits for spending control path", () => {
    const limits = buildInitialLimits(6000, "controlar-gastos", "alimentacao")
    expect(limits.some((limit) => limit.category === "alimentacao")).toBe(true)
    expect(limits.some((limit) => limit.category === "lazer")).toBe(true)
  })

  it("creates goal payload when provided", () => {
    const result = applyOnboardingAnswers(
      {
        income: {
          monthlySalary: 3500,
          salaryDay: 1,
          expectedExtraIncome: 500,
          extraIncomeFrequency: "monthly",
        },
        objective: "planejar-metas",
        budgetWeight: "lazer",
        goal: { name: "Viagem", target: 3000, deadline: "2026-12-31T00:00:00.000Z" },
      },
      EMPTY_FINANCIAL_PROFILE,
    )

    expect(result.goal?.name).toBe("Viagem")
    expect(result.goal?.target).toBe(3000)
  })

  it("returns dashboard focus per path", () => {
    expect(getDashboardFocus("entender-gastos").showCategoryReports).toBe(true)
    expect(getDashboardFocus("controlar-gastos").showLimitsProminent).toBe(true)
    expect(getDashboardFocus("sair-dividas").showCommittedPercent).toBe(true)
    expect(suggestMonthlyReserve(2000, "reserva-emergencia")).toBe(200)
    expect(suggestMonthlyReserve(2000, "controlar-gastos")).toBe(0)
  })
})