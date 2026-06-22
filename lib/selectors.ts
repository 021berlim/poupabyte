import type {
  CategoryId,
  CategoryRef,
  Goal,
  Investment,
  InvestmentType,
  SpendingLimit,
  Transaction,
  TransactionType,
} from "./types"
import { isSameMonth } from "./format"
import { getCategory } from "./categories"
import { isCashRelevant, transactionCashDelta } from "./transaction-cash"

export interface DateRange {
  from?: string
  to?: string
}

export interface TransactionFilters extends DateRange {
  type?: TransactionType | "all"
  category?: CategoryId | "all"
  search?: string
}

function toDate(value: string): Date {
  return value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value)
}

function monthEnd(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999)
}

function withinRange(iso: string, range: DateRange): boolean {
  const value = toDate(iso).getTime()
  if (range.from) {
    const from = toDate(range.from)
    from.setHours(0, 0, 0, 0)
    if (value < from.getTime()) return false
  }
  if (range.to) {
    const to = toDate(range.to)
    to.setHours(23, 59, 59, 999)
    if (value > to.getTime()) return false
  }
  return true
}

export function totalBalance(txs: Transaction[]): number {
  return txs.reduce((acc, t) => acc + transactionCashDelta(t), 0)
}

export function openingBalanceBeforePeriod(txs: Transaction[], from?: string): number {
  const cutoff = from?.slice(0, 10) ?? "0000-01-01"
  return [...txs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((t) => t.date.slice(0, 10) < cutoff)
    .reduce((acc, t) => acc + transactionCashDelta(t), 0)
}

export function monthIncome(txs: Transaction[], ref = new Date()): number {
  return txs
    .filter((t) => t.type === "income" && isSameMonth(t.date, ref))
    .reduce((acc, t) => acc + t.amount, 0)
}

export function monthExpense(txs: Transaction[], ref = new Date()): number {
  return txs
    .filter((t) => t.type === "expense" && isSameMonth(t.date, ref))
    .reduce((acc, t) => acc + t.amount, 0)
}

export function monthSavings(txs: Transaction[], ref = new Date()): number {
  return monthIncome(txs, ref) - monthExpense(txs, ref)
}

// Accumulated savings = total balance (income - expense over all time)
export function accumulatedSavings(txs: Transaction[]): number {
  return totalBalance(txs)
}

export function filterTransactions(txs: Transaction[], filters: TransactionFilters): Transaction[] {
  const query = filters.search?.trim().toLowerCase() ?? ""
  return txs
    .filter((t) => (filters.type && filters.type !== "all" ? t.type === filters.type : true))
    .filter((t) => (filters.category && filters.category !== "all" ? t.category === filters.category : true))
    .filter((t) => (query ? t.description.toLowerCase().includes(query) : true))
    .filter((t) => withinRange(t.date, filters))
    .sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime())
}

export interface TransactionSummary {
  income: number
  expense: number
  balance: number
  count: number
  averageExpense: number
  averageIncome: number
}

export function transactionSummary(txs: Transaction[]): TransactionSummary {
  const cashTxs = txs.filter(isCashRelevant)
  const incomeItems = cashTxs.filter((t) => t.type === "income")
  const expenseItems = cashTxs.filter((t) => t.type === "expense")
  const income = incomeItems.reduce((acc, t) => acc + t.amount, 0)
  const expense = expenseItems.reduce((acc, t) => acc + t.amount, 0)
  return {
    income,
    expense,
    balance: income - expense,
    count: cashTxs.length,
    averageExpense: expenseItems.length > 0 ? expense / expenseItems.length : 0,
    averageIncome: incomeItems.length > 0 ? income / incomeItems.length : 0,
  }
}

export interface CategoryBreakdown {
  category: CategoryRef
  label: string
  color: string
  total: number
}

