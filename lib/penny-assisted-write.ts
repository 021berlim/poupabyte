import { CATEGORIES, getCategory, isSystemCategoryId } from "./categories"
import { formatCurrency, formatDate } from "./format"
import { normalizePennyText } from "./penny-knowledge/query-utils"
import { establishmentKey, isPendingReview } from "./transaction-utils"
import type { CategoryRef, Transaction, TransactionType, UserCategory } from "./types"

export type AssistedWriteAction = "categorize" | "confirm" | "categorize_and_confirm" | "create"

export type ProposedTransaction = Omit<Transaction, "id">

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
  proposedTransaction?: ProposedTransaction
}

export type AssistedWritePlanOptions = {
  createEnabled?: boolean
}

const CONFIRMATION_PATTERNS = [
  /^(sim|confirma|confirmo|pode fazer|pode|ok|okay|vai|faz|execute|manda ver|bora)[!.?]*$/i,
  /^(sim|confirma|confirmo|pode fazer|pode|ok)\s*[,.]?\s*(pode|por favor|pfv)?[!.?]*$/i,
]

const ORGANIZE_INTENT_PATTERN =
  /\b(categoriz|recategoriz|marca|marcar|classific|confirmar|confirma|aprovar|validar|organiz[ae]r)\b.*\b(lancamento|lançamento|movimentac|movimentaç|transac|pendente|importad|uber|ifood|pix)\b|\b(categoriz|recategoriz|marca|marcar|classific).*\bcomo\b|\bconfirmar\b.*\b(pendente|similar|lancamento|lançamento)\b/i

const CREATE_INTENT_PATTERN =
  /\b(registra|registrar|adiciona|adicionar|inclui|incluir|anota|anotar|cadastra|cadastrar|cria|criar|lanca|lancar|insere|inserir)\b.*\b(lancamento|despesa|receita|gasto|movimentac|transac)\b|\b(despesa|receita|gasto)\s+(de\s+)?(?:r\s*)?\d|\b(?:r\s*)?\d+\s*(?:reais?|real)\b|\bpaguei\s+(?:r\s*)?\d/i

const CATEGORY_HINT_PATTERN = /\bcomo\s+([a-zà-ú0-9\s-]{3,40})/i
const MERCHANT_PATTERNS = [
  /\b(?:da|de|do)\s+([a-z0-9][a-z0-9\s-]{2,30})/i,
  /\b(uber|ifood|netflix|spotify|amazon|mercado|farmacia|farmácia|padaria)\b/i,
]

