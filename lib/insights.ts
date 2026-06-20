import { getCategory } from "./categories"
import { expenseBySubcategory, type CategoryContext } from "./category-system"
import { getDeclaredSalaryForMonth } from "./income"
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
): AnalysisInsight[] {
  const insights: AnalysisInsight[] = []
  const planning = buildMonthlyPlanning(profile, transactions, goals, subscriptions, installments, limits, ref)
  const monthTxs = transactions.filter((tx) => tx.date.slice(0, 7) === `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`)
  const summary = transactionSummary(monthTxs)
  const categories = expenseByCategory(monthTxs, ref)
  const declared = getDeclaredSalaryForMonth(profile, ref)

  if (categories[0]) {
    const share = percentOf(categories[0].total, summary.expense)
    insights.push({
      id: "top-category",
      title: "Categoria que mais consumiu",
      message: `${categories[0].label} representa ${share.toFixed(0)}% das despesas do mês atual.`,
      tone: share >= 40 ? "warning" : "neutral",
    })
  }

  if (declared > 0) {
    insights.push({
      id: "salary-committed",
      title: "Renda comprometida",
      message: `Com salário declarado de ${declared.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, suas despesas confirmadas representam ${planning.monthCommittedPercent.toFixed(0)}% da renda.`,
      tone: planning.monthCommittedPercent >= 90 ? "critical" : planning.monthCommittedPercent >= 71 ? "warning" : "positive",
    })
  }

  const series = monthlySeries(transactions, 6)
  const best = [...series].sort((a, b) => b.balance - a.balance)[0]
  const worst = [...series].sort((a, b) => a.balance - b.balance)[0]
  if (best && best.balance > 0) {
    insights.push({
      id: "best-month",
      title: "Melhor mês recente",
      message: `${best.label} teve o maior resultado positivo: ${best.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      tone: "positive",
    })
  }
  if (worst && worst.balance < 0) {
    insights.push({
      id: "worst-month",
      title: "Mês mais apertado",
      message: `${worst.label} foi o período com maior déficit: ${Math.abs(worst.balance).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      tone: "warning",
    })
  }

  const fixed = monthTxs.filter((tx) => tx.isFixed || tx.isSubscription || tx.isRecurring).reduce((acc, tx) => acc + (tx.type === "expense" ? tx.amount : 0), 0)
  const variable = summary.expense - fixed
  if (summary.expense > 0) {
    insights.push({
      id: "fixed-vs-variable",
      title: "Fixos vs variáveis",
      message: `Despesas fixas: ${fixed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (${percentOf(fixed, summary.expense).toFixed(0)}%). Variáveis: ${variable.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      tone: "neutral",
    })
  }

  const atRiskGoals = goals.filter((g) => goalProgress(g).atRisk)
  if (atRiskGoals.length) {
    insights.push({
      id: "goals-at-risk",
      title: "Objetivos em risco",
      message: `${atRiskGoals.length} objetivo(s) precisam de atenção: ${atRiskGoals.map((g) => g.name).join(", ")}.`,
      tone: "warning",
    })
  }

  if (planning.projectedSavings < 0) {
    insights.push({
      id: "negative-projection",
      title: "Projeção negativa",
      message: `Você deve terminar o mês com déficit de ${Math.abs(planning.projectedSavings).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} se mantiver o ritmo atual.`,
      tone: "critical",
    })
  } else if (planning.daysLeft > 0) {
    insights.push({
      id: "month-projection",
      title: "Projeção de fim do mês",
      message: `Você deve terminar o mês com ${planning.projectedSavings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} se mantiver o ritmo atual.`,
      tone: "positive",
    })
  }

  const extra = planning.receivedIncome - planning.declaredSalary
  if (extra > 100) {
    insights.push({
      id: "extra-income",
      title: "Renda extra detectada",
      message: `Renda extra de ${extra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} melhorou o mês, mas não deve ser tratada como recorrente para compromissos longos.`,
      tone: "warning",
    })
  }

  const longTerm = buildLongTermPlanning(profile, transactions, goals, subscriptions, installments, limits, ref)
  insights.push({
    id: "safe-margin",
    title: "Margem segura",
    message: `Para decisões longas, sua margem segura com base no salário fixo de ${longTerm.fixedSalary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} é de ${longTerm.safeMargin.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    tone: longTerm.safeMargin < 500 ? "warning" : "neutral",
  })

  if (longTerm.fixedExpensesPercent >= 75) {
    insights.push({
      id: "fixed-expenses-high",
      title: "Compromissos fixos elevados",
      message: `Despesas fixas comprometem ${longTerm.fixedExpensesPercent.toFixed(0)}% do salário fixo.`,
      tone: "warning",
    })
  }

  const ctx: CategoryContext = { userCategories, hiddenSystemCategories }
  const subcategories = expenseBySubcategory(monthTxs, ctx, ref)
  if (subcategories[0]) {
    const parentShare = categories[0] ? percentOf(subcategories[0].total, categories[0].total) : 0
    insights.push({
      id: "top-subcategory",
      title: "Subcategoria em destaque",
      message: `${subcategories[0].label} dentro de ${subcategories[0].parentLabel} representa ${parentShare.toFixed(0)}% da categoria neste mês.`,
      tone: parentShare >= 40 ? "warning" : "neutral",
    })
  }

  const moradia = categories.find((c) => c.category === "moradia")
  if (moradia && declared > 0) {
    const moradiaShare = percentOf(moradia.total, declared)
    if (moradiaShare > 35) {
      insights.push({
        id: "moradia-high",
        title: "Moradia acima do ideal",
        message: `Moradia representa ${moradiaShare.toFixed(0)}% do salário fixo — acima do ideal de 30%.`,
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
  { category: "objetivos", percent: 15, label: "Objetivos" },
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
  if (progress.completed) return "Objetivo concluído."
  if (progress.daysLeft <= 0) return "Prazo vencido — revise a data ou o valor mensal."
  const monthlyNeeded = progress.remaining / Math.max(1, Math.ceil(progress.daysLeft / 30))
  if (monthlyNeeded <= planning.safeToSpend * 0.5) {
    return `Com sua renda atual, esse objetivo é viável. Guarde ${progress.estimate}.`
  }
  if (monthlyNeeded <= planning.safeToSpend) {
    return `Viável, mas apertado. Você precisa de ${progress.estimate} e ainda pode gastar ${planning.safeToSpend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} no mês.`
  }
  return `Com a renda atual, esse objetivo está em risco. Faltam ${progress.estimate} e o disponível mensal é ${planning.safeToSpend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
}