import { ESSENTIAL_CATEGORY_IDS, getCategory } from "./categories"
import { buildLongTermPlanning } from "./long-term-planning"
import { buildMonthlyPlanning, monthExpenses } from "./planning"
import {
  investmentSummary,
  monthlySeries,
  totalBalance,
} from "./selectors"
import type {
  FinancialProfile,
  Goal,
  Installment,
  Investment,
  InvestmentType,
  SpendingLimit,
  Subscription,
  Transaction,
} from "./types"

const LIQUID_INVESTMENT_TYPES: InvestmentType[] = ["poupanca", "cdb", "tesouro-direto"]
const NEEDS_CATEGORY_IDS = new Set([
  ...ESSENTIAL_CATEGORY_IDS,
  "assinaturas",
  "impostos-e-taxas",
  "dividas",
])
const WANTS_CATEGORY_IDS = new Set([
  "lazer",
  "compras",
  "familia",
  "pets",
  "cuidados-pessoais",
  "outros-gastos",
])
const SAVINGS_CATEGORY_IDS = new Set([
  "aportes",
  "investimentos",
  "objetivos",
  "reserva-emergencia",
])

const SEASONAL_EVENTS: Array<{
  months: number[]
  kind: "income" | "expense" | "both"
  label: string
  note: string
}> = [
  {
    months: [11],
    kind: "income",
    label: "13º salário",
    note: "Dezembro costuma trazer 13º salário.",
  },
  {
    months: [2, 3],
    kind: "both",
    label: "Imposto de Renda",
    note: "Março e abril: restituição ou pagamento de IR.",
  },
  {
    months: [10, 11, 0],
    kind: "expense",
    label: "Datas comemorativas",
    note: "Nov, dez e jan costumam elevar gastos.",
  },
]

export type EmergencyReserveStatus = "short" | "adequate" | "comfortable" | "unknown"

export type EmergencyReserveAnalysis = {
  savedAmount: number
  liquidReserveAmount: number
  goalReserveAmount: number
  averageEssentialExpenses: number
  monthsCovered: number | null
  status: EmergencyReserveStatus
  referenceRangeMonths: { min: number; max: number }
  methodology: string
}

export type BudgetLensBucket = {
  id: "needs" | "wants" | "savings" | "other"
  label: string
  amount: number
  percentOfIncome: number
  referencePercent: number
  categories: string[]
}

export type BudgetLensAnalysis = {
  incomeBase: number
  incomeLabel: string
  buckets: BudgetLensBucket[]
  methodology: string
  disclaimer: string
}

export type SeasonalitySignal = {
  kind: "historical-spike" | "calendar-event" | "income-spike"
  title: string
  message: string
  month?: number
  monthLabel?: string
}

export type SeasonalityAnalysis = {
  signals: SeasonalitySignal[]
  monthlyExpenseAverage: number
  monthsAnalyzed: number
  methodology: string
}

export type IdleMoneyAnalysis = {
  detected: boolean
  idleBalanceEstimate: number
  monthsWithHighBalance: number
  recentSavingsContributions: number
  message: string
  methodology: string
}

export type DebtStrategyEducation = {
  available: false
  reason: string
  strategies: Array<{ id: "avalanche" | "snowball"; label: string; summary: string }>
  nextStep: string
}

export type FinancialGuidanceSnapshot = {
  generatedAt: string
  emergencyReserve: EmergencyReserveAnalysis
  budgetLens: BudgetLensAnalysis
  seasonality: SeasonalityAnalysis
  idleMoney: IdleMoneyAnalysis
  debtStrategies: DebtStrategyEducation
}

type GuidanceInput = {
  profile: FinancialProfile
  transactions: Transaction[]
  goals: Goal[]
  limits: SpendingLimit[]
  subscriptions: Subscription[]
  installments: Installment[]
  investments: Investment[]
  ref?: Date
}

