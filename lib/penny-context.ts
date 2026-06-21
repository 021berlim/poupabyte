import { getCategory } from "./categories"
import { buildMonthlyPlanning, upcomingSubscriptions, activeSubscriptionsMonthlyTotal } from "./planning"
import {
  financialHealthScore,
  goalProgress,
  investmentAllocationByType,
  investmentSummary,
  limitUsage,
} from "./selectors"
import type {
  FinancialProfile,
  Goal,
  Installment,
  Investment,
  SpendingLimit,
  Subscription,
  Transaction,
} from "./types"

const THREE_MONTHS = 3

type ContextInput = {
  financialProfile: FinancialProfile
  transactions: Transaction[]
  goals: Goal[]
  limits: SpendingLimit[]
  subscriptions: Subscription[]
  installments: Installment[]
  investments: Investment[]
  previousScore?: number
  mentionedAlertKeys?: ReadonlySet<string>
  now?: Date
}

export type PennyAlert = {
  key: string
  type: "exorbitant-expense" | "critical-limit" | "health-drop"
  title: string
  message: string
  impact: string
}

export type AttentionPanelItem = {
  type: "pending-review" | "budget" | "goal-at-risk" | "upcoming-subscription"
  title: string
  message: string
  screen: string
}

export function buildAttentionPanelItem({
  transactions,
  limits,
  goals,
  subscriptions,
  now = new Date(),
}: {
  transactions: Transaction[]
  limits: SpendingLimit[]
  goals: Goal[]
  subscriptions: Subscription[]
  now?: Date
}): AttentionPanelItem | null {
  const pendingReview = transactions.filter((tx) => tx.needsReview || tx.category === "nao-categorizado").length
  if (pendingReview > 0) {
    return {
      type: "pending-review",
      title: "Revisar lançamentos",
      message: `${pendingReview} movimentação(ões) aguardando confirmação`,
      screen: "Movimentações",
    }
  }

  const limitAlerts = limitUsage(limits, transactions, now).filter((item) => item.status !== "healthy")
  if (limitAlerts.length > 0) {
    const item = limitAlerts[0]
    const category = getCategory(item.limit.category).label
    return {
      type: "budget",
      title: `Orçamento de ${category}`,
      message: `${Math.round(item.percent)}% utilizado`,
      screen: "Orçamentos",
    }
  }

  const goalAlerts = goals
    .map((goal) => ({ goal, progress: goalProgress(goal) }))
    .filter((item) => item.progress.atRisk)
  if (goalAlerts.length > 0) {
    const { goal, progress } = goalAlerts[0]
    return {
      type: "goal-at-risk",
      title: `Meta em risco: ${goal.name}`,
      message: `${progress.percent}% concluída`,
      screen: "Objetivos",
    }
  }

  const upcoming = upcomingSubscriptions(subscriptions, 7, now)
  if (upcoming.length > 0) {
    return {
      type: "upcoming-subscription",
      title: "Assinaturas nos próximos 7 dias",
      message: `${upcoming.length} cobrança(s) prevista(s)`,
      screen: "Movimentações",
    }
  }

  return null
}

export type PennyFinancialContext = {
  generatedAt: string
  monthlyPlanning: ReturnType<typeof buildMonthlyPlanning>
  subscriptionMonthlyTotal: number
  upcomingSubscriptions: number
  financialHealth: {
    score: number
    label: string
    previousScore: number
    variation: number
  }
  exorbitantSpending: Array<{
    category: string
    amount: number
    historicalAverage: number
    multipleOfAverage: number
    date: string
  }>
  criticalLimits: Array<{
    category: string
    spent: number
    limit: number
    usagePercent: number
    remaining: number
  }>
  spendingPace: {
    spentUntilToday: number
    historicalAverageUntilSameDay: number
    variationPercent: number
    status: "below" | "in-line" | "above" | "no-history"
  }
  goals: Array<{
    name: string
    target: number
    current: number
    progressPercent: number
    remaining: number
    daysLeft: number
    status: "completed" | "at-risk" | "on-track"
  }>
  investments: {
    totalInvested: number
    currentValue: number
    accumulatedReturn: number
    accumulatedReturnPercent: number
    assetCount: number
    allocationByType: Array<{ type: string; value: number; percent: number }>
  }
  pendingAlerts: PennyAlert[]
}

