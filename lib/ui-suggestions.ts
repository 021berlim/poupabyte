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

export const PAGE_SUBTITLES = {
  transactions: "Revise e organize seus lançamentos.",
  cashflow: "Veja como o mês está indo.",
  goals: "Defina metas e acompanhe o progresso.",
  limits: "Controle quanto gastar por categoria.",
  investments: "Acompanhe o que você já guardou.",
  reports: "Entenda para onde vai seu dinheiro.",
  categories: "Organize como você classifica gastos.",
  assistant: "Tire dúvidas sobre suas finanças.",
  profile: "Conta e preferências.",
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
  "Minha reserva de emergência cobre quantos meses?",
  "Meus gastos se comparam ao método 50/30/20?",
  "Esse período costuma ser mais caro pra mim?",
  "Tenho dinheiro parado sem destino?",
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
  const focus = getDashboardFocus(profile.objective, profile.budgetWeight)
  const suggestions: DashboardSuggestion[] = []

  const pendingReview = transactions.filter((tx) => tx.needsReview || tx.category === "nao-categorizado").length
  if (pendingReview > 0) {
    pushUnique(suggestions, {
      id: "pending-review",
      title: "Lançamentos para revisar",
      hint: `${pendingReview} movimentação(ões) aguardando confirmação.`,
      long: false,
    })
  }

  if (profile.objective === "entender-gastos") {
    pushUnique(suggestions, {
      id: "track-spending",
      title: "Registre seus gastos",
      hint: "Quanto mais lançamentos, melhor a visão por categoria.",
      long: false,
    })
    if (profile.budgetWeight && profile.budgetWeight !== "nao-sei") {
      pushUnique(suggestions, {
        id: "focus-category",
        title: `Acompanhe ${getCategory(profile.budgetWeight).label.toLowerCase()}`,
        hint: "Essa categoria pesa no seu orçamento — vale observar de perto.",
        long: false,
      })
    }
  }

  if (profile.objective === "controlar-gastos" && planning.safeToSpend > 0) {
    pushUnique(suggestions, {
      id: "safe-to-spend",
      title: "Disponível para gastar",
      hint: `Ainda pode gastar ${planning.safeToSpend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      long: false,
    })
  }

  const limitAlerts = limitUsage(limits, transactions).filter((item) => item.status !== "healthy")
  if (focus.showLimitsProminent && limitAlerts.length > 0) {
    pushUnique(suggestions, {
      id: "limit-alerts",
      title: "Orçamentos em atenção",
      hint: `${limitAlerts.length} categoria(s) perto ou acima do limite.`,
      long: false,
    })
  }

  if (profile.objective === "sair-dividas" && planning.monthCommittedPercent > 0) {
    pushUnique(suggestions, {
      id: "salary-committed",
      title: "Renda comprometida",
      hint: `${Math.round(planning.monthCommittedPercent)}% da renda já tem destino neste mês.`,
      long: false,
    })
  }

  if (focus.showReserveSplit && profile.monthlyReserve > 0) {
    pushUnique(suggestions, {
      id: "monthly-reserve",
      title: "Reserva mensal sugerida",
      hint: `Separe ${profile.monthlyReserve.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} para guardar.`,
      long: false,
    })
  }

  const atRiskGoals = goals.filter((goal) => goalProgress(goal).atRisk)
  if (profile.objective === "planejar-metas" && atRiskGoals.length > 0) {
    pushUnique(suggestions, {
      id: "goals-at-risk",
      title: "Metas em risco",
      hint: `${atRiskGoals.length} meta(s) precisam de ajuste de prazo ou valor.`,
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
    candidates.push("Quais lançamentos ainda preciso revisar?")
  }
  if (planning.safeToSpend > 0) {
    candidates.push("Quanto ainda posso gastar este mês?")
  }
  if (topCategory) {
    candidates.push("Onde estou gastando mais este mês?")
  }
  if (limitAlerts.length > 0) {
    candidates.push("Quais orçamentos estão perto do limite?")
  }
  if (subscriptions.length > 0) {
    candidates.push("Quais assinaturas estão pesando no orçamento?")
  }
  if (goals.length > 0) {
    candidates.push("Minha meta financeira é viável com minha renda atual?")
  }

  for (const fallback of PENNY_STARTER_SUGGESTIONS) {
    if (!candidates.includes(fallback)) candidates.push(fallback)
  }

  return candidates.slice(0, 3)
}

export function shortGoalViabilityMessage(fullMessage: string): string {
  if (fullMessage.startsWith("Com sua renda atual, esse objetivo é viável")) return "Viável com sua renda atual."
  if (fullMessage.startsWith("Viável, mas apertado")) return "Viável, mas apertado."
  if (fullMessage.startsWith("Com a renda atual, esse objetivo está em risco")) return "Em risco com a renda atual."
  if (fullMessage.startsWith("Prazo vencido")) return "Prazo vencido — revise a meta."
  return fullMessage
}