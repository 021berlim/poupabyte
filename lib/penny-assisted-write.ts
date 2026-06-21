import { CATEGORIES, getCategory, isSystemCategoryId } from "./categories"
import { normalizePennyText } from "./penny-knowledge/query-utils"
import { establishmentKey, isPendingReview } from "./transaction-utils"
import type { CategoryRef, Transaction, UserCategory } from "./types"

export type AssistedWriteAction = "categorize" | "confirm" | "categorize_and_confirm"

export type AssistedWritePlan = {
  id: string
  action: AssistedWriteAction
  transactionIds: string[]
  categoryId?: CategoryRef
  categoryLabel?: string
  merchantTerms: string[]
  summary: string
  confirmationPrompt: string
  sampleDescriptions: string[]
}

const CONFIRMATION_PATTERNS = [
  /^(sim|confirma|confirmo|pode fazer|pode|ok|okay|vai|faz|execute|manda ver|bora)[!.?]*$/i,
  /^(sim|confirma|confirmo|pode fazer|pode|ok)\s*[,.]?\s*(pode|por favor|pfv)?[!.?]*$/i,
]

const WRITE_INTENT_PATTERN =
  /\b(categoriz|recategoriz|marca|marcar|classific|confirmar|confirma|aprovar|validar|organiz[ae]r)\b.*\b(lancamento|lançamento|movimentac|movimentaç|transac|pendente|importad|uber|ifood|pix)\b|\b(categoriz|recategoriz|marca|marcar|classific).*\bcomo\b|\bconfirmar\b.*\b(pendente|similar|lancamento|lançamento)\b/i

const CATEGORY_HINT_PATTERN = /\bcomo\s+([a-zà-ú0-9\s-]{3,40})/i
const MERCHANT_PATTERNS = [
  /\b(?:da|de|do)\s+([a-z0-9][a-z0-9\s-]{2,30})/i,
  /\b(uber|ifood|netflix|spotify|amazon|mercado|farmacia|farmácia|padaria)\b/i,
]