export type PennyScopedContext = Pick<PennyFinancialContext, "generatedAt"> & {
  scope: string
  monthlyPlanning?: PennyFinancialContext["monthlyPlanning"]
  subscriptionMonthlyTotal?: PennyFinancialContext["subscriptionMonthlyTotal"]
  upcomingSubscriptions?: PennyFinancialContext["upcomingSubscriptions"]
  financialHealth?: PennyFinancialContext["financialHealth"]
  exorbitantSpending?: PennyFinancialContext["exorbitantSpending"]
  criticalLimits?: PennyFinancialContext["criticalLimits"]
  spendingPace?: PennyFinancialContext["spendingPace"]
  goals?: PennyFinancialContext["goals"]
  investments?: PennyFinancialContext["investments"]
  pendingAlerts?: PennyFinancialContext["pendingAlerts"]
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function toDate(value: string): Date {
  return value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value)
}

function isWithin(date: Date, start: Date, end: Date): boolean {
  const time = date.getTime()
  return time >= start.getTime() && time <= end.getTime()
}

function money(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function buildPennyFinancialContext({
  financialProfile,
  transactions,
  goals,
  limits,
  subscriptions,
  installments,
  investments,
  previousScore,
  mentionedAlertKeys = new Set(),
  now = new Date(),
}: ContextInput): PennyFinancialContext {
  const monthlyPlanning = buildMonthlyPlanning(
    financialProfile,
    transactions,
    goals,
    subscriptions,
    installments,
    limits,
    now,
  )
  const currentMonthStart = startOfMonth(now)
  const historyStart = new Date(now.getFullYear(), now.getMonth() - THREE_MONTHS, 1)
  const availableTransactions = transactions.filter((transaction) => toDate(transaction.date) <= now)
  const currentExpenses = availableTransactions.filter(
    (transaction) =>
      transaction.type === "expense" && isWithin(toDate(transaction.date), currentMonthStart, now),
  )
  const historicalExpenses = availableTransactions.filter(
    (transaction) =>
      transaction.type === "expense" && isWithin(toDate(transaction.date), historyStart, new Date(currentMonthStart.getTime() - 1)),
  )

  const historicalByCategory = new Map<string, { total: number; count: number }>()
  for (const transaction of historicalExpenses) {
    const current = historicalByCategory.get(transaction.category) ?? { total: 0, count: 0 }
    historicalByCategory.set(transaction.category, {
      total: current.total + transaction.amount,
      count: current.count + 1,
    })
  }

  const exorbitantWithKeys = currentExpenses.flatMap((transaction) => {
    const history = historicalByCategory.get(transaction.category)
    if (!history?.count) return []
    const average = history.total / history.count
    if (transaction.amount <= average * 2.5) return []
    return [{
      key: `expense:${transaction.id}`,
      category: getCategory(transaction.category).label,
      amount: transaction.amount,
      historicalAverage: average,
      multipleOfAverage: transaction.amount / average,
      date: transaction.date,
    }]
  })

  const currentLimitUsage = limitUsage(limits, availableTransactions, now)
    .filter((item) => item.percent >= 71)
    .sort((a, b) => b.percent - a.percent)

  const health = financialHealthScore(availableTransactions, goals, limits, investments)
  const baselineScore = previousScore ?? health.score
  const scoreVariation = health.score - baselineScore

  const monthlyHistoricalTotals: number[] = []
  for (let monthsAgo = 1; monthsAgo <= THREE_MONTHS; monthsAgo += 1) {
    const reference = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
    const lastDay = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate()
    const comparableEnd = new Date(reference.getFullYear(), reference.getMonth(), Math.min(now.getDate(), lastDay), 23, 59, 59, 999)
    monthlyHistoricalTotals.push(
      historicalExpenses
        .filter((transaction) => {
          const date = toDate(transaction.date)
          return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth() && date <= comparableEnd
        })
        .reduce((total, transaction) => total + transaction.amount, 0),
    )
  }
  const historicalMonthsWithData = monthlyHistoricalTotals.filter((total) => total > 0)
  const historicalPaceAverage = historicalMonthsWithData.length
    ? historicalMonthsWithData.reduce((total, value) => total + value, 0) / historicalMonthsWithData.length
    : 0
  const currentPace = currentExpenses.reduce((total, transaction) => total + transaction.amount, 0)
  const paceVariation = historicalPaceAverage > 0
    ? ((currentPace - historicalPaceAverage) / historicalPaceAverage) * 100
    : 0

  const alerts: PennyAlert[] = []
  for (const expense of exorbitantWithKeys) {
    alerts.push({
      key: expense.key,
      type: "exorbitant-expense",
      title: `Gasto fora do padrão em ${expense.category}`,
      message: `Identifiquei um gasto de ${money(expense.amount)} em ${expense.category}, equivalente a ${expense.multipleOfAverage.toFixed(1)} vezes a sua média histórica nessa categoria.`,
      impact: `A média dos últimos três meses é ${money(expense.historicalAverage)}.`,
    })
  }
  for (const usage of currentLimitUsage) {
    const category = getCategory(usage.limit.category).label
    const severity = usage.percent >= 100 ? "exceeded" : "critical"
    alerts.push({
      key: `limit:${usage.limit.category}:${monthKey(now)}:${severity}`,
      type: "critical-limit",
      title: `Orçamento crítico em ${category}`,
      message: `Seu uso em ${category} chegou a ${usage.percent.toFixed(0)}% do orçamento mensal.`,
      impact: usage.remaining >= 0
        ? `Restam ${money(usage.remaining)} no orçamento. Sugestão: até ${money(usage.dailySuggestion)} por dia.`
        : `O orçamento foi estourado em ${money(Math.abs(usage.remaining))}.`,
    })
  }
  if (scoreVariation < -5) {
    alerts.push({
      key: `health:${baselineScore}:${health.score}`,
      type: "health-drop",
      title: "Queda relevante na saúde financeira",
      message: `Sua saúde financeira caiu de ${baselineScore} para ${health.score} pontos.`,
      impact: `A variação registrada foi de ${scoreVariation} pontos.`,
    })
  }

  const investmentStats = investmentSummary(investments)
  return {
    generatedAt: now.toISOString(),
    monthlyPlanning,
    subscriptionMonthlyTotal: activeSubscriptionsMonthlyTotal(subscriptions),
    upcomingSubscriptions: upcomingSubscriptions(subscriptions, 7, now).length,
    financialHealth: {
      score: health.score,
      label: health.label,
      previousScore: baselineScore,
      variation: scoreVariation,
    },
    exorbitantSpending: exorbitantWithKeys.map(({ key: _key, ...expense }) => expense),
    criticalLimits: currentLimitUsage.map((item) => ({
      category: getCategory(item.limit.category).label,
      spent: item.spent,
      limit: item.limit.amount,
      usagePercent: item.percent,
      remaining: item.remaining,
    })),
    spendingPace: {
      spentUntilToday: currentPace,
      historicalAverageUntilSameDay: historicalPaceAverage,
      variationPercent: paceVariation,
      status: historicalPaceAverage === 0
        ? "no-history"
        : paceVariation > 5
          ? "above"
          : paceVariation < -5
            ? "below"
            : "in-line",
    },
    goals: goals.map((goal) => {
      const progress = goalProgress(goal)
      return {
        name: goal.name,
        target: goal.target,
        current: goal.current,
        progressPercent: progress.percent,
        remaining: progress.remaining,
        daysLeft: progress.daysLeft,
        status: progress.completed ? "completed" : progress.atRisk ? "at-risk" : "on-track",
      }
    }),
    investments: {
      totalInvested: investmentStats.totalInvested,
      currentValue: investmentStats.currentValue,
      accumulatedReturn: investmentStats.accumulatedReturn,
      accumulatedReturnPercent: investmentStats.accumulatedReturnPercent,
      assetCount: investmentStats.assetCount,
      allocationByType: investmentAllocationByType(investments).map((item) => ({
        type: item.label,
        value: item.value,
        percent: item.percent,
      })),
    },
    pendingAlerts: alerts.filter((alert) => !mentionedAlertKeys.has(alert.key)),
  }
}

export function proactivePennyMessage(alert: PennyAlert): string {
  return `${alert.message} ${alert.impact} Deseja que eu analise como isso afeta o restante do seu mês?`
}

function normalizedQuestion(question: string): string {
  return question
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

export function selectPennyContextForQuestion(
  context: PennyFinancialContext,
  question: string,
): PennyScopedContext {
  const query = normalizedQuestion(question)
  const matches = (pattern: RegExp) => pattern.test(query)
  const broad = matches(/\b(resumo geral|visao geral|panorama|situacao financeira|minhas financas|tudo)\b/)
  const asksPlanning = broad || matches(/\b(salario|salário|orcamento|orçamento|sobra|disponivel|disponível|quanto posso gastar|planejamento|assinatura|parcela)\b/)
  const asksBalance = asksPlanning || matches(/\b(saldo|dinheiro disponivel|patrimonio)\b/)
  const asksHealth = broad || matches(/\b(score|saude financeira|pontuacao|como estou)\b/)
  const asksSpending = broad || matches(/\b(gasto|gastos|despesa|despesas|economizar|economia|cortar|reduzir|consumo|ritmo|padrao)\b/)
  const asksLimits = broad || asksSpending || matches(/\b(limite|limites|orcamento|categoria)\b/)
  const asksGoals = broad || matches(/\b(meta|metas|objetivo|objetivos|reserva|viagem|progresso)\b/)
  const asksInvestments = broad || matches(/\b(invest|investimento|investimentos|carteira|aporte|aportes|dividendo|dividendos|renda passiva|rentabilidade|retorno|diversific|ativo|ativos)\b/)
  const asksInvestmentCapacity = asksInvestments && matches(/\b(quanto|posso|devo|capacidade|organizar|antes)\b/)

  const selected: PennyScopedContext = {
    generatedAt: context.generatedAt,
    scope: "Somente os dados relacionados à pergunta mais recente foram incluídos.",
  }

  if (broad) {
    return {
      ...selected,
      monthlyPlanning: context.monthlyPlanning,
      subscriptionMonthlyTotal: context.subscriptionMonthlyTotal,
      upcomingSubscriptions: context.upcomingSubscriptions,
      financialHealth: context.financialHealth,
      exorbitantSpending: context.exorbitantSpending,
      criticalLimits: context.criticalLimits,
      spendingPace: context.spendingPace,
      goals: context.goals,
      investments: context.investments,
      pendingAlerts: context.pendingAlerts,
    }
  }

  if (asksPlanning || asksBalance || asksHealth || asksInvestmentCapacity) {
    selected.monthlyPlanning = context.monthlyPlanning
    selected.subscriptionMonthlyTotal = context.subscriptionMonthlyTotal
    selected.upcomingSubscriptions = context.upcomingSubscriptions
  }
  if (asksHealth || asksInvestmentCapacity) selected.financialHealth = context.financialHealth
  if (asksSpending) {
    selected.exorbitantSpending = context.exorbitantSpending
    selected.spendingPace = context.spendingPace
  }
  if (asksLimits || asksHealth || asksInvestmentCapacity) selected.criticalLimits = context.criticalLimits
  if (asksGoals || asksHealth || asksInvestmentCapacity) selected.goals = context.goals
  if (asksInvestments) selected.investments = context.investments

  const relevantAlertTypes = new Set<PennyAlert["type"]>()
  if (asksSpending) relevantAlertTypes.add("exorbitant-expense")
  if (asksLimits || asksHealth || asksInvestmentCapacity) relevantAlertTypes.add("critical-limit")
  if (asksHealth || asksInvestmentCapacity) relevantAlertTypes.add("health-drop")
  const relevantAlerts = context.pendingAlerts.filter((alert) => relevantAlertTypes.has(alert.type))
  if (relevantAlerts.length) selected.pendingAlerts = relevantAlerts

  return selected
}
