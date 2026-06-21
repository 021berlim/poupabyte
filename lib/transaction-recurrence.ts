import { isValidDateValue } from "./finance"
import { formatDate } from "./format"
import type {
  RecurrenceDurationKind,
  RecurrenceFrequency,
  RecurrenceKind,
  Subscription,
  SubscriptionFrequency,
  Transaction,
  TransactionRecurrence,
} from "./types"

export const RECURRENCE_KIND_LABELS: Record<RecurrenceKind, string> = {
  subscription: "Assinatura",
  fixed: "Conta fixa",
  custom: "Outra recorrência",
}

export const RECURRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
}

export const RECURRENCE_DURATION_LABELS: Record<RecurrenceDurationKind, string> = {
  indefinite: "Sem prazo definido",
  until: "Até uma data",
  count: "Número de cobranças",
}

export type RecurrenceFormState = {
  enabled: boolean
  kind: RecurrenceKind
  frequency: RecurrenceFrequency
  durationKind: RecurrenceDurationKind
  billingDay: string
  endDate: string
  occurrenceCount: string
}

export function defaultRecurrenceFormState(date = new Date().toISOString()): RecurrenceFormState {
  const billingDay = String(new Date(date).getDate())
  return {
    enabled: false,
    kind: "subscription",
    frequency: "monthly",
    durationKind: "indefinite",
    billingDay,
    endDate: "",
    occurrenceCount: "12",
  }
}

export function recurrenceFormStateFromTransaction(
  transaction?: Pick<Transaction, "date" | "recurrence" | "isFixed" | "isRecurring" | "isSubscription">,
): RecurrenceFormState {
  const defaults = defaultRecurrenceFormState(transaction?.date)
  const recurrence = transaction?.recurrence ?? inferRecurrenceFromLegacy(transaction)
  if (!recurrence) return defaults

  return {
    enabled: true,
    kind: recurrence.kind,
    frequency: recurrence.frequency,
    durationKind: recurrence.durationKind,
    billingDay: String(recurrence.billingDay),
    endDate: recurrence.endDate?.slice(0, 10) ?? "",
    occurrenceCount: recurrence.occurrenceCount ? String(recurrence.occurrenceCount) : defaults.occurrenceCount,
  }
}

export function inferRecurrenceFromLegacy(
  transaction?: Pick<Transaction, "date" | "isFixed" | "isRecurring" | "isSubscription">,
): TransactionRecurrence | undefined {
  if (!transaction) return undefined
  if (!transaction.isRecurring && !transaction.isFixed && !transaction.isSubscription) return undefined

  const kind: RecurrenceKind = transaction.isSubscription
    ? "subscription"
    : transaction.isFixed
      ? "fixed"
      : "custom"

  return {
    kind,
    frequency: "monthly",
    durationKind: "indefinite",
    billingDay: new Date(transaction.date).getDate(),
  }
}

export function validateRecurrenceForm(
  form: RecurrenceFormState,
  transactionDate?: string,
): string[] {
  if (!form.enabled) return []

  const errors: string[] = []
  const billingDay = Number.parseInt(form.billingDay, 10)
  if (!Number.isFinite(billingDay) || billingDay < 1 || billingDay > 31) {
    errors.push("Informe um dia de cobrança entre 1 e 31.")
  }

  if (form.durationKind === "until") {
    if (!isValidDateValue(form.endDate)) {
      errors.push("Informe a data final da recorrência.")
    } else if (transactionDate && isValidDateValue(transactionDate)) {
      const start = new Date(transactionDate.length === 10 ? `${transactionDate}T12:00:00` : transactionDate)
      const end = new Date(`${form.endDate}T12:00:00`)
      if (end.getTime() < start.getTime()) {
        errors.push("A data final deve ser igual ou posterior à data do lançamento.")
      }
    }
  }

  if (form.durationKind === "count") {
    const count = Number.parseInt(form.occurrenceCount, 10)
    if (!Number.isFinite(count) || count < 2) {
      errors.push("Informe pelo menos 2 cobranças para uma recorrência limitada.")
    }
  }

  return errors
}

export function buildRecurrenceFromForm(form: RecurrenceFormState): TransactionRecurrence | undefined {
  if (!form.enabled) return undefined

  const billingDay = Number.parseInt(form.billingDay, 10)
  const recurrence: TransactionRecurrence = {
    kind: form.kind,
    frequency: form.frequency,
    durationKind: form.durationKind,
    billingDay,
  }

  if (form.durationKind === "until" && form.endDate) {
    recurrence.endDate = new Date(`${form.endDate}T12:00:00`).toISOString()
  }

  if (form.durationKind === "count") {
    recurrence.occurrenceCount = Number.parseInt(form.occurrenceCount, 10)
  }

  return recurrence
}

