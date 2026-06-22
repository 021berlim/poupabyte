import { getCategory } from "./categories"
import { buildAnalysisInsights, type AnalysisInsight } from "./insights"
import { getDashboardFocus } from "./onboarding-personalization"
import { buildMonthlyPlanning } from "./planning"
import { goalProgress, limitUsage } from "./selectors"
import type {
  FinancialProfile,
  Goal,
  Installment,
  SpendingLimit,
  Subscription,
  Transaction,
  UserCategory,
  CategoryId,
} from "./types"

export const SHORT_HINT_MAX = 48

import { PAGE_SUBTITLES, PENNY_STARTER_SUGGESTIONS } from "./copy"

export { PAGE_SUBTITLES, PENNY_STARTER_SUGGESTIONS }

const SHORT_INSIGHT_HINTS: Record<string, string> = {
  "top-category": "Maior gasto do mês.",
  "salary-committed": "Parte da renda já tem destino.",
  "best-month": "Melhor mês recente.",
  "worst-month": "Mês mais apertado.",
  "fixed-vs-variable": "Fixos e variáveis do mês.",
  "goals-at-risk": "Metas precisam de atenção.",
  "negative-projection": "O mês pode fechar no negativo.",
  "month-projection": "O mês deve fechar no positivo.",
  "extra-income": "Entrada extra neste mês.",
  "safe-margin": "Quanto ainda pode comprometer.",
  "fixed-expenses-high": "Compromissos fixos pesando na renda.",
  "top-subcategory": "Subcategoria em destaque.",
  "moradia-high": "Moradia acima de 30% da renda.",
}

export type DashboardSuggestion = {
  id: string
  title: string
  hint: string
  long: boolean
}

export function shortInsightHint(insight: AnalysisInsight): DashboardSuggestion {
  const long = insight.message.length > SHORT_HINT_MAX
  return {
    id: insight.id,
    title: insight.title,
    hint: long
      ? (SHORT_INSIGHT_HINTS[insight.id] ?? `${insight.title}.`)
      : insight.message,
    long,
  }
}

function pushUnique(suggestions: DashboardSuggestion[], item: DashboardSuggestion) {
  if (suggestions.some((entry) => entry.id === item.id)) return
  suggestions.push(item)
}

