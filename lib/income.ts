import type { FinancialObjective, FinancialProfile, SalaryEffectiveScope, SalarySnapshot } from "./types"

export function monthKey(ref = new Date()): string {
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`
}

export function nextMonthKey(ref = new Date()): string {
  const next = new Date(ref.getFullYear(), ref.getMonth() + 1, 1)
  return monthKey(next)
}

function snapshotAppliesToMonth(snapshot: SalarySnapshot, key: string): boolean {
  return snapshot.effectiveFrom <= key
}

export function getSnapshotForMonth(profile: FinancialProfile, ref = new Date()): SalarySnapshot {
  const key = monthKey(ref)
  const history = [...(profile.salaryHistory ?? [])].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
  const match = history.find((item) => snapshotAppliesToMonth(item, key))
  if (match) return match
  return {
    effectiveFrom: key,
    monthlySalary: profile.monthlySalary,
    salaryDay: profile.salaryDay,
    expectedExtraIncome: profile.expectedExtraIncome ?? 0,
    monthlyReserve: profile.monthlyReserve ?? 0,
    objective: profile.objective,
  }
}

export function getDeclaredSalaryForMonth(profile: FinancialProfile, ref = new Date()): number {
  return getSnapshotForMonth(profile, ref).monthlySalary
}

export function getExpectedIncomeForMonth(profile: FinancialProfile, ref = new Date()): number {
  const snapshot = getSnapshotForMonth(profile, ref)
  return snapshot.monthlySalary + (snapshot.expectedExtraIncome ?? 0)
}

export function salaryIncomeFromTransactions(
  transactions: Array<{ type: string; category: string; amount: number; description: string; date?: string }>,
  ref = new Date(),
): number {
  const key = monthKey(ref)
  return transactions
    .filter((tx) => {
      if (tx.type !== "income") return false
      const txKey = tx.date?.slice(0, 7) ?? key
      if (txKey !== key) return false
      const desc = tx.description.toLowerCase()
      return tx.category === "salario" || desc.includes("salario") || desc.includes("salário")
    })
    .reduce((acc, tx) => acc + tx.amount, 0)
}

export function extraIncomeBreakdown(
  receivedIncome: number,
  declaredSalary: number,
  expectedExtra = 0,
): { extraDetected: number; expectedExtra: number; salaryPortion: number } {
  const salaryPortion = Math.min(receivedIncome, declaredSalary)
  const extraDetected = Math.max(0, receivedIncome - declaredSalary)
  return { extraDetected, expectedExtra, salaryPortion }
}

export interface IncomeUpdateInput {
  monthlySalary: number
  salaryDay: number
  expectedExtraIncome: number
  monthlyReserve: number
  objective: FinancialObjective
  scope: SalaryEffectiveScope
}

export function applyIncomeUpdate(profile: FinancialProfile, input: IncomeUpdateInput, ref = new Date()): FinancialProfile {
  const currentKey = monthKey(ref)
  const effectiveFrom =
    input.scope === "next-month"
      ? nextMonthKey(ref)
      : input.scope === "all-months"
        ? "0000-01"
        : currentKey

  const snapshot: SalarySnapshot = {
    effectiveFrom,
    monthlySalary: input.monthlySalary,
    salaryDay: input.salaryDay,
    expectedExtraIncome: input.expectedExtraIncome,
    monthlyReserve: input.monthlyReserve,
    objective: input.objective,
  }

  let history = [...(profile.salaryHistory ?? [])]

  if (input.scope === "all-months") {
    history = [snapshot]
  } else {
    history = history.filter((item) => item.effectiveFrom !== effectiveFrom)
    history.push(snapshot)
    history.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
  }

  const currentSnapshot = getSnapshotForMonth(
    {
      ...profile,
      monthlySalary: input.monthlySalary,
      salaryDay: input.salaryDay,
      expectedExtraIncome: input.expectedExtraIncome,
      monthlyReserve: input.monthlyReserve,
      objective: input.objective,
      salaryHistory: history,
    },
    ref,
  )

  return {
    ...profile,
    monthlySalary: currentSnapshot.monthlySalary,
    salaryDay: currentSnapshot.salaryDay,
    expectedExtraIncome: currentSnapshot.expectedExtraIncome,
    monthlyReserve: currentSnapshot.monthlyReserve,
    objective: currentSnapshot.objective,
    configured: true,
    currency: "BRL",
    salaryHistory: history,
  }
}

export function normalizeSalaryHistory(profile: Partial<FinancialProfile>): FinancialProfile {
  const base: FinancialProfile = {
    monthlySalary: profile.monthlySalary ?? 7200,
    salaryDay: profile.salaryDay ?? 5,
    objective: profile.objective ?? "organizar-salario",
    currency: "BRL",
    configured: profile.configured ?? false,
    expectedExtraIncome: profile.expectedExtraIncome ?? 0,
    monthlyReserve: profile.monthlyReserve ?? 0,
    salaryHistory: profile.salaryHistory ?? [],
  }
  if (!base.salaryHistory.length && base.configured) {
    base.salaryHistory = [
      {
        effectiveFrom: "0000-01",
        monthlySalary: base.monthlySalary,
        salaryDay: base.salaryDay,
        expectedExtraIncome: base.expectedExtraIncome,
        monthlyReserve: base.monthlyReserve,
        objective: base.objective,
      },
    ]
  }
  return base
}

export const SALARY_SCOPE_LABELS: Record<SalaryEffectiveScope, string> = {
  "current-month": "A partir do mês atual",
  "next-month": "A partir do próximo mês",
  "all-months": "Recalcular meses anteriores também",
}