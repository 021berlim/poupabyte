import { buildAnalysisInsights, type AnalysisInsight } from "./insights"
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

export const PAGE_SUBTITLES = {
  transactions: "Busque, filtre e revise lançamentos.",
  cashflow: "Realizado, previsto e projeção do mês.",
  goals: "Metas conectadas à sua renda mensal.",
  limits: "Orçamento mensal por categoria.",
  investments: "Reservas, investimentos e evolução.",
  reports: "Gráficos e leituras do seu período.",
  categories: "Organize receitas e despesas.",
  assistant: "Pergunte sobre planejamento, metas e orçamentos.",
  profile: "Conta, preferências e privacidade.",
} as const

/** Perguntas iniciais na P.E.N.N.Y. — textos longos e orientações detalhadas */
export const PENNY_STARTER_SUGGESTIONS = [
  "Quanto ainda posso gastar este mês?",
  "Como está minha saúde financeira este mês?",
  "Onde posso reduzir gastos?",
  "Quais assinaturas estão pesando no orçamento?",
  "O que já aconteceu no mês e pra onde ele está indo?",
  "Como usar orçamentos com base no meu salário fixo?",
  "Por que renda extra não entra em decisões de longo prazo?",
  "Como funcionam categorias padrão e personalizadas?",
  "O que significam as interpretações dos meus relatórios?",
  "Minha meta financeira é viável com minha renda atual?",
  "Qual a margem segura para decisões de longo prazo?",
  "Como reservas e investimentos se encaixam no planejamento?",
  "Como importar e revisar um extrato em PDF?",
] as const

const SHORT_INSIGHT_HINTS: Record<string, string> = {
  "top-category": "Categoria líder nas despesas do mês.",
  "salary-committed": "Parte da renda já está comprometida.",
  "best-month": "Melhor resultado recente identificado.",
  "worst-month": "Mês mais apertado no período recente.",
  "fixed-vs-variable": "Compare gastos fixos e variáveis.",
  "goals-at-risk": "Há metas que precisam de atenção.",
  "negative-projection": "Risco de déficit no fim do mês.",
  "month-projection": "Projeção positiva para o fim do mês.",
  "extra-income": "Renda extra detectada neste mês.",
  "safe-margin": "Margem segura para decisões longas.",
  "fixed-expenses-high": "Compromissos fixos estão elevados.",
  "top-subcategory": "Subcategoria em destaque no mês.",
  "moradia-high": "Moradia acima do ideal de 30%.",
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
  max = 6,
): DashboardSuggestion[] {
  const planning = buildMonthlyPlanning(profile, transactions, goals, subscriptions, installments, limits, ref)
  const suggestions: DashboardSuggestion[] = []

  if (planning.safeToSpend > 0) {
    suggestions.push({
      id: "safe-to-spend",
      title: "Disponível para gastar",
      hint: `Ainda pode gastar ${planning.safeToSpend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      long: false,
    })
  }

  const limitAlerts = limitUsage(limits, transactions).filter((item) => item.status !== "healthy")
  if (limitAlerts.length > 0) {
    suggestions.push({
      id: "limit-alerts",
      title: "Orçamentos em atenção",
      hint: `${limitAlerts.length} categoria(s) perto ou acima do limite.`,
      long: false,
    })
  }

  const atRiskGoals = goals.filter((goal) => goalProgress(goal).atRisk)
  if (atRiskGoals.length > 0) {
    suggestions.push({
      id: "goals-at-risk",
      title: "Metas em risco",
      hint: `${atRiskGoals.length} meta(s) precisam de ajuste.`,
      long: false,
    })
  }

  const pendingReview = transactions.filter((tx) => tx.needsReview || tx.category === "nao-categorizado").length
  if (pendingReview > 0) {
    suggestions.push({
      id: "pending-review",
      title: "Lançamentos para revisar",
      hint: `${pendingReview} movimentação(ões) aguardando confirmação.`,
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
    if (suggestions.some((item) => item.id === insight.id)) continue
    suggestions.push(shortInsightHint(insight))
    if (suggestions.length >= max) break
  }

  return suggestions.slice(0, max)
}

export function shortGoalViabilityMessage(fullMessage: string): string {
  if (fullMessage.startsWith("Com sua renda atual, esse objetivo é viável")) return "Viável com sua renda atual."
  if (fullMessage.startsWith("Viável, mas apertado")) return "Viável, mas apertado."
  if (fullMessage.startsWith("Com a renda atual, esse objetivo está em risco")) return "Em risco com a renda atual."
  if (fullMessage.startsWith("Prazo vencido")) return "Prazo vencido — revise a meta."
  return fullMessage
}