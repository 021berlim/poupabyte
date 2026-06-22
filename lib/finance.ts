import type {
  CategoryId,
  CategoryRef,
  Goal,
  Investment,
  InvestmentMovementType,
  InvestmentType,
  SpendingLimit,
  Transaction,
  TransactionType,
} from "./types"

export function parseAmountInput(value: string | number): number {
  if (typeof value === "number") return value
  const normalized = value.trim().replace(/\./g, "").replace(",", ".")
  return Number.parseFloat(normalized)
}

export function isValidDateValue(value?: string): boolean {
  if (!value) return false
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value)
  return Number.isFinite(date.getTime())
}

export function dateInputToIso(value: string): string {
  return new Date(`${value}T12:00:00`).toISOString()
}

export function isoToDateInput(value?: string): string {
  if (!value || !isValidDateValue(value)) return ""
  return new Date(value).toISOString().slice(0, 10)
}

export function isPastDateInput(value: string): boolean {
  if (!isValidDateValue(value)) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(`${value}T12:00:00`)
  date.setHours(0, 0, 0, 0)
  return date.getTime() < today.getTime()
}

function hasValue(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null
}

function isPositiveAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

function isNonNegativeAmount(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

export interface TransactionInput {
  type?: TransactionType
  description?: string
  amount?: number
  category?: CategoryRef
  date?: string
}

export function validateTransaction(input: TransactionInput): string[] {
  const errors: string[] = []
  if (input.type !== "income" && input.type !== "expense" && input.type !== "transfer") {
    errors.push("Selecione receita, despesa ou transferência.")
  }
  if (!hasValue(input.description)) errors.push("Informe uma descrição.")
  if (!isPositiveAmount(input.amount ?? Number.NaN)) errors.push("Informe um valor maior que zero.")
  if (!hasValue(input.category)) errors.push("Selecione uma categoria.")
  if (!isValidDateValue(input.date)) errors.push("Informe uma data válida.")
  return errors
}

export type GoalInput = Omit<Goal, "id" | "color"> & Partial<Pick<Goal, "color">>

export function validateGoal(input: Partial<GoalInput>): string[] {
  const errors: string[] = []
  if (!hasValue(input.name)) errors.push("Informe o nome da meta.")
  if (!isPositiveAmount(input.target ?? Number.NaN)) errors.push("Informe um valor alvo maior que zero.")
  if (!isNonNegativeAmount(input.current ?? Number.NaN)) errors.push("Informe um valor atual válido.")
  if (!isValidDateValue(input.deadline)) errors.push("Informe uma data limite válida.")
  if (input.deadline && input.deadline.length === 10 && isPastDateInput(input.deadline)) {
    errors.push("A data limite não pode ser no passado.")
  }
  if (input.deadline && input.deadline.length > 10 && isPastDateInput(isoToDateInput(input.deadline))) {
    errors.push("A data limite não pode ser no passado.")
  }
  return errors
}

export function validateLimit(input: Partial<SpendingLimit>): string[] {
  const errors: string[] = []
  if (!hasValue(input.category)) errors.push("Selecione uma categoria.")
  if (!isPositiveAmount(input.amount ?? Number.NaN)) errors.push("Informe um limite maior que zero.")
  return errors
}

export interface InvestmentInput {
  name?: string
  type?: InvestmentType
  institution?: string
  investedAmount?: number
  currentValue?: number
  applicationDate?: string
  maturityDate?: string
  expectedReturn?: number
  notes?: string
}

export function validateInvestment(input: InvestmentInput): string[] {
  const errors: string[] = []
  if (!hasValue(input.name)) errors.push("Informe o nome do investimento.")
  if (!hasValue(input.type)) errors.push("Selecione o tipo do investimento.")
  if (!isPositiveAmount(input.investedAmount ?? Number.NaN)) errors.push("Informe um valor aplicado maior que zero.")
  if (!isNonNegativeAmount(input.currentValue ?? Number.NaN)) errors.push("O valor atual não pode ser negativo.")
  if (!isValidDateValue(input.applicationDate)) errors.push("Informe uma data de aplicação válida.")
  if (input.maturityDate && !isValidDateValue(input.maturityDate)) errors.push("Informe uma data de vencimento válida.")
  if (
    input.maturityDate &&
    input.applicationDate &&
    isValidDateValue(input.maturityDate) &&
    isValidDateValue(input.applicationDate) &&
    new Date(input.maturityDate).getTime() < new Date(input.applicationDate).getTime()
  ) {
    errors.push("O vencimento não pode ser antes da aplicação.")
  }
  if (input.expectedReturn !== undefined) {
    if (!Number.isFinite(input.expectedReturn)) errors.push("Informe uma rentabilidade válida.")
    else if (input.expectedReturn < 0) errors.push("A rentabilidade não pode ser negativa.")
  }
  return errors
}

export interface InvestmentMovementInput {
  type?: InvestmentMovementType
  amount?: number
  date?: string
  note?: string
}

export function validateInvestmentMovement(input: InvestmentMovementInput, investment?: Investment): string[] {
  const errors: string[] = []
  if (!investment) errors.push("Investimento não encontrado.")
  if (input.type !== "contribution" && input.type !== "withdrawal" && input.type !== "value-update") {
    errors.push("Selecione o tipo de movimentação.")
  }
  if (input.type === "value-update") {
    if (!isNonNegativeAmount(input.amount ?? Number.NaN)) errors.push("Informe um valor atual válido.")
  } else if (!isPositiveAmount(input.amount ?? Number.NaN)) {
    errors.push("Informe um valor maior que zero.")
  }
  if (!isValidDateValue(input.date)) errors.push("Informe uma data válida.")
  if (investment && input.type === "withdrawal" && (input.amount ?? 0) > investment.currentValue) {
    errors.push("O resgate não pode ser maior que o valor atual.")
  }
  return errors
}

export function validateExistingTransaction(input: Transaction): string[] {
  return validateTransaction(input)
}