export function expenseByCategory(txs: Transaction[], ref?: Date): CategoryBreakdown[] {
  const map = new Map<CategoryRef, number>()
  txs
    .filter((t) => t.type === "expense" && (!ref || isSameMonth(t.date, ref)))
    .forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount))
  return Array.from(map.entries())
    .map(([category, total]) => {
      const meta = getCategory(category)
      return { category, label: meta.label, color: meta.color, total }
    })
    .sort((a, b) => b.total - a.total)
}

export interface MonthlySeries {
  key: string
  label: string
  year: number
  month: number
  income: number
  expense: number
  balance: number
  accumulatedBalance: number
}

export function monthlySeries(txs: Transaction[], months = 6): MonthlySeries[] {
  const series: MonthlySeries[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const income = monthIncome(txs, ref)
    const expense = monthExpense(txs, ref)
    const accumulatedBalance = txs
      .filter((t) => toDate(t.date).getTime() <= monthEnd(ref).getTime())
      .reduce((acc, t) => acc + transactionCashDelta(t), 0)
    series.push({
      key: `${ref.getFullYear()}-${ref.getMonth()}`,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(ref).replace(".", ""),
      year: ref.getFullYear(),
      month: ref.getMonth(),
      income,
      expense,
      balance: income - expense,
      accumulatedBalance,
    })
  }
  return series
}

export function yearlySeries(txs: Transaction[], years = 3): MonthlySeries[] {
  const now = new Date()
  const firstYear = now.getFullYear() - years + 1
  const rows: MonthlySeries[] = []
  for (let year = firstYear; year <= now.getFullYear(); year++) {
    const yearTxs = txs.filter((t) => toDate(t.date).getFullYear() === year)
    const income = yearTxs.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0)
    const expense = yearTxs.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0)
    rows.push({
      key: String(year),
      label: String(year),
      year,
      month: 0,
      income,
      expense,
      balance: income - expense,
      accumulatedBalance: txs
        .filter((t) => toDate(t.date).getFullYear() <= year)
        .reduce((acc, t) => acc + transactionCashDelta(t), 0),
    })
  }
  return rows
}

export interface MonthlyComparison {
  currentIncome: number
  currentExpense: number
  previousIncome: number
  previousExpense: number
  incomeChange: number
  expenseChange: number
  balanceChange: number
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / previous) * 100
}

export function monthlyComparison(txs: Transaction[], ref = new Date()): MonthlyComparison {
  const previous = new Date(ref.getFullYear(), ref.getMonth() - 1, 1)
  const currentIncome = monthIncome(txs, ref)
  const currentExpense = monthExpense(txs, ref)
  const previousIncome = monthIncome(txs, previous)
  const previousExpense = monthExpense(txs, previous)
  return {
    currentIncome,
    currentExpense,
    previousIncome,
    previousExpense,
    incomeChange: percentChange(currentIncome, previousIncome),
    expenseChange: percentChange(currentExpense, previousExpense),
    balanceChange: percentChange(currentIncome - currentExpense, previousIncome - previousExpense),
  }
}

export type BudgetHealthStatus = "healthy" | "attention" | "critical" | "exceeded"

export interface LimitUsage {
  limit: SpendingLimit
  spent: number
  percent: number
  remaining: number
  status: BudgetHealthStatus
  alertLevel: 0 | 70 | 90 | 100
  dailySuggestion: number
}

function budgetStatus(percent: number): { status: BudgetHealthStatus; alertLevel: 0 | 70 | 90 | 100 } {
  if (percent > 100) return { status: "exceeded", alertLevel: 100 }
  if (percent >= 91) return { status: "critical", alertLevel: 90 }
  if (percent >= 71) return { status: "attention", alertLevel: 70 }
  return { status: "healthy", alertLevel: 0 }
}

function daysLeftInMonth(ref: Date): number {
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
  return Math.max(1, end - ref.getDate())
}