export function buildDashboardSuggestions(
  transactions: Transaction[],
  profile: FinancialProfile,
  goals: Goal[],
  limits: SpendingLimit[],
  subscriptions: Subscription[],
  installments: Installment[],
  userCategories: UserCategory[] = [],
  hiddenSystemCategories: CategoryId[] = [],
  ref = new Date(),
  max = 3,
): DashboardSuggestion[] {
  const planning = buildMonthlyPlanning(profile, transactions, goals, subscriptions, installments, limits, ref)
  const focus = getDashboardFocus(profile.objective, profile.budgetWeight, profile.incomeType)
  const suggestions: DashboardSuggestion[] = []

  const pendingReview = transactions.filter((tx) => tx.needsReview || tx.category === "nao-categorizado").length
  if (pendingReview > 0) {
    pushUnique(suggestions, {
      id: "pending-review",
      title: "Revisar lançamentos",
      hint: `${pendingReview} para confirmar ou categorizar.`,
      long: false,
    })
  }

  if (focus.showIncomeTracking) {
    pushUnique(suggestions, {
      id: "track-income",
      title: "Cadastrar entradas",
      hint: "O mês atualiza com cada entrada.",
      long: false,
    })
  }

  if (profile.objective === "entender-gastos") {
    pushUnique(suggestions, {
      id: "track-spending",
      title: "Registrar gastos",
      hint: "Quanto mais você registra, melhor fica sua visão financeira.",
      long: false,
    })
    if (profile.budgetWeight && profile.budgetWeight !== "nao-sei") {
      pushUnique(suggestions, {
        id: "focus-category",
        title: `Olhe ${getCategory(profile.budgetWeight).label.toLowerCase()}`,
        hint: "Pesa mais no seu mês.",
        long: false,
      })
    }
  }

  if (profile.objective === "controlar-gastos" && planning.safeToSpend > 0) {
    pushUnique(suggestions, {
      id: "safe-to-spend",
      title: "Saldo disponível",
      hint: `${planning.safeToSpend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} disponíveis.`,
      long: false,
    })
  }

  const limitAlerts = limitUsage(limits, transactions).filter((item) => item.status !== "healthy")
  if (focus.showLimitsProminent && limitAlerts.length > 0) {
    pushUnique(suggestions, {
      id: "limit-alerts",
      title: "Limites em atenção",
      hint: `${limitAlerts.length} limite(s) no teto.`,
      long: false,
    })
  }

  if (profile.objective === "sair-dividas" && planning.monthCommittedPercent > 0) {
    pushUnique(suggestions, {
      id: "salary-committed",
      title: "Renda com destino",
      hint: `${Math.round(planning.monthCommittedPercent)}% da renda já tem destino.`,
      long: false,
    })
  }

  if (focus.showReserveSplit && profile.monthlyReserve > 0) {
    pushUnique(suggestions, {
      id: "monthly-reserve",
      title: "Reserva do mês",
      hint: `Guarde ${profile.monthlyReserve.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      long: false,
    })
  }

  const atRiskGoals = goals.filter((goal) => goalProgress(goal).atRisk)
  if (profile.objective === "planejar-metas" && atRiskGoals.length > 0) {
    pushUnique(suggestions, {
      id: "goals-at-risk",
      title: "Metas em risco",
      hint: `${atRiskGoals.length} meta(s) precisam de ajuste.`,
      long: false,
    })
  }

  const insights = buildAnalysisInsights(
    transactions,
    profile,
    goals,
    limits,
    subscriptions,
    installments,
    ref,
    userCategories,
    hiddenSystemCategories,
  )

  for (const insight of insights) {
    pushUnique(suggestions, shortInsightHint(insight))
    if (suggestions.length >= max) break
  }

  return suggestions.slice(0, max)
}

export function buildPennyStarterSuggestions(
  transactions: Transaction[],
  profile: FinancialProfile,
  goals: Goal[],
  limits: SpendingLimit[],
  subscriptions: Subscription[],
  installments: Installment[],
  ref = new Date(),
): string[] {
  const planning = buildMonthlyPlanning(profile, transactions, goals, subscriptions, installments, limits, ref)
  const pendingReview = transactions.filter((tx) => tx.needsReview || tx.category === "nao-categorizado").length
  const limitAlerts = limitUsage(limits, transactions).filter((item) => item.status !== "healthy")

  const monthExpenses = transactions.filter(
    (tx) =>
      tx.type === "expense" &&
      new Date(tx.date).getMonth() === ref.getMonth() &&
      new Date(tx.date).getFullYear() === ref.getFullYear(),
  )
  const spentByCategory = new Map<string, number>()
  for (const tx of monthExpenses) {
    spentByCategory.set(tx.category, (spentByCategory.get(tx.category) ?? 0) + tx.amount)
  }
  const topCategory = [...spentByCategory.entries()].sort((a, b) => b[1] - a[1])[0]

  const candidates: string[] = []

  if (pendingReview > 0) {
    candidates.push("O que falta revisar?")
  }
  if (planning.safeToSpend > 0) {
    candidates.push("Quanto ainda posso gastar?")
  }
  if (topCategory) {
    candidates.push("Onde gastei mais este mês?")
  }
  if (limitAlerts.length > 0) {
    candidates.push("Quais limites estão no limite?")
  }
  if (subscriptions.length > 0) {
    candidates.push("Quais assinaturas pesam no mês?")
  }
  if (goals.length > 0) {
    candidates.push("Minha meta cabe na renda?")
  }

  for (const fallback of PENNY_STARTER_SUGGESTIONS) {
    if (!candidates.includes(fallback)) candidates.push(fallback)
  }

  return candidates.slice(0, 3)
}

export function shortGoalViabilityMessage(fullMessage: string): string {
  if (fullMessage.startsWith("Cabe na renda")) return "Cabe na renda."
  if (fullMessage.startsWith("Dá, mas apertado")) return "Dá, mas apertado."
  if (fullMessage.startsWith("Em risco")) return "Em risco com a renda."
  if (fullMessage.startsWith("Prazo vencido")) return "Prazo vencido. Ajuste a meta."
  if (fullMessage.startsWith("Meta concluída")) return "Meta concluída."
  return fullMessage
}