export function isExplicitConfirmation(message: string): boolean {
  const normalized = message.trim().replace(/\s+/g, " ")
  return CONFIRMATION_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function hasAssistedWriteIntent(message: string): boolean {
  const normalized = normalizePennyText(message)
  if (isExplicitConfirmation(message) && normalized.split(" ").length <= 4) return false
  return WRITE_INTENT_PATTERN.test(normalized) || /\bcomo\s+(transporte|alimentacao|moradia|lazer|saude|educacao)\b/.test(normalized)
}

export function resolveCategoryFromText(
  text: string,
  userCategories: UserCategory[] = [],
): { category: CategoryRef; label: string } | null {
  const normalized = normalizePennyText(text)

  for (const category of Object.values(CATEGORIES)) {
    const label = normalizePennyText(category.label)
    if (normalized.includes(label)) {
      return { category: category.id, label: category.label }
    }
  }

  for (const category of userCategories) {
    const label = normalizePennyText(category.name)
    if (normalized.includes(label)) {
      return { category: category.id, label: category.name }
    }
  }

  for (const token of normalized.split(" ")) {
    if (isSystemCategoryId(token)) {
      return { category: token, label: getCategory(token).label }
    }
  }

  return null
}

function extractMerchantTerms(question: string): string[] {
  const normalized = normalizePennyText(question)
  const terms = new Set<string>()

  for (const pattern of MERCHANT_PATTERNS) {
    const match = normalized.match(pattern)
    if (!match?.[1]) continue
    const term = match[1].trim()
    if (term.length >= 3) terms.add(term)
  }

  const words = normalized
    .split(" ")
    .filter((word) => word.length >= 4)
    .filter((word) => !["categoriza", "categorizar", "confirma", "confirmar", "lancamentos", "lancamento", "movimentacoes", "como", "esses", "essas", "pendentes"].includes(word))

  for (const word of words.slice(0, 3)) terms.add(word)

  return [...terms]
}

function detectAction(question: string, hasCategory: boolean): AssistedWriteAction {
  const normalized = normalizePennyText(question)
  const wantsConfirm = /\b(confirmar|confirma|aprovar|validar)\b/.test(normalized)
  const wantsCategorize = /\b(categoriz|recategoriz|marca|marcar|classific|como)\b/.test(normalized)

  if (wantsCategorize && wantsConfirm) return "categorize_and_confirm"
  if (wantsCategorize && hasCategory) return "categorize_and_confirm"
  if (wantsCategorize) return "categorize"
  if (wantsConfirm) return "confirm"
  return hasCategory ? "categorize_and_confirm" : "confirm"
}

function matchTransactions(
  transactions: Transaction[],
  merchantTerms: string[],
  onlyPending: boolean,
): Transaction[] {
  const pool = onlyPending ? transactions.filter(isPendingReview) : transactions
  if (!merchantTerms.length) return pool.filter(isPendingReview)

  const matched = pool.filter((transaction) => {
    const description = normalizePennyText(transaction.description)
    const key = normalizePennyText(establishmentKey(transaction.description))
    return merchantTerms.some(
      (term) => description.includes(term) || key.includes(term.toUpperCase()),
    )
  })

  if (matched.length) return matched

  if (merchantTerms.length === 1) {
    const [term] = merchantTerms
    return pool.filter((transaction) => normalizePennyText(transaction.description).includes(term))
  }

  return []
}

export function buildAssistedWritePlan(
  transactions: Transaction[],
  question: string,
  userCategories: UserCategory[] = [],
): AssistedWritePlan | null {
  if (!hasAssistedWriteIntent(question) && !isExplicitConfirmation(question)) return null

  const categoryHint = question.match(CATEGORY_HINT_PATTERN)?.[1] ?? question
  const resolvedCategory = resolveCategoryFromText(categoryHint, userCategories)
  const merchantTerms = extractMerchantTerms(question)
  const action = detectAction(question, Boolean(resolvedCategory))
  const onlyPending = action !== "confirm" || merchantTerms.length > 0
  let matched = matchTransactions(transactions, merchantTerms, onlyPending)

  if (!matched.length && action === "confirm") {
    matched = transactions.filter(isPendingReview)
  }

  if (!matched.length) return null

  const grouped = new Map<string, Transaction[]>()
  for (const transaction of matched) {
    const key = establishmentKey(transaction.description)
    const bucket = grouped.get(key) ?? []
    bucket.push(transaction)
    grouped.set(key, bucket)
  }

  const primaryGroup = [...grouped.values()].sort((a, b) => b.length - a.length)[0] ?? matched
  const transactionIds = primaryGroup.map((transaction) => transaction.id)
  const sampleDescriptions = [...new Set(primaryGroup.map((transaction) => transaction.description))].slice(0, 3)
  const merchantLabel = sampleDescriptions[0] ?? "lançamentos selecionados"
  const count = transactionIds.length
  const categoryLabel = resolvedCategory?.label

  let summary = ""
  let confirmationPrompt = ""

  if (action === "confirm") {
    summary = `${count} lançamento(s) pendente(s) de ${merchantLabel} aguardam confirmação.`
    confirmationPrompt = `Quer que eu confirme ${count === 1 ? "esse lançamento" : `os ${count} lançamentos`}?`
  } else if (action === "categorize" && categoryLabel) {
    summary = `${count} lançamento(s) de ${merchantLabel} estão sem categoria ou pendentes.`
    confirmationPrompt = `Quer que eu marque ${count === 1 ? "esse lançamento" : `os ${count}`} como ${categoryLabel}?`
  } else if (categoryLabel) {
    summary = `${count} lançamento(s) de ${merchantLabel} podem ser organizados como ${categoryLabel}.`
    confirmationPrompt = `Quer que eu marque ${count === 1 ? "esse lançamento" : `os ${count}`} como ${categoryLabel} e confirme em Movimentações?`
  } else {
    summary = `${count} lançamento(s) pendente(s) encontrados.`
    confirmationPrompt = `Quer que eu confirme ${count === 1 ? "esse lançamento" : `os ${count} lançamentos`}?`
  }

  return {
    id: `plan-${Date.now()}`,
    action: categoryLabel && action === "confirm" ? "categorize_and_confirm" : action,
    transactionIds,
    categoryId: resolvedCategory?.category,
    categoryLabel,
    merchantTerms,
    summary,
    confirmationPrompt,
    sampleDescriptions,
  }
}

export function buildUpdatedTransactions(
  transactions: Transaction[],
  plan: AssistedWritePlan,
): Transaction[] {
  const byId = new Map(transactions.map((transaction) => [transaction.id, transaction]))

  return plan.transactionIds
    .map((id) => {
      const current = byId.get(id)
      if (!current) return null

      const next: Transaction = { ...current }

      if (plan.categoryId) {
        next.category = plan.categoryId
      }

      next.needsReview = false

      return next
    })
    .filter((transaction): transaction is Transaction => Boolean(transaction))
}

export function formatAssistedWriteSuccess(plan: AssistedWritePlan, updatedCount: number): string {
  if (!updatedCount) {
    return "Não consegui aplicar essa organização — os lançamentos podem ter mudado. Confere em Movimentações?"
  }

  if (plan.action === "confirm") {
    return `Pronto, ${updatedCount} ${updatedCount === 1 ? "lançamento foi confirmado" : "lançamentos foram confirmados"}. Se algum não fizer sentido, dá pra ajustar em Movimentações.`
  }

  if (plan.categoryLabel) {
    return `Pronto, ${updatedCount} ${updatedCount === 1 ? "foi categorizado" : "foram categorizados"} como ${plan.categoryLabel}${plan.action === "categorize_and_confirm" ? " e confirmados" : ""}. Se algum não fizer sentido, dá pra ajustar em Movimentações.`
  }

  return `Pronto, organizei ${updatedCount} lançamento(s). Dá pra revisar em Movimentações.`
}

export const PENDING_ASSISTED_WRITE_PLAN_KEY = "poupabyte:penny:pending-write-plan"

export function readPendingAssistedWritePlan(): AssistedWritePlan | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(PENDING_ASSISTED_WRITE_PLAN_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AssistedWritePlan
  } catch {
    return null
  }
}

export function writePendingAssistedWritePlan(plan: AssistedWritePlan | null) {
  if (typeof window === "undefined") return
  if (!plan) {
    window.sessionStorage.removeItem(PENDING_ASSISTED_WRITE_PLAN_KEY)
    return
  }
  window.sessionStorage.setItem(PENDING_ASSISTED_WRITE_PLAN_KEY, JSON.stringify(plan))
}