export function limitUsage(limits: SpendingLimit[], txs: Transaction[], ref = new Date()): LimitUsage[] {
  const daysLeft = daysLeftInMonth(ref)
  return limits.map((limit) => {
    const spent = txs
      .filter((t) => {
        if (t.type !== "expense" || !isSameMonth(t.date, ref)) return false
        if (limit.subcategoryId) return t.subcategoryId === limit.subcategoryId
        return t.category === limit.category
      })
      .reduce((acc, t) => acc + t.amount, 0)
    const percent = limit.amount > 0 ? (spent / limit.amount) * 100 : 0
    const { status, alertLevel } = budgetStatus(percent)
    const remaining = limit.amount - spent
    return {
      limit,
      spent,
      percent,
      remaining,
      status,
      alertLevel,
      dailySuggestion: remaining > 0 ? remaining / daysLeft : 0,
    }
  })
}

export interface LimitHistoryItem {
  key: string
  label: string
  spent: number
  limit: number
  percent: number
}

export function limitMonthlyHistory(limit: SpendingLimit, txs: Transaction[], months = 6): LimitHistoryItem[] {
  const now = new Date()
  const rows: LimitHistoryItem[] = []
  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const spent = txs
      .filter((t) => {
        if (t.type !== "expense" || !isSameMonth(t.date, ref)) return false
        if (limit.subcategoryId) return t.subcategoryId === limit.subcategoryId
        return t.category === limit.category
      })
      .reduce((acc, t) => acc + t.amount, 0)
    rows.push({
      key: `${ref.getFullYear()}-${ref.getMonth()}`,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(ref).replace(".", ""),
      spent,
      limit: limit.amount,
      percent: limit.amount > 0 ? (spent / limit.amount) * 100 : 0,
    })
  }
  return rows
}

export interface GoalProgress {
  percent: number
  remaining: number
  daysLeft: number
  completed: boolean
  nearDeadline: boolean
  atRisk: boolean
  dailyRequired: number
  estimate: string
}

export function goalProgress(goal: Goal): GoalProgress {
  const percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0
  const remaining = Math.max(0, goal.target - goal.current)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = toDate(goal.deadline)
  deadline.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((deadline.getTime() - today.getTime()) / 86400000)
  const completed = goal.current >= goal.target
  const nearDeadline = !completed && daysLeft >= 0 && daysLeft <= 14
  const atRisk = !completed && (daysLeft < 0 || (daysLeft <= 30 && percent < 80) || (daysLeft <= 7 && percent < 95))
  const dailyRequired = !completed && daysLeft > 0 ? remaining / daysLeft : remaining
  const estimate = completed
    ? "Concluida"
    : daysLeft < 0
      ? "Prazo vencido"
      : dailyRequired > 0
        ? `${dailyRequired.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/dia`
        : "Sem aporte necessario"
  return { percent, remaining, daysLeft, completed, nearDeadline, atRisk, dailyRequired, estimate }
}

export interface GoalSummary {
  current: number
  target: number
  completed: number
  atRisk: number
  nearDeadline: number
  percent: number
}

export function goalSummary(goals: Goal[]): GoalSummary {
  const base = goals.reduce(
    (acc, goal) => {
      const progress = goalProgress(goal)
      return {
        current: acc.current + goal.current,
        target: acc.target + goal.target,
        completed: acc.completed + (progress.completed ? 1 : 0),
        atRisk: acc.atRisk + (progress.atRisk ? 1 : 0),
        nearDeadline: acc.nearDeadline + (progress.nearDeadline ? 1 : 0),
      }
    },
    { current: 0, target: 0, completed: 0, atRisk: 0, nearDeadline: 0 },
  )
  return { ...base, percent: base.target > 0 ? Math.round((base.current / base.target) * 100) : 0 }
}

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  poupanca: "Poupança",
  cdb: "CDB",
  "tesouro-direto": "Tesouro Direto",
  acoes: "Ações",
  "fundos-imobiliarios": "Fundos Imobiliários",
  etfs: "ETFs",
  fundos: "Fundos",
  criptomoedas: "Criptomoedas",
  previdencia: "Previdência",
  outros: "Outros",
}

