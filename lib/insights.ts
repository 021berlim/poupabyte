import { getCategory } from "./categories"
import { expenseBySubcategory, type CategoryContext } from "./category-system"
import { getDeclaredSalaryForMonth, isPredictableIncome } from "./income"
import { buildLongTermPlanning } from "./long-term-planning"
import { buildMonthlyPlanning, monthExpenses, monthIncomeFromTransactions } from "./planning"
import { expenseByCategory, goalProgress, monthlySeries, transactionSummary } from "./selectors"
import type { CategoryId, FinancialProfile, Goal, Installment, SpendingLimit, Subscription, Transaction, UserCategory } from "./types"

export interface AnalysisInsight {
  id: string
  title: string
  message: string
  tone: "neutral" | "positive" | "warning" | "critical"
}

function percentOf(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0
}

function incomeBaseLabel(profile: FinancialProfile): string {
  return isPredictableIncome(profile.incomeType) ? "renda fixa" : "renda"
}

function money(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export type AnalysisInsightScope = "calendar-month" | "filtered-period"

export function buildAnalysisInsights(
  transactions: Transaction[],
  profile: FinancialProfile,
  goals: Goal[],
  limits: SpendingLimit[],
  subscriptions: Subscription[],
  installments: Installment[],
  ref = new Date(),
  userCategories: UserCategory[] = [],
  hiddenSystemCategories: CategoryId[] = [],
  scope: AnalysisInsightScope = "calendar-month",
): AnalysisInsight[] {
  const insights: AnalysisInsight[] = []
  const planning = buildMonthlyPlanning(profile, transactions, goals, subscriptions, installments, limits, ref)
  const monthKey = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`
  const periodTxs =
    scope === "filtered-period"
      ? transactions
      : transactions.filter((tx) => tx.date.slice(0, 7) === monthKey)
  const summary = transactionSummary(periodTxs)
  const categories = expenseByCategory(periodTxs, scope === "calendar-month" ? ref : undefined)
  const declared = getDeclaredSalaryForMonth(profile, ref)

  if (categories[0]) {
    const share = percentOf(categories[0].total, summary.expense)
    insights.push({
      id: "top-category",
      title: "Maior gasto",
      message:
        scope === "filtered-period"
          ? `${categories[0].label}: ${share.toFixed(0)}% do período.`
          : `${categories[0].label}: ${share.toFixed(0)}% do mês.`,
      tone: share >= 40 ? "warning" : "neutral",
    })
  }

  if (scope === "calendar-month" && (declared > 0 || planning.receivedIncome > 0)) {
    insights.push({
      id: "salary-committed",
      title: "Renda com destino",
      message: `De ${money(planning.receivedIncome)}, ${planning.monthCommittedPercent.toFixed(0)}% já tem destino.`,
      tone: planning.monthCommittedPercent >= 90 ? "critical" : planning.monthCommittedPercent >= 71 ? "warning" : "positive",
    })
  }

  const series = monthlySeries(scope === "filtered-period" ? periodTxs : transactions, 6)
  const best = [...series].sort((a, b) => b.balance - a.balance)[0]
  const worst = [...series].sort((a, b) => a.balance - b.balance)[0]
  if (best && best.balance > 0) {
    insights.push({
      id: "best-month",
      title: "Melhor mês",
      message: `${best.label}: +${money(best.balance)}.`,
      tone: "positive",
    })
  }
  if (worst && worst.balance < 0) {
    insights.push({
      id: "worst-month",
      title: "Mês mais difícil",
      message: `${worst.label}: -${money(Math.abs(worst.balance))}.`,
      tone: "warning",
    })
  }

  const fixed = periodTxs
    .filter((tx) => tx.isFixed || tx.isSubscription || tx.isRecurring)
    .reduce((acc, tx) => acc + (tx.type === "expense" ? tx.amount : 0), 0)
  const variable = summary.expense - fixed
  if (summary.expense > 0) {
    insights.push({
      id: "fixed-vs-variable",
      title: "Fixos e variáveis",
      message: `Fixos ${money(fixed)} (${percentOf(fixed, summary.expense).toFixed(0)}%) · Variáveis ${money(variable)}.`,
      tone: "neutral",
    })
  }

  const atRiskGoals = goals.filter((g) => goalProgress(g).atRisk)
  if (atRiskGoals.length) {
    insights.push({
      id: "goals-at-risk",
      title: "Metas em risco",
      message: `${atRiskGoals.length} meta(s): ${atRiskGoals.map((g) => g.name).join(", ")}.`,
      tone: "warning",
    })
  }

  if (scope === "calendar-month" && planning.projectedSavings < 0) {
    insights.push({
      id: "negative-projection",
      title: "Mês pode fechar no negativo",
      message: `No ritmo atual, faltam ${money(Math.abs(planning.projectedSavings))}.`,
      tone: "critical",
    })
  } else if (scope === "calendar-month" && planning.daysLeft > 0) {
    insights.push({
      id: "month-projection",
      title: "Fim do mês",
      message: `No ritmo atual, sobram ${money(planning.projectedSavings)}.`,
      tone: "positive",
    })
  }

  const extra = planning.receivedIncome - planning.declaredSalary
  if (scope === "calendar-month" && extra > 100 && isPredictableIncome(profile.incomeType)) {
    insights.push({
      id: "extra-income",
      title: "Entrada extra",
      message: `+${money(extra)}. Não use como renda fixa.`,
      tone: "warning",
    })
  }

  const longTerm = buildLongTermPlanning(profile, transactions, goals, subscriptions, installments, limits, ref)
  insights.push({
    id: "safe-margin",
      title: "Quanto pode comprometer",
      message: `Com ${incomeBaseLabel(profile)} de ${money(longTerm.fixedSalary)}, pode comprometer ${money(longTerm.safeMargin)}.`,
    tone: longTerm.safeMargin < 500 ? "warning" : "neutral",
  })

  if (longTerm.fixedExpensesPercent >= 75) {
    insights.push({
      id: "fixed-expenses-high",
      title: "Compromissos fixos altos",
      message: `Compromissos fixos: ${longTerm.fixedExpensesPercent.toFixed(0)}% da ${incomeBaseLabel(profile)}.`,
      tone: "warning",
    })
  }

  const ctx: CategoryContext = { userCategories, hiddenSystemCategories }
  const subcategories = expenseBySubcategory(periodTxs, ctx, scope === "calendar-month" ? ref : undefined)
  if (subcategories[0]) {
    const parentShare = categories[0] ? percentOf(subcategories[0].total, categories[0].total) : 0
    insights.push({
      id: "top-subcategory",
      title: "Subcategoria principal",
      message: `${subcategories[0].label} em ${subcategories[0].parentLabel}: ${parentShare.toFixed(0)}%.`,
      tone: parentShare >= 40 ? "warning" : "neutral",
    })
  }

  const moradia = categories.find((c) => c.category === "moradia")
  if (moradia && declared > 0) {
    const moradiaShare = percentOf(moradia.total, declared)
    if (moradiaShare > 35) {
      insights.push({
        id: "moradia-high",
        title: "Moradia alta",
        message: `Moradia: ${moradiaShare.toFixed(0)}% da renda (ideal: 30%).`,
        tone: "warning",
      })
    }
  }

  return insights
}

export const BUDGET_SUGGESTIONS: Array<{ category: string; percent: number; label: string }> = [
  { category: "moradia", percent: 30, label: "Moradia" },
  { category: "alimentacao", percent: 15, label: "Alimentação" },
  { category: "transporte", percent: 10, label: "Transporte" },
  { category: "lazer", percent: 8, label: "Lazer" },
  { category: "saude", percent: 8, label: "Saúde" },
  { category: "objetivos", percent: 15, label: "Metas" },
  { category: "investimentos", percent: 10, label: "Investimentos" },
]

export function suggestBudgetsFromSalary(salary: number) {
  return BUDGET_SUGGESTIONS.map((item) => ({
    ...item,
    suggestedAmount: Math.round((salary * item.percent) / 100),
  }))
}

export function goalViabilityMessage(
  goal: Goal,
  profile: FinancialProfile,
  transactions: Transaction[],
  subscriptions: Subscription[],
  installments: Installment[],
  limits: SpendingLimit[],
): string {
  const progress = goalProgress(goal)
  const planning = buildMonthlyPlanning(profile, transactions, [], subscriptions, installments, limits)
  if (progress.completed) return "Meta concluída."
  if (progress.daysLeft <= 0) return "Prazo vencido. Ajuste data ou valor."
  const monthlyNeeded = progress.remaining / Math.max(1, Math.ceil(progress.daysLeft / 30))
  if (monthlyNeeded <= planning.safeToSpend * 0.5) {
    return `Cabe na renda. Guarde ${progress.estimate}/mês.`
  }
  if (monthlyNeeded <= planning.safeToSpend) {
    return `Dá, mas apertado: ${progress.estimate}/mês · sobram ${money(planning.safeToSpend)}.`
  }
  return `Em risco: faltam ${progress.estimate} · disponível ${money(planning.safeToSpend)}.`
}