function monthKey(ref: Date): string {
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`
}

function monthExpensesForEssentials(transactions: Transaction[], ref: Date): number {
  const key = monthKey(ref)
  return transactions
    .filter(
      (tx) =>
        tx.type === "expense" &&
        tx.date.slice(0, 7) === key &&
        ESSENTIAL_CATEGORY_IDS.includes(tx.category as (typeof ESSENTIAL_CATEGORY_IDS)[number]),
    )
    .reduce((total, tx) => total + tx.amount, 0)
}

function computeAverageEssentialExpenses(transactions: Transaction[], ref: Date, months = 6): number {
  const values: number[] = []
  for (let offset = 0; offset < months; offset += 1) {
    const reference = new Date(ref.getFullYear(), ref.getMonth() - offset, 1)
    const fromTx = monthExpensesForEssentials(transactions, reference)
    if (fromTx > 0) values.push(fromTx)
  }

  if (values.length > 0) {
    return values.reduce((total, value) => total + value, 0) / values.length
  }

  return monthExpenses(transactions, ref) * 0.45
}

function isEmergencyGoal(goal: Goal): boolean {
  return /reserva|emerg/i.test(goal.name)
}

export function analyzeEmergencyReserve({
  profile,
  transactions,
  goals,
  limits,
  subscriptions,
  installments,
  investments,
  ref = new Date(),
}: GuidanceInput): EmergencyReserveAnalysis {
  const longTerm = buildLongTermPlanning(
    profile,
    transactions,
    goals,
    subscriptions,
    installments,
    limits,
    ref,
  )
  const liquidReserveAmount = investments
    .filter((item) => LIQUID_INVESTMENT_TYPES.includes(item.type))
    .reduce((total, item) => total + item.currentValue, 0)
  const goalReserveAmount = goals
    .filter((goal) => isEmergencyGoal(goal) || profile.objective === "reserva-emergencia")
    .reduce((total, goal) => total + goal.current, 0)
  const savedAmount = liquidReserveAmount + goalReserveAmount
  const averageEssentialExpenses = Math.max(
    computeAverageEssentialExpenses(transactions, ref),
    longTerm.essentialExpenses,
  )

  const monthsCovered =
    averageEssentialExpenses > 0 ? Number((savedAmount / averageEssentialExpenses).toFixed(1)) : null

  let status: EmergencyReserveStatus = "unknown"
  if (monthsCovered !== null) {
    if (monthsCovered < 3) status = "short"
    else if (monthsCovered <= 6) status = "adequate"
    else status = "comfortable"
  }

  return {
    savedAmount,
    liquidReserveAmount,
    goalReserveAmount,
    averageEssentialExpenses,
    monthsCovered,
    status,
    referenceRangeMonths: { min: 3, max: 6 },
    methodology: "Reserva ÷ média de gastos essenciais (últimos meses).",
  }
}

export function analyzeBudgetLens503020({
  profile,
  transactions,
  goals,
  limits,
  subscriptions,
  installments,
  ref = new Date(),
}: GuidanceInput): BudgetLensAnalysis {
  const planning = buildMonthlyPlanning(
    profile,
    transactions,
    goals,
    subscriptions,
    installments,
    limits,
    ref,
  )
  const monthTxs = transactions.filter((tx) => tx.date.slice(0, 7) === monthKey(ref))
  const incomeBase = Math.max(planning.monthlyIncome, planning.declaredSalary)

  const bucketTotals = {
    needs: 0,
    wants: 0,
    savings: 0,
    other: 0,
  }
  const bucketCategories: Record<keyof typeof bucketTotals, string[]> = {
    needs: [],
    wants: [],
    savings: [],
    other: [],
  }

  for (const tx of monthTxs) {
    if (tx.type !== "expense") continue
    const label = getCategory(tx.category).label
    let bucket: keyof typeof bucketTotals = "other"
    if (NEEDS_CATEGORY_IDS.has(tx.category)) bucket = "needs"
    else if (WANTS_CATEGORY_IDS.has(tx.category)) bucket = "wants"
    else if (SAVINGS_CATEGORY_IDS.has(tx.category)) bucket = "savings"

    bucketTotals[bucket] += tx.amount
    if (!bucketCategories[bucket].includes(label)) bucketCategories[bucket].push(label)
  }

  const buckets: BudgetLensBucket[] = [
    {
      id: "needs",
      label: "Gastos essenciais",
      amount: bucketTotals.needs,
      percentOfIncome: incomeBase > 0 ? (bucketTotals.needs / incomeBase) * 100 : 0,
      referencePercent: 50,
      categories: bucketCategories.needs,
    },
    {
      id: "wants",
      label: "Desejos",
      amount: bucketTotals.wants,
      percentOfIncome: incomeBase > 0 ? (bucketTotals.wants / incomeBase) * 100 : 0,
      referencePercent: 30,
      categories: bucketCategories.wants,
    },
    {
      id: "savings",
      label: "Poupança e investimentos",
      amount: bucketTotals.savings,
      percentOfIncome: incomeBase > 0 ? (bucketTotals.savings / incomeBase) * 100 : 0,
      referencePercent: 20,
      categories: bucketCategories.savings,
    },
  ]

  if (bucketTotals.other > 0) {
    buckets.push({
      id: "other",
      label: "Outros gastos",
      amount: bucketTotals.other,
      percentOfIncome: incomeBase > 0 ? (bucketTotals.other / incomeBase) * 100 : 0,
      referencePercent: 0,
      categories: bucketCategories.other,
    })
  }

  return {
    incomeBase,
    incomeLabel: "renda do mês",
    buckets,
    methodology: "Mês atual vs referência 50/30/20.",
    disclaimer:
      "Referência comparativa comum, não regra obrigatória. Sua realidade pode exigir outra divisão.",
  }
}

function monthLabel(month: number): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2026, month, 1))
}

export function analyzeSeasonality({
  transactions,
  ref = new Date(),
}: Pick<GuidanceInput, "transactions" | "ref">): SeasonalityAnalysis {
  const series = monthlySeries(transactions, 12)
  const expenseValues = series.map((item) => item.expense).filter((value) => value > 0)
  const monthlyExpenseAverage =
    expenseValues.length > 0
      ? expenseValues.reduce((total, value) => total + value, 0) / expenseValues.length
      : 0

  const signals: SeasonalitySignal[] = []

  for (const item of series) {
    if (monthlyExpenseAverage > 0 && item.expense >= monthlyExpenseAverage * 1.2) {
      signals.push({
        kind: "historical-spike",
        title: `${item.label} mais caro`,
        message: `+${((item.expense / monthlyExpenseAverage - 1) * 100).toFixed(0)}% acima da média.`,
        month: item.month,
        monthLabel: item.label,
      })
    }
  }

  const incomeByMonth = new Map<number, number[]>()
  for (const item of series) {
    if (item.income <= 0) continue
    const bucket = incomeByMonth.get(item.month) ?? []
    bucket.push(item.income)
    incomeByMonth.set(item.month, bucket)
  }

  for (const [month, incomes] of incomeByMonth) {
    const avgIncome = incomes.reduce((total, value) => total + value, 0) / incomes.length
    const overallIncomeAvg =
      series.filter((item) => item.income > 0).reduce((total, item) => total + item.income, 0) /
      Math.max(1, series.filter((item) => item.income > 0).length)
    if (avgIncome >= overallIncomeAvg * 1.25) {
      signals.push({
        kind: "income-spike",
        title: `${monthLabel(month)} com mais entrada`,
        message: `Renda acima do seu padrão recente.`,
        month,
        monthLabel: monthLabel(month),
      })
    }
  }

  for (const event of SEASONAL_EVENTS) {
    if (!event.months.includes(ref.getMonth())) continue
    const upcoming = event.months.includes(ref.getMonth())
    if (!upcoming) continue
    signals.push({
      kind: "calendar-event",
      title: event.label,
      message: event.note,
      month: ref.getMonth(),
      monthLabel: monthLabel(ref.getMonth()),
    })
  }

  const nextMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 1).getMonth()
  for (const event of SEASONAL_EVENTS) {
    if (!event.months.includes(nextMonth)) continue
    signals.push({
      kind: "calendar-event",
      title: `Próximo: ${event.label}`,
      message: `${event.note} Reserve no mês.`,
      month: nextMonth,
      monthLabel: monthLabel(nextMonth),
    })
  }

  return {
    signals: signals.slice(0, 5),
    monthlyExpenseAverage,
    monthsAnalyzed: series.length,
    methodology: "Histórico de lançamentos e eventos do calendário.",
  }
}

function savingsContributions(transactions: Transaction[], months: number, ref: Date): number {
  let total = 0
  for (let offset = 0; offset < months; offset += 1) {
    const key = monthKey(new Date(ref.getFullYear(), ref.getMonth() - offset, 1))
    total += transactions
      .filter(
        (tx) =>
          tx.type === "expense" &&
          tx.date.slice(0, 7) === key &&
          SAVINGS_CATEGORY_IDS.has(tx.category),
      )
      .reduce((sum, tx) => sum + tx.amount, 0)
  }
  return total
}

export function analyzeIdleMoney({
  profile,
  transactions,
  goals,
  limits,
  subscriptions,
  installments,
  investments,
  ref = new Date(),
}: GuidanceInput): IdleMoneyAnalysis {
  const longTerm = buildLongTermPlanning(
    profile,
    transactions,
    goals,
    subscriptions,
    installments,
    limits,
    ref,
  )
  const balance = totalBalance(transactions)
  const invested = investmentSummary(investments).currentValue
  const essential = longTerm.essentialExpenses
  const recentSavingsContributions = savingsContributions(transactions, 3, ref)
  const series = monthlySeries(transactions, 6)

  const monthsWithHighBalance = series.filter((item) => item.balance >= essential * 1.5).length
  const idleBalanceEstimate = Math.max(0, balance - essential * 2)
  const detected =
    balance >= essential * 2 &&
    monthsWithHighBalance >= 2 &&
    recentSavingsContributions < balance * 0.05 &&
    invested < balance * 0.35

  const message = detected
    ? `~${idleBalanceEstimate.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} parado — defina se é reserva, meta ou aporte.`
    : "Sem saldo alto parado nos últimos meses."

  return {
    detected,
    idleBalanceEstimate,
    monthsWithHighBalance,
    recentSavingsContributions,
    message,
    methodology: "Saldo vs gastos essenciais, aportes recentes e investimentos cadastrados.",
  }
}

export function buildDebtStrategyEducation(): DebtStrategyEducation {
  return {
    available: false,
    reason:
      "O app ainda não registra saldo, taxa de juros, parcelas e vencimentos das dívidas de forma estruturada.",
    strategies: [
      {
        id: "avalanche",
        label: "Avalanche",
        summary: "Prioriza a dívida com juros mais altos para reduzir custo total.",
      },
      {
        id: "snowball",
        label: "Bola de neve",
        summary: "Prioriza a menor dívida primeiro para ganhar tração e motivação.",
      },
    ],
    nextStep:
      "Quando o cadastro de dívidas estiver disponível, será possível comparar as estratégias com seus números reais.",
  }
}

export function buildFinancialGuidanceSnapshot(input: GuidanceInput): FinancialGuidanceSnapshot {
  const ref = input.ref ?? new Date()
  return {
    generatedAt: ref.toISOString(),
    emergencyReserve: analyzeEmergencyReserve({ ...input, ref }),
    budgetLens: analyzeBudgetLens503020({ ...input, ref }),
    seasonality: analyzeSeasonality({ transactions: input.transactions, ref }),
    idleMoney: analyzeIdleMoney({ ...input, ref }),
    debtStrategies: buildDebtStrategyEducation(),
  }
}