export function applyRecurrenceFlags<T extends Omit<Transaction, "id">>(transaction: T): T {
  if (!transaction.recurrence) {
    return {
      ...transaction,
      isFixed: undefined,
      isRecurring: undefined,
      isSubscription: undefined,
      subscriptionId: undefined,
    }
  }

  const { kind } = transaction.recurrence
  return {
    ...transaction,
    isRecurring: true,
    isFixed: kind === "fixed" ? true : undefined,
    isSubscription: kind === "subscription" ? true : undefined,
    source:
      transaction.source ??
      (kind === "fixed" ? "fixed" : kind === "subscription" ? "recurring" : "manual"),
  }
}

export function recurrenceEndDate(transaction: Pick<Transaction, "date" | "recurrence">): Date | null {
  const recurrence = transaction.recurrence
  if (!recurrence) return null

  if (recurrence.durationKind === "until" && recurrence.endDate) {
    return new Date(recurrence.endDate)
  }

  if (recurrence.durationKind === "count" && recurrence.occurrenceCount) {
    const end = new Date(transaction.date)
    const extra = Math.max(0, recurrence.occurrenceCount - 1)
    if (recurrence.frequency === "weekly") end.setDate(end.getDate() + extra * 7)
    else if (recurrence.frequency === "monthly") end.setMonth(end.getMonth() + extra)
    else end.setFullYear(end.getFullYear() + extra)
    return end
  }

  return null
}

type RecurrenceSource = Pick<
  Transaction,
  "date" | "recurrence" | "isFixed" | "isRecurring" | "isSubscription"
>

export function isRecurrenceActive(transaction: RecurrenceSource, ref = new Date()): boolean {
  const recurrence = transaction.recurrence ?? inferRecurrenceFromLegacy(transaction)
  if (!recurrence) return false

  const end = recurrenceEndDate({ ...transaction, recurrence })
  if (!end) return true
  return end.getTime() >= new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 12).getTime()
}

export function formatRecurrenceSummary(transaction: RecurrenceSource): string | null {
  const recurrence = transaction.recurrence ?? inferRecurrenceFromLegacy(transaction)
  if (!recurrence) return null

  const parts = [
    RECURRENCE_KIND_LABELS[recurrence.kind],
    RECURRENCE_FREQUENCY_LABELS[recurrence.frequency].toLowerCase(),
  ]

  if (recurrence.durationKind === "until" && recurrence.endDate) {
    parts.push(`até ${formatDate(recurrence.endDate)}`)
  } else if (recurrence.durationKind === "count" && recurrence.occurrenceCount) {
    parts.push(`${recurrence.occurrenceCount} cobranças`)
  } else {
    parts.push("sem prazo")
  }

  if (recurrence.frequency !== "weekly") {
    parts.push(`dia ${recurrence.billingDay}`)
  }

  return parts.join(" · ")
}

export function subscriptionFrequencyFromRecurrence(
  frequency: RecurrenceFrequency,
): SubscriptionFrequency {
  return frequency === "yearly" ? "yearly" : "monthly"
}

export function buildSubscriptionFromTransaction(
  transaction: Pick<Transaction, "description" | "amount" | "category" | "date" | "recurrence">,
): Omit<Subscription, "id"> {
  const recurrence = transaction.recurrence!
  return {
    name: transaction.description,
    amount: transaction.amount,
    category: transaction.category,
    billingDay: recurrence.billingDay,
    frequency: subscriptionFrequencyFromRecurrence(recurrence.frequency),
    active: isRecurrenceActive({ date: transaction.date, recurrence }),
  }
}

export function normalizeTransactionRecurrence(transaction: Transaction): Transaction {
  const recurrence = transaction.recurrence ?? inferRecurrenceFromLegacy(transaction)
  if (!recurrence) return transaction
  return applyRecurrenceFlags({ ...transaction, recurrence })
}

export type SubscriptionSyncPlan = {
  subscriptionId?: string
  add?: Omit<Subscription, "id">
  update?: Subscription
  deactivateId?: string
}

export function planSubscriptionSync(
  transaction: Pick<Transaction, "description" | "amount" | "category" | "date" | "recurrence" | "subscriptionId">,
  subscriptions: Subscription[],
): SubscriptionSyncPlan {
  if (transaction.recurrence?.kind !== "subscription") {
    if (transaction.subscriptionId) {
      return { deactivateId: transaction.subscriptionId, subscriptionId: undefined }
    }
    return {}
  }

  const payload = buildSubscriptionFromTransaction(transaction)

  if (transaction.subscriptionId) {
    const existing = subscriptions.find((item) => item.id === transaction.subscriptionId)
    if (existing) {
      return {
        subscriptionId: existing.id,
        update: { ...existing, ...payload },
      }
    }
  }

  const byName = subscriptions.find(
    (item) => item.name.trim().toLowerCase() === transaction.description.trim().toLowerCase(),
  )
  if (byName) {
    return {
      subscriptionId: byName.id,
      update: { ...byName, ...payload },
    }
  }

  return {
    add: payload,
  }
}