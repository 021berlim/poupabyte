import { isSameMonth } from "./format"
import { getDeclaredSalaryForMonth, getEffectivePlanningIncome, getExpectedIncomeForMonth, usesFlexiblePlanning } from "./income"
import { buildMonthlyIncomeBreakdown } from "./long-term-planning"
import { goalProgress } from "./selectors"
import {
  buildPlanningIncomeBase,
  confirmedImportedExpenses,
  confirmedSalaryIncome,
  resolveStatementAvailableBalance,
  salaryConfirmedThisMonth,
} from "./statement-cash"
import type {
  FinancialProfile,
  Goal,
  ImportSummary,
  Installment,
  SpendingLimit,
  Subscription,
  Transaction,
} from "./types"

function daysInMonth(ref: Date): number {
  return new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
}

function daysLeftInMonth(ref = new Date()): number {
  const end = daysInMonth(ref)
  return Math.max(0, end - ref.getDate())
}

function registeredCommittedFixedExpenses(transactions: Transaction[], ref = new Date()): number {
  return transactions
    .filter((t) => t.type === "expense" && isSameMonth(t.date, ref))
    .filter(
      (t) =>
        Boolean(t.isFixed || t.isSubscription || t.isRecurring) ||
        t.category === "assinaturas" ||
        t.category === "parcelamentos",
    )
    .reduce((acc, t) => acc + t.amount, 0)
}

export interface MonthlyPlanning {
  declaredSalary: number
  fixedSalary: number
  monthlyIncome: number
  expectedExtraIncome: number
  expectedIncome: number
  receivedIncome: number
  extraIncomeDetected: number
  salaryPortionReceived: number
  confirmedExpenses: number
  pendingFixedExpenses: number
  committedMoney: number
  availableMoney: number
  reservedForGoals: number
  monthlyReserve: number
  projectedSavings: number
  salaryUsedPercent: number
  salaryFreePercent: number
  safeToSpend: number
  monthCommittedPercent: number
  daysLeft: number
  salaryReceived: boolean
  salaryConfirmed: boolean
  statementAvailableBalance: number | null
  importBasedIncome: number
  importBasedExpenses: number
  endOfMonthProjection: number
}

export function monthExpenses(txs: Transaction[], ref = new Date()): number {
  return txs
    .filter((t) => t.type === "expense" && isSameMonth(t.date, ref))
    .reduce((acc, t) => acc + t.amount, 0)
}

export function monthIncomeFromTransactions(txs: Transaction[], ref = new Date()): number {
  return txs
    .filter((t) => t.type === "income" && isSameMonth(t.date, ref))
    .reduce((acc, t) => acc + t.amount, 0)
}

export function activeSubscriptionsMonthlyTotal(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((s) => s.active)
    .reduce((acc, s) => acc + (s.frequency === "yearly" ? s.amount / 12 : s.amount), 0)
}

export function activeInstallmentsMonthlyTotal(installments: Installment[]): number {
  return installments
    .filter((i) => i.status === "active")
    .reduce((acc, i) => acc + i.monthlyAmount, 0)
}

export function monthlyGoalReservation(goals: Goal[], ref = new Date()): number {
  return goals.reduce((acc, goal) => {
    const progress = goalProgress(goal)
    if (progress.completed || progress.daysLeft <= 0) return acc
    const monthsLeft = Math.max(1, Math.ceil(progress.daysLeft / 30))
    return acc + progress.remaining / monthsLeft
  }, 0)
}

export function salaryReceivedThisMonth(txs: Transaction[], profile: FinancialProfile, ref = new Date()): boolean {
  return salaryConfirmedThisMonth(txs, profile, ref)
}

