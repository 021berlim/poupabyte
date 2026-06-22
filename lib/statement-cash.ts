import { isSameMonth } from "./format"
import { getDeclaredSalaryForMonth, getEffectivePlanningIncome, usesFlexiblePlanning } from "./income"
import { isPendingReview } from "./transaction-utils"
import type { FinancialProfile, ImportSummary, Transaction } from "./types"
import type { StatementParseResult } from "./statement-import"

export function isConfirmedTransaction(tx: Transaction): boolean {
  return !isPendingReview(tx)
}

export function isImportedTransaction(tx: Transaction): boolean {
  return tx.source === "pdf-import"
}

/** Transferência entre contas próprias — o usuário sinaliza no lançamento. */
export function isOwnAccountTransfer(tx: Pick<Transaction, "type">): boolean {
  return tx.type === "transfer"
}

export function importedStatementTransactions(transactions: Transaction[], ref = new Date()): Transaction[] {
  return transactions.filter(
    (tx) => isImportedTransaction(tx) && isSameMonth(tx.date, ref) && !isOwnAccountTransfer(tx),
  )
}

/** Entradas do extrato: valores positivos importados (tipo income), inclusive pendentes de revisão. */
export function importedStatementInflows(transactions: Transaction[], ref = new Date()): number {
  return importedStatementTransactions(transactions, ref)
    .filter((tx) => tx.type === "income")
    .reduce((acc, tx) => acc + tx.amount, 0)
}

/** Saídas do extrato: valores negativos importados (tipo expense), inclusive pendentes de revisão. */
export function importedStatementOutflows(transactions: Transaction[], ref = new Date()): number {
  return importedStatementTransactions(transactions, ref)
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => acc + tx.amount, 0)
}

export function isSalaryTransaction(tx: Pick<Transaction, "type" | "category" | "description">): boolean {
  if (tx.type !== "income") return false
  const desc = tx.description.toLowerCase()
  return tx.category === "salario" || desc.includes("salario") || desc.includes("salário")
}

export function confirmedImportedTransactions(transactions: Transaction[], ref = new Date()): Transaction[] {
  return transactions.filter(
    (tx) =>
      isImportedTransaction(tx) &&
      isConfirmedTransaction(tx) &&
      isSameMonth(tx.date, ref) &&
      !isOwnAccountTransfer(tx),
  )
}

export function confirmedImportedIncome(transactions: Transaction[], ref = new Date()): number {
  return confirmedImportedTransactions(transactions, ref)
    .filter((tx) => tx.type === "income")
    .reduce((acc, tx) => acc + tx.amount, 0)
}

export function confirmedImportedExpenses(transactions: Transaction[], ref = new Date()): number {
  return confirmedImportedTransactions(transactions, ref)
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => acc + tx.amount, 0)
}

export function confirmedSalaryIncome(transactions: Transaction[], ref = new Date()): number {
  return transactions
    .filter(
      (tx) =>
        isImportedTransaction(tx) &&
        isConfirmedTransaction(tx) &&
        isSameMonth(tx.date, ref) &&
        isSalaryTransaction(tx),
    )
    .reduce((acc, tx) => acc + tx.amount, 0)
}

/** Salário só entra no planejamento após confirmação explícita nas movimentações. */
export function salaryConfirmedThisMonth(
  transactions: Transaction[],
  _profile: FinancialProfile,
  ref = new Date(),
): boolean {
  return confirmedSalaryIncome(transactions, ref) > 0
}

export function confirmedNonSalaryImportedIncome(transactions: Transaction[], ref = new Date()): number {
  return confirmedImportedTransactions(transactions, ref)
    .filter((tx) => tx.type === "income" && !isSalaryTransaction(tx))
    .reduce((acc, tx) => acc + tx.amount, 0)
}

export function resolveStatementAvailableBalance(
  lastImport: ImportSummary | null | undefined,
  ref = new Date(),
): number | null {
  if (!lastImport || lastImport.availableBalance === undefined) return null
  if (!isSameMonth(lastImport.importedAt, ref)) return null
  return lastImport.availableBalance
}

export function buildPlanningIncomeBase(
  profile: FinancialProfile,
  transactions: Transaction[],
  ref = new Date(),
): {
  importIncome: number
  importExpenses: number
  salaryConfirmed: boolean
  confirmedSalary: number
  planningIncome: number
} {
  const declaredSalary = getDeclaredSalaryForMonth(profile, ref)
  const effectiveDeclared = getEffectivePlanningIncome(profile, ref)
  const importIncome = confirmedImportedIncome(transactions, ref)
  const importExpenses = confirmedImportedExpenses(transactions, ref)
  const salaryConfirmed = salaryConfirmedThisMonth(transactions, profile, ref)
  const confirmedSalary = confirmedSalaryIncome(transactions, ref)
  const otherImportedIncome = confirmedNonSalaryImportedIncome(transactions, ref)
  const flexible = usesFlexiblePlanning(profile.incomeType)

  let planningIncome: number
  if (flexible) {
    const receivedTotal = importIncome
    planningIncome =
      receivedTotal > 0
        ? receivedTotal
        : effectiveDeclared > 0
          ? effectiveDeclared
          : 0
  } else {
    planningIncome = salaryConfirmed
      ? Math.max(declaredSalary, confirmedSalary) + otherImportedIncome
      : importIncome
  }

  return {
    importIncome,
    importExpenses,
    salaryConfirmed: flexible ? importIncome > 0 : salaryConfirmed,
    confirmedSalary,
    planningIncome,
  }
}

export function extractAvailableBalanceFromParseResult(result: StatementParseResult): number | undefined {
  const interBalance = result.interValidation?.saldo_disponivel_informado
  if (interBalance !== undefined) return interBalance

  const bradescoLast = result.bradescoStructured?.transacoes.at(-1)?.saldo_apos
  if (bradescoLast !== undefined) return bradescoLast

  const bradescoRef = result.bradescoStructured?.saldos_referencia.at(-1)?.saldo
  if (bradescoRef !== undefined) return bradescoRef

  return undefined
}