const AMOUNT_PATTERNS = [
  /(?:r\s*\$?\s*)(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/i,
  /(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*reais?\b/i,
]

const QUOTED_DESCRIPTION_PATTERN = /["'“”‘’]([^"'“”‘’]{2,80})["'“”‘’]/
const DATE_PATTERN = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/

export function isExplicitConfirmation(message: string): boolean {
  const normalized = message.trim().replace(/\s+/g, " ")
  return CONFIRMATION_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function hasCreateIntent(message: string): boolean {
  const normalized = normalizePennyText(message)
  if (isExplicitConfirmation(message) && normalized.split(" ").length <= 4) return false
  if (ORGANIZE_INTENT_PATTERN.test(normalized) && !CREATE_INTENT_PATTERN.test(normalized)) return false
  return CREATE_INTENT_PATTERN.test(normalized)
}

export function hasOrganizeWriteIntent(message: string): boolean {
  const normalized = normalizePennyText(message)
  if (isExplicitConfirmation(message) && normalized.split(" ").length <= 4) return false
  return (
    ORGANIZE_INTENT_PATTERN.test(normalized) ||
    /\bcomo\s+(transporte|alimentacao|moradia|lazer|saude|educacao)\b/.test(normalized)
  )
}

export function hasAssistedWriteIntent(message: string): boolean {
  return hasOrganizeWriteIntent(message) || hasCreateIntent(message)
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

function parseBrazilianAmount(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "")
  if (!normalized) return null

  const hasComma = normalized.includes(",")
  const numeric = hasComma
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized.replace(/\./g, "")

  const value = Number(numeric)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function parseAmountFromText(text: string): number | null {
  for (const source of [text, normalizePennyText(text)]) {
    for (const pattern of AMOUNT_PATTERNS) {
      const match = source.match(pattern)
      if (!match?.[1]) continue
      const parsed = parseBrazilianAmount(match[1])
      if (parsed) return parsed
    }
  }
  return null
}

function parseTransactionType(text: string): TransactionType {
  const normalized = normalizePennyText(text)
  if (/\b(receita|salario|salário|ganhei|entrada|renda)\b/.test(normalized)) return "income"
  return "expense"
}

function defaultCategoryForType(type: TransactionType): CategoryRef {
  return type === "income" ? "outras-receitas" : "nao-categorizado"
}

function toIsoDate(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString()
}

function parseDateFromText(text: string, now = new Date()): string {
  const normalized = normalizePennyText(text)

  if (/\bhoje\b/.test(normalized)) {
    return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
  }

  if (/\bontem\b/.test(normalized)) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return toIsoDate(yesterday.getFullYear(), yesterday.getMonth() + 1, yesterday.getDate())
  }

  const match = text.match(DATE_PATTERN)
  if (match) {
    const day = Number(match[1])
    const month = Number(match[2])
    let year = match[3] ? Number(match[3]) : now.getFullYear()
    if (year < 100) year += 2000
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return toIsoDate(year, month, day)
    }
  }

  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function extractDescription(question: string, merchantTerms: string[]): string | null {
  const quoted = question.match(QUOTED_DESCRIPTION_PATTERN)?.[1]?.trim()
  if (quoted) return titleCase(quoted)

  if (merchantTerms.length) return titleCase(merchantTerms[0])

  const normalized = normalizePennyText(question)
  const beforeAmount = normalized.split(/\br\s*\d|\breais?\b/)[0] ?? normalized
  const cleaned = beforeAmount
    .replace(
      /\b(registra|registrar|adiciona|adicionar|cria|criar|lanca|lança|lançar|inclui|incluir|anota|anotar|cadastra|cadastrar|despesa|receita|gasto|de|da|do|um|uma|novo|nova)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim()

  const words = cleaned
    .split(" ")
    .filter((word) => word.length >= 3)
    .filter(
      (word) =>
        ![
          "como",
          "para",
          "hoje",
          "ontem",
          "transporte",
          "alimentacao",
          "moradia",
          "lazer",
          "saude",
          "educacao",
        ].includes(word),
    )

  if (!words.length) return null
  return titleCase(words.slice(0, 4).join(" "))
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
    .filter(
      (word) =>
        ![
          "registra",
          "registrar",
          "adiciona",
          "adicionar",
          "cria",
          "criar",
          "lancamento",
          "lancamentos",
          "despesa",
          "receita",
          "gasto",
          "reais",
          "real",
          "como",
          "hoje",
          "ontem",
        ].includes(word),
    )

  for (const word of words.slice(0, 3)) terms.add(word)

  return [...terms]
}

export function buildProposedTransaction(
  question: string,
  userCategories: UserCategory[] = [],
  now = new Date(),
): ProposedTransaction | null {
  const amount = parseAmountFromText(question)
  if (!amount) return null

  const merchantTerms = extractMerchantTerms(question)
  const description = extractDescription(question, merchantTerms)
  if (!description) return null

  const type = parseTransactionType(question)
  const categoryHint = question.match(CATEGORY_HINT_PATTERN)?.[1] ?? question
  const resolvedCategory = resolveCategoryFromText(categoryHint, userCategories)
  const category = resolvedCategory?.category ?? defaultCategoryForType(type)
  const needsReview = type === "expense" && category === "nao-categorizado"

  return {
    type,
    description,
    amount,
    category,
    date: parseDateFromText(question, now),
    source: "manual",
    needsReview: needsReview || undefined,
  }
}

function buildCreatePlan(
  question: string,
  userCategories: UserCategory[] = [],
  createEnabled = false,
): AssistedWritePlan | null {
  if (!hasCreateIntent(question)) return null

  const proposedTransaction = buildProposedTransaction(question, userCategories)
  if (!proposedTransaction) return null

  const categoryLabel =
    resolveCategoryFromText(question, userCategories)?.label ??
    (proposedTransaction.category !== "nao-categorizado"
      ? getCategory(proposedTransaction.category).label
      : undefined)
  const typeLabel = proposedTransaction.type === "income" ? "receita" : "despesa"
  const amountLabel = formatCurrency(proposedTransaction.amount)
  const dateLabel = formatDate(proposedTransaction.date)

  const summary = createEnabled
    ? `Posso registrar uma ${typeLabel} de ${amountLabel} (${proposedTransaction.description}) em ${dateLabel}${categoryLabel ? `, categoria ${categoryLabel}` : ""}.`
    : "A criação assistida de lançamentos está desativada na sua conta."

  const confirmationPrompt = createEnabled
    ? `Quer que eu registre essa ${typeLabel} de ${amountLabel} como "${proposedTransaction.description}"${categoryLabel ? ` em ${categoryLabel}` : ""}?`
    : "Ative em Minha conta → Preferências a opção de permitir que a P.E.N.N.Y. crie lançamentos, se quiser que eu registre isso por aqui."

  return {
    id: `plan-${Date.now()}`,
    action: "create",
    transactionIds: [],
    categoryId: proposedTransaction.category,
    categoryLabel,
    merchantTerms: extractMerchantTerms(question),
    summary,
    confirmationPrompt,
    sampleDescriptions: [proposedTransaction.description],
    proposedTransaction: createEnabled ? proposedTransaction : undefined,
  }
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
  options: AssistedWritePlanOptions = {},
): AssistedWritePlan | null {
  const createEnabled = options.createEnabled ?? false

  if (hasCreateIntent(question)) {
    const createPlan = buildCreatePlan(question, userCategories, createEnabled)
    if (createPlan) return createPlan
  }

  if (!hasOrganizeWriteIntent(question) && !isExplicitConfirmation(question)) return null

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
  if (plan.action === "create") {
    if (!updatedCount || !plan.proposedTransaction) {
      return "Não consegui registrar esse lançamento — confere os dados ou adiciona em Movimentações."
    }

    const { proposedTransaction } = plan
    const typeLabel = proposedTransaction.type === "income" ? "receita" : "despesa"
    return `Pronto, registrei a ${typeLabel} "${proposedTransaction.description}" de ${formatCurrency(proposedTransaction.amount)}. Dá pra revisar em Movimentações.`
  }

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