export function buildMonthlyPlanning(
  profile: FinancialProfile,
  transactions: Transaction[],
  goals: Goal[],
  subscriptions: Subscription[],
  installments: Installment[],
  limits: SpendingLimit[],
  ref = new Date(),
  lastImport: ImportSummary | null = null,
): MonthlyPlanning {
  const declaredSalary = getDeclaredSalaryForMonth(profile, ref)
  const effectiveDeclared = getEffectivePlanningIncome(profile, ref)
  const flexibleIncome = usesFlexiblePlanning(profile.incomeType)
  const incomeBase = buildPlanningIncomeBase(profile, transactions, ref)
  const incomeBreakdownMonth = buildMonthlyIncomeBreakdown(profile, transactions, ref, lastImport)
  const expectedExtraIncome = flexibleIncome ? 0 : getExpectedIncomeForMonth(profile, ref) - declaredSalary
  const expectedIncome = flexibleIncome
    ? Math.max(effectiveDeclared, incomeBase.planningIncome)
    : getExpectedIncomeForMonth(profile, ref)

  const importBasedIncome = incomeBase.importIncome
  const importBasedExpenses = incomeBase.importExpenses
  const receivedIncome = importBasedIncome
  const monthlyIncome = incomeBase.planningIncome
  const confirmedExpenses = importBasedExpenses
  const salaryConfirmed = incomeBase.salaryConfirmed
  const statementAvailableBalance = resolveStatementAvailableBalance(lastImport, ref)

  const subscriptionTotal = activeSubscriptionsMonthlyTotal(subscriptions)
  const installmentTotal = activeInstallmentsMonthlyTotal(installments)
  const goalReservation = monthlyGoalReservation(goals, ref)
  const monthlyReserve = profile.monthlyReserve ?? 0
  const reservedForGoals = goalReservation + monthlyReserve

  const registeredCommittedFixed = registeredCommittedFixedExpenses(transactions, ref)
  const pendingFixedExpenses = Math.max(0, subscriptionTotal + installmentTotal - registeredCommittedFixed)
  const futureCommitments = pendingFixedExpenses + reservedForGoals

  const importCashBase = Math.max(0, importBasedIncome - importBasedExpenses)
  const availableFromImport = Math.max(0, importCashBase - futureCommitments)
  const availableFromStatement =
    statementAvailableBalance !== null
      ? Math.max(0, statementAvailableBalance - futureCommitments)
      : null

  const safeToSpend = availableFromStatement ?? availableFromImport
  const confirmedIncomeBase = salaryConfirmed ? monthlyIncome : importBasedIncome
  const committedMoney = confirmedExpenses + futureCommitments
  const availableMoney = safeToSpend
  const projectedSavings = monthlyIncome - confirmedExpenses - subscriptionTotal - installmentTotal - reservedForGoals
  const salaryUsedPercent =
    confirmedIncomeBase > 0
      ? Math.min(100, (committedMoney / confirmedIncomeBase) * 100)
      : committedMoney > 0
        ? 100
        : 0
  const daysLeft = daysLeftInMonth(ref)
  const dailyBurn = daysLeft > 0 ? confirmedExpenses / Math.max(1, ref.getDate()) : confirmedExpenses
  const projectedRemainingSpend = dailyBurn * daysLeft
  const endOfMonthProjection =
    confirmedIncomeBase -
    confirmedExpenses -
    projectedRemainingSpend -
    pendingFixedExpenses -
    reservedForGoals

  return {
    declaredSalary,
    fixedSalary: declaredSalary,
    monthlyIncome,
    expectedExtraIncome,
    expectedIncome,
    receivedIncome,
    extraIncomeDetected: incomeBreakdownMonth.extraIncomeDetected,
    salaryPortionReceived: Math.min(confirmedSalaryIncome(transactions, ref), declaredSalary),
    confirmedExpenses,
    pendingFixedExpenses,
    committedMoney,
    availableMoney,
    reservedForGoals,
    monthlyReserve,
    projectedSavings,
    salaryUsedPercent,
    salaryFreePercent: Math.max(0, 100 - salaryUsedPercent),
    safeToSpend,
    monthCommittedPercent: salaryUsedPercent,
    daysLeft,
    salaryReceived: salaryConfirmed,
    salaryConfirmed,
    statementAvailableBalance,
    importBasedIncome,
    importBasedExpenses,
    endOfMonthProjection,
  }
}

export interface CashflowPlanningRow {
  key: string
  label: string
  realizedIncome: number
  realizedExpense: number
  realizedBalance: number
  projectedIncome: number
  projectedExpense: number
  projectedBalance: number
  trend: "positive" | "negative" | "neutral"
}

export function monthlyCashflowPlanning(
  profile: FinancialProfile,
  transactions: Transaction[],
  subscriptions: Subscription[],
  installments: Installment[],
  months = 6,
  ref = new Date(),
): CashflowPlanningRow[] {
  const rows: CashflowPlanningRow[] = []
  const subscriptionMonthly = activeSubscriptionsMonthlyTotal(subscriptions)
  const installmentMonthly = activeInstallmentsMonthlyTotal(installments)

  for (let i = months - 1; i >= 0; i--) {
    const monthRef = new Date(ref.getFullYear(), ref.getMonth() - i, 1)
    const incomeBase = buildPlanningIncomeBase(profile, transactions, monthRef)
    const realizedIncome = incomeBase.importIncome
    const realizedExpense = confirmedImportedExpenses(transactions, monthRef)
    const realizedBalance = realizedIncome - realizedExpense
    const isCurrent = isSameMonth(monthRef.toISOString(), ref)
    const projectedIncome = isCurrent ? incomeBase.planningIncome : realizedIncome
    const projectedExpense = realizedExpense + (isCurrent ? subscriptionMonthly + installmentMonthly : 0)
    const projectedBalance = projectedIncome - projectedExpense

    rows.push({
      key: `${monthRef.getFullYear()}-${monthRef.getMonth()}`,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(monthRef).replace(".", ""),
      realizedIncome,
      realizedExpense,
      realizedBalance,
      projectedIncome,
      projectedExpense,
      projectedBalance,
      trend: projectedBalance > 0 ? "positive" : projectedBalance < 0 ? "negative" : "neutral",
    })
  }
  return rows
}

export function upcomingSubscriptions(subscriptions: Subscription[], withinDays = 7, ref = new Date()): Subscription[] {
  const today = ref.getDate()
  const daysInCurrentMonth = daysInMonth(ref)
  return subscriptions
    .filter((s) => s.active)
    .filter((s) => {
      const daysUntil = s.billingDay >= today ? s.billingDay - today : daysInCurrentMonth - today + s.billingDay
      return daysUntil <= withinDays
    })
    .sort((a, b) => {
      const daysA = a.billingDay >= today ? a.billingDay - today : daysInCurrentMonth - today + a.billingDay
      const daysB = b.billingDay >= today ? b.billingDay - today : daysInCurrentMonth - today + b.billingDay
      return daysA - daysB
    })
}

export function budgetDailySuggestion(remaining: number, ref = new Date()): number {
  const days = Math.max(1, daysLeftInMonth(ref))
  return remaining / days
}