export const INVESTMENT_TYPE_COLORS: Record<InvestmentType, string> = {
  poupanca: "#16a34a",
  cdb: "#2563eb",
  "tesouro-direto": "#9333ea",
  acoes: "#dc2626",
  "fundos-imobiliarios": "#c72c3b",
  etfs: "#0f766e",
  fundos: "#7c3aed",
  criptomoedas: "#f59e0b",
  previdencia: "#0891b2",
  outros: "#64748b",
}

export const INVESTMENT_TYPE_OPTIONS = Object.entries(INVESTMENT_TYPE_LABELS).map(([id, label]) => ({
  id: id as InvestmentType,
  label,
  color: INVESTMENT_TYPE_COLORS[id as InvestmentType],
}))

export interface InvestmentPerformance {
  investment: Investment
  returnAmount: number
  returnPercent: number
}

export function investmentPerformance(investment: Investment): InvestmentPerformance {
  const returnAmount = investment.currentValue - investment.investedAmount
  const returnPercent = investment.investedAmount > 0 ? (returnAmount / investment.investedAmount) * 100 : 0
  return { investment, returnAmount, returnPercent }
}

export interface InvestmentSummary {
  totalInvested: number
  currentValue: number
  investedNetWorth: number
  accumulatedReturn: number
  accumulatedReturnPercent: number
  bestInvestment: InvestmentPerformance | null
  worstInvestment: InvestmentPerformance | null
  assetCount: number
}

export function investmentSummary(investments: Investment[]): InvestmentSummary {
  const totalInvested = investments.reduce((acc, item) => acc + item.investedAmount, 0)
  const currentValue = investments.reduce((acc, item) => acc + item.currentValue, 0)
  const performances = investments.map(investmentPerformance).sort((a, b) => b.returnPercent - a.returnPercent)
  return {
    totalInvested,
    currentValue,
    investedNetWorth: currentValue,
    accumulatedReturn: currentValue - totalInvested,
    accumulatedReturnPercent: totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0,
    bestInvestment: performances[0] ?? null,
    worstInvestment: performances.at(-1) ?? null,
    assetCount: investments.length,
  }
}

export interface AllocationItem {
  key: string
  label: string
  value: number
  percent: number
  color: string
}

