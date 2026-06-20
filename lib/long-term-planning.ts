import { ESSENTIAL_CATEGORY_IDS } from "./categories"
import { getDeclaredSalaryForMonth } from "./income"
import {
  activeInstallmentsMonthlyTotal,
  activeSubscriptionsMonthlyTotal,
  monthlyGoalReservation,
  monthExpenses,
} from "./planning"
import type { FinancialProfile, Goal, Installment, SpendingLimit, Subscription, Transaction } from "./types"

export interface LongTermPlanning {
  fixedSalary: number
  essentialExpenses: number
  monthlyReserve: number
  goalReservation: number
  subscriptionsAndInstallments: number
  fixedExpensesPercent: number
  safeMargin: number
  /** Quanto pode comprometer com nova decisão recorrente */
  availableForNewCommitment: number
}

export interface MonthlyIncomeBreakdown {
  /** Renda total do mês para decisões de curto prazo */
  monthlyIncome: number
  /** Salário fixo declarado — base para decisões de longo prazo */
  fixedSalary: number
  declaredSalary: number
  expectedExtraIncome: number
  receivedIncome: number
  extraIncomeDetected: number
  importedIncome: number
}

export function buildMonthlyIncomeBreakdown(
  profile: FinancialProfile,
  transactions: Transaction[],
  ref = new Date(),
): MonthlyIncomeBreakdown {
  const monthKey = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`
  const declaredSalary = getDeclaredSalaryForMonth(profile, ref)
  const expectedExtra = profile.expectedExtraIncome ?? 0
  const receivedIncome = transactions
    .filter((t) => t.type === "income" && t.date.slice(0, 7) === monthKey)
    .reduce((a, t) => a + t.amount, 0)
  const importedIncome = transactions
    .filter((t) => t.type === "income" && t.source === "pdf-import" && t.date.slice(0, 7) === monthKey)
    .reduce((a, t) => a + t.amount, 0)
  const expectedTotal = declaredSalary + expectedExtra
  const monthlyIncome = Math.max(expectedTotal, receivedIncome)
  const extraIncomeDetected = Math.max(0, receivedIncome - declaredSalary)

  return {
    monthlyIncome,
    fixedSalary: declaredSalary,
    declaredSalary,
    expectedExtraIncome: expectedExtra,
    receivedIncome,
    extraIncomeDetected,
    importedIncome,
  }
}

export function buildLongTermPlanning(
  profile: FinancialProfile,
  transactions: Transaction[],
  goals: Goal[],
  subscriptions: Subscription[],
  installments: Installment[],
  limits: SpendingLimit[],
  ref = new Date(),
): LongTermPlanning {
  const fixedSalary = getDeclaredSalaryForMonth(profile, ref)
  const monthKey = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`
  const monthTxs = transactions.filter((t) => t.date.slice(0, 7) === monthKey)

  const essentialFromLimits = limits
    .filter((l) => ESSENTIAL_CATEGORY_IDS.includes(l.category as (typeof ESSENTIAL_CATEGORY_IDS)[number]))
    .reduce((a, l) => a + l.amount, 0)

  const essentialFromTx = monthTxs
    .filter((t) => t.type === "expense" && ESSENTIAL_CATEGORY_IDS.includes(t.category as (typeof ESSENTIAL_CATEGORY_IDS)[number]))
    .reduce((a, t) => a + t.amount, 0)

  const essentialExpenses = Math.max(essentialFromLimits, essentialFromTx, monthExpenses(transactions, ref) * 0.45)
  const monthlyReserve = profile.monthlyReserve ?? 0
  const goalReservation = monthlyGoalReservation(goals, ref)
  const subscriptionsAndInstallments =
    activeSubscriptionsMonthlyTotal(subscriptions) + activeInstallmentsMonthlyTotal(installments)

  const committed =
    essentialExpenses + monthlyReserve + goalReservation + subscriptionsAndInstallments
  const safeMargin = Math.max(0, fixedSalary - committed)
  const fixedExpensesPercent = fixedSalary > 0 ? (committed / fixedSalary) * 100 : 0

  return {
    fixedSalary,
    essentialExpenses,
    monthlyReserve,
    goalReservation,
    subscriptionsAndInstallments,
    fixedExpensesPercent,
    safeMargin,
    availableForNewCommitment: safeMargin,
  }
}

export function evaluateLongTermCommitment(
  monthlyAmount: number,
  planning: LongTermPlanning,
): { feasible: boolean; percentOfSalary: number; message: string } {
  const percentOfSalary = planning.fixedSalary > 0 ? (monthlyAmount / planning.fixedSalary) * 100 : 0
  const remaining = planning.safeMargin - monthlyAmount
  const feasible = remaining >= 0

  const message = feasible
    ? `A parcela de ${monthlyAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} comprometeria ${percentOfSalary.toFixed(1)}% do seu salário fixo. Parece possível dentro da margem segura.`
    : `A parcela de ${monthlyAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} comprometeria ${percentOfSalary.toFixed(1)}% do salário fixo e ultrapassaria sua margem segura em ${Math.abs(remaining).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`

  return { feasible, percentOfSalary, message }
}

export function isShortTermQuestion(question: string): boolean {
  return /\b(este m[eê]s|agora|hoje|essa semana|curto prazo|posso gastar|quanto posso gastar|sobrou|dispon[ií]vel)\b/i.test(question)
}

export function isLongTermQuestion(question: string): boolean {
  return /\b(parcela|parcelar|assinatura|longo prazo|12 meses|recorrente|compromisso|sustent[aá]vel|reserva de emerg[eê]ncia|investir todo m[eê]s)\b/i.test(question)
}