function allocationFromMap(map: Map<string, { label: string; value: number; color: string }>): AllocationItem[] {
  const total = Array.from(map.values()).reduce((acc, item) => acc + item.value, 0)
  return Array.from(map.entries())
    .map(([key, item]) => ({
      key,
      label: item.label,
      value: item.value,
      color: item.color,
      percent: total > 0 ? (item.value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
}

export function investmentAllocationByType(investments: Investment[]): AllocationItem[] {
  const map = new Map<string, { label: string; value: number; color: string }>()
  investments.forEach((item) => {
    const previous = map.get(item.type)
    map.set(item.type, {
      label: INVESTMENT_TYPE_LABELS[item.type],
      value: (previous?.value ?? 0) + item.currentValue,
      color: INVESTMENT_TYPE_COLORS[item.type],
    })
  })
  return allocationFromMap(map)
}

export function investmentAllocationByInstitution(investments: Investment[]): AllocationItem[] {
  const colors = ["#c72c3b", "#2563eb", "#16a34a", "#9333ea", "#f59e0b", "#0f766e", "#64748b"]
  const map = new Map<string, { label: string; value: number; color: string }>()
  investments.forEach((item) => {
    const key = item.institution.trim() || "Sem instituicao"
    const previous = map.get(key)
    map.set(key, {
      label: key,
      value: (previous?.value ?? 0) + item.currentValue,
      color: previous?.color ?? colors[map.size % colors.length],
    })
  })
  return allocationFromMap(map)
}

export interface InvestmentComparisonRow {
  id: string
  name: string
  type: string
  investedAmount: number
  currentValue: number
  returnAmount: number
  returnPercent: number
}

export function investmentComparisonData(investments: Investment[]): InvestmentComparisonRow[] {
  return investments
    .map((investment) => {
      const performance = investmentPerformance(investment)
      return {
        id: investment.id,
        name: investment.name,
        type: INVESTMENT_TYPE_LABELS[investment.type],
        investedAmount: investment.investedAmount,
        currentValue: investment.currentValue,
        returnAmount: performance.returnAmount,
        returnPercent: performance.returnPercent,
      }
    })
    .sort((a, b) => b.currentValue - a.currentValue)
}

export interface InvestmentEvolutionRow {
  key: string
  label: string
  invested: number
  current: number
  returnAmount: number
}

function investmentValueAtMonthEnd(investment: Investment, ref: Date): { invested: number; current: number } {
  const end = monthEnd(ref).getTime()
  if (toDate(investment.applicationDate).getTime() > end) return { invested: 0, current: 0 }

  const movements = [...investment.movements].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())
  const totalContributions = movements
    .filter((movement) => movement.type === "contribution")
    .reduce((acc, movement) => acc + movement.amount, 0)
  const totalWithdrawals = movements
    .filter((movement) => movement.type === "withdrawal")
    .reduce((acc, movement) => acc + movement.amount, 0)
  const initialInvested = Math.max(0, investment.investedAmount - totalContributions + totalWithdrawals)
  let invested = initialInvested
  let current = initialInvested
  for (const movement of movements) {
    if (toDate(movement.date).getTime() > end) break
    if (movement.type === "contribution") {
      invested += movement.amount
      current += movement.amount
    } else if (movement.type === "withdrawal") {
      invested = Math.max(0, invested - movement.amount)
      current = Math.max(0, current - movement.amount)
    } else {
      current = movement.amount
    }
  }

  const latestMovement = movements.filter((movement) => toDate(movement.date).getTime() <= end).at(-1)
  if (!latestMovement && toDate(investment.applicationDate).getTime() <= end) {
    current = investment.currentValue
  }

  return { invested, current }
}

export function investmentEvolutionSeries(investments: Investment[], months = 6): InvestmentEvolutionRow[] {
  const now = new Date()
  const rows: InvestmentEvolutionRow[] = []
  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const totals = investments.reduce(
      (acc, investment) => {
        const value = investmentValueAtMonthEnd(investment, ref)
        return { invested: acc.invested + value.invested, current: acc.current + value.current }
      },
      { invested: 0, current: 0 },
    )
    rows.push({
      key: `${ref.getFullYear()}-${ref.getMonth()}`,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(ref).replace(".", ""),
      invested: totals.invested,
      current: totals.current,
      returnAmount: totals.current - totals.invested,
    })
  }
  return rows
}

export function investmentMovements(investments: Investment[]) {
  return investments
    .flatMap((investment) =>
      investment.movements.map((movement) => ({
        ...movement,
        investmentName: investment.name,
        investmentType: investment.type,
      })),
    )
    .sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime())
}

export function totalNetWorth(transactions: Transaction[], investments: Investment[]): number {
  return totalBalance(transactions) + investmentSummary(investments).currentValue
}

export function financialHealthScore(
  transactions: Transaction[],
  goals: Goal[],
  limits: SpendingLimit[],
  investments: Investment[],
): { score: number; label: string } {
  const balance = totalBalance(transactions)
  const savings = monthSavings(transactions)
  const goalStats = goalSummary(goals)
  const criticalLimits = limitUsage(limits, transactions).filter((item) => item.status !== "healthy").length
  const invested = investmentSummary(investments).currentValue

  let score = 55
  if (balance > 0) score += 12
  if (savings > 0) score += 14
  if (goalStats.percent >= 50) score += 8
  if (invested > 0) score += 8
  score -= Math.min(20, criticalLimits * 7)
  score -= Math.min(15, goalStats.atRisk * 5)
  score = Math.max(0, Math.min(100, score))

  const label = score >= 80 ? "Saudável" : score >= 60 ? "Em atenção" : "Crítica"
  return { score, label }
}
