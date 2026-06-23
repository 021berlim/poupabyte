import { suggestImportCategory } from "./auto-categorize"
import type { CategoryContext } from "./category-system"
import {
  parseInterStatementStructured,
  type InterStatementTransaction,
  type InterStatementValidation,
} from "./inter-statement-parser"
import {
  parseBradescoStatementStructured,
  type BradescoStatementResult,
  type BradescoStatementTransaction,
  type BradescoStatementValidation,
} from "./bradesco-statement-parser"
import type { CategoryId, CategoryRef, CategoryRule, TransactionType, UserCategory } from "./types"

export type StatementBank = "auto" | "inter" | "bradesco" | "itau" | "nubank" | "other"
export type DetectedStatementBank = Exclude<StatementBank, "auto">

export interface ParsedStatementTransaction {
  date: string
  description: string
  amount: number
  type: TransactionType
  category: CategoryRef
  subcategoryId?: `uc_${string}`
  confidence: number
}

export interface StatementParseResult {
  bank: DetectedStatementBank
  transactions: ParsedStatementTransaction[]
  usedAi: boolean
  interValidation?: InterStatementValidation
  bradescoValidation?: BradescoStatementValidation
  bradescoStructured?: BradescoStatementResult
}

const INTER_MARKERS = [
  "PIX ENVIADO:",
  "PIX RECEBIDO:",
  "PIX RECEBIDO DEVOLVIDO:",
  "COMPRA NO DEBITO:",
  "COMPRA INTER CEL:",
  "CASHBACK:",
]

const BRADESCO_TYPES = [
  "PIX RECEBIDO",
  "PIX ENVIADO",
  "PIX QR CODE DINAMICO",
  "PIX QR CODE ESTATICO",
  "COMPRA ELO DEBITO VISTA",
  "PAGAMENTO GOVERNO RJ",
  "RENDIMENTOS",
] as const

const CATEGORY_RULES: Array<{ category: CategoryId; terms: string[] }> = [
  { category: "alimentacao", terms: ["MERCADO", "SUPERMERCADO", "HORTIFRUTI", "PADARIA", "RESTAURANTE", "IFOOD", "RAPPI", "DELIVERY", "LANCHONETE", "BURGER", "PIZZA"] },
  { category: "transporte", terms: ["UBER", "99 TECNOLOGIA", "99APP", "METRO", "METRÔ", "ONIBUS", "ÔNIBUS", "TREM", "POSTO", "COMBUSTIVEL", "COMBUSTÍVEL", "GASOLINA", "ESTACIONAMENTO"] },
  { category: "moradia", terms: ["ALUGUEL", "CONDOMINIO", "CONDOMÍNIO", "LUZ", "ENERGIA", "CEMIG", "ENEL", "LIGHT", "AGUA", "ÁGUA", "INTERNET", "VIVO", "CLARO", "TIM", "GAS", "GÁS", "CONTA DE LUZ", "CONTA DE AGUA"] },
  { category: "saude", terms: ["FARMACIA", "FARMÁCIA", "DROGARIA", "DROGASIL", "RAIA", "DROGA", "MEDICO", "MÉDICO", "CONSULTA", "EXAME", "PLANO DE SAUDE", "UNIMED", "AMIL"] },
  { category: "educacao", terms: ["CURSO", "ESCOLA", "FACULDADE", "UNIVERSIDADE", "LIVRO", "MATERIAL ESCOLAR", "UDEMY", "ALURA"] },
  { category: "lazer", terms: ["CINEMA", "INGRESSO", "INGRESSO.COM", "BAR", "PASSEIO", "JOGOS", "STEAM", "PLAYSTATION", "XBOX"] },
  { category: "assinaturas", terms: ["NETFLIX", "SPOTIFY", "AMAZON PRIME", "DISNEY", "YOUTUBE", "NOTION", "CANVA", "ICLOUD", "GOOGLE DRIVE", "INTER PRE", "APPLE.COM/BILL"] },
  { category: "compras", terms: ["AMAZON", "MERCADO LIVRE", "SHOPEE", "SHEIN", "MAGAZINE", "CASAS BAHIA", "AMERICANAS"] },
  { category: "dividas", terms: ["EMPRESTIMO", "EMPRÉSTIMO", "FINANCIAMENTO", "PARCELA", "JUROS", "FATURA", "CETELEM", "CREDITAS"] },
  { category: "investimentos", terms: ["CDB", "TESOURO", "CORRETORA", "INVESTIMENTO", "APLICACAO", "APLICAÇÃO", "XP INVEST", "RICO", "NUINVEST"] },
  { category: "aportes", terms: ["APORTE"] },
  { category: "impostos-e-taxas", terms: ["IMPOSTO", "TAXA", "TARIFA", "IOF", "DARF", "IPTU", "IPVA"] },
  { category: "pets", terms: ["PET", "PETZ", "COBASI", "VETERINAR"] },
  { category: "familia", terms: ["ESCOLA FILHO", "FRALDA", "BERÇARIO", "BERÇÁRIO"] },
]

const INCOME_TERMS = ["SALARIO", "SALÁRIO", "PIX RECEBIDO", "TRANSFERENCIA RECEBIDA", "TRANSFERÊNCIA RECEBIDA", "REEMBOLSO", "RENDIMENTO", "DIVIDENDO", "PAGAMENTO GOVERNO", "RENDIMENTOS", "CASHBACK", "PROVENTO"]

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
}

function parseMoney(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")
  const amount = Number.parseFloat(cleaned)
  return Math.abs(amount)
}

function brDateToIso(value: string, fallbackYear?: number) {
  const parts = value.split("/")
  if (parts.length === 3) {
    const [day, month, year] = parts
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  if (parts.length === 2 && fallbackYear) {
    const [day, month] = parts
    return `${fallbackYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  return ""
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

export interface StatementCategorizeContext {
  userCategories?: UserCategory[]
  hiddenSystemCategories?: CategoryId[]
  categoryRules?: CategoryRule[]
}

export function suggestStatementCategory(
  description: string,
  type: TransactionType,
  ctx: StatementCategorizeContext = {},
): { category: CategoryRef; subcategoryId?: `uc_${string}`; confidence: number } {
  const categoryCtx: CategoryContext = {
    userCategories: ctx.userCategories ?? [],
    hiddenSystemCategories: ctx.hiddenSystemCategories ?? [],
  }
  const result = suggestImportCategory(description, type, categoryCtx, ctx.categoryRules ?? [])
  return {
    category: result.category,
    subcategoryId: result.subcategoryId,
    confidence: result.confidence,
  }
}

function inferType(description: string, signedValue: string, creditDebit?: string): TransactionType {
  const text = normalized(description)
  if (creditDebit) {
    const marker = normalized(creditDebit)
    if (marker === "C" || marker === "CREDITO" || marker === "CRÉDITO") return "income"
    if (marker === "D" || marker === "DEBITO" || marker === "DÉBITO") return "expense"
  }
  if (signedValue.startsWith("-")) return "expense"
  if (containsAny(text, INCOME_TERMS)) return "income"
  return "expense"
}

export function detectStatementBank(text: string): DetectedStatementBank {
  const content = normalized(text)
  if (content.includes("INSTITUICAO: BANCO INTER") || INTER_MARKERS.filter((marker) => content.includes(marker)).length >= 2) {
    return "inter"
  }
  if (content.includes("BRADESCO CELULAR") || BRADESCO_TYPES.filter((marker) => content.includes(marker)).length >= 2) {
    return "bradesco"
  }
  if (content.includes("ITAU")) return "itau"
  if (content.includes("NUBANK") || content.includes("NU PAGAMENTOS")) return "nubank"
  return "other"
}

function interTransactionDescription(tx: InterStatementTransaction): string {
  if (tx.contraparte) return `${tx.tipo_raw} - ${tx.contraparte}`
  if (tx.estabelecimento) return tx.estabelecimento
  if (tx.tipo_categoria === "CASHBACK") {
    return `${tx.tipo_raw} - ${tx.descricao_raw}`
  }
  if (
    tx.tipo_categoria === "COMPRA_INTER_CEL" ||
    tx.tipo_categoria === "OUTROS"
  ) {
    return tx.descricao_raw
  }
  return `${tx.tipo_raw} - ${tx.descricao_raw}`
}

function inferInterTransactionType(tx: InterStatementTransaction): TransactionType {
  return tx.valor < 0 ? "expense" : "income"
}

function interTransactionToParsed(tx: InterStatementTransaction): ParsedStatementTransaction {
  const description = interTransactionDescription(tx)
  const type = inferInterTransactionType(tx)
  const suggestion = suggestStatementCategory(description, type)
  return {
    date: tx.data,
    description,
    amount: Math.abs(tx.valor),
    type,
    category: suggestion.category,
    subcategoryId: suggestion.subcategoryId,
    confidence: suggestion.confidence,
  }
}

export function parseInterStatement(text: string): ParsedStatementTransaction[] {
  return parseInterStatementStructured(text).transacoes.map(interTransactionToParsed)
}

export function parseInterStatementWithValidation(text: string) {
  const result = parseInterStatementStructured(text)
  return {
    transactions: result.transacoes.map(interTransactionToParsed),
    validation: result.validacao,
    conta: result.conta,
  }
}

function bradescoTransactionDescription(transaction: BradescoStatementTransaction): string {
  if (transaction.contraparte) return `${transaction.tipo_raw} - ${transaction.contraparte}`
  if (transaction.estabelecimento) return transaction.estabelecimento
  if (transaction.tipo_categoria === "PAGAMENTO_GOVERNO") return "Pagamento Governo RJ"
  if (transaction.tipo_categoria === "RENDIMENTO") return "Rendimentos"
  return transaction.detalhe_raw ? `${transaction.tipo_raw} - ${transaction.detalhe_raw}` : transaction.tipo_raw
}

function bradescoTransactionToParsed(transaction: BradescoStatementTransaction): ParsedStatementTransaction {
  const description = bradescoTransactionDescription(transaction)
  const type: TransactionType = transaction.valor < 0 ? "expense" : "income"
  const suggestion = suggestStatementCategory(description, type)
  return {
    date: transaction.data_real ?? transaction.data_extrato,
    description,
    amount: Math.abs(transaction.valor),
    type,
    category: suggestion.category,
    subcategoryId: suggestion.subcategoryId,
    confidence: suggestion.confidence,
  }
}

export function parseBradescoStatement(text: string): ParsedStatementTransaction[] {
  return parseBradescoStatementStructured(text).transacoes.map(bradescoTransactionToParsed)
}

export function parseBradescoStatementWithValidation(text: string) {
  const result = parseBradescoStatementStructured(text)
  return {
    transactions: result.transacoes.map(bradescoTransactionToParsed),
    validation: result.validacao,
    conta: result.conta,
    structured: result,
  }
}

export function parseGenericBrazilianStatement(text: string): ParsedStatementTransaction[] {
  const transactions: ParsedStatementTransaction[] = []
  const currentYear = new Date().getFullYear()
  const patterns = [
    /^(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+(-?R\$\s*[\d.]+,\d{2})$/i,
    /^(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+(-?[\d.]+,\d{2})\s+([CD])$/i,
    /^(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+([\d.]+,\d{2})\s+([CD])$/i,
    /^(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.+?)\s+(-?[\d.]+,\d{2})$/i,
  ]

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim()
    if (!line || normalized(line).startsWith("SALDO")) continue

    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (!match) continue
      const date = brDateToIso(match[1], currentYear)
      if (!date) continue
      const description = match[2].trim()
      const signedValue = match[3]
      const creditDebit = match[4]
      const type = inferType(description, signedValue, creditDebit)
      const suggestion = suggestStatementCategory(description, type)
      transactions.push({
        date,
        description,
        amount: parseMoney(signedValue),
        type,
        category: suggestion.category,
        subcategoryId: suggestion.subcategoryId,
        confidence: suggestion.confidence,
      })
      break
    }
  }

  return transactions
}

export function parseStatement(text: string, requestedBank: StatementBank = "auto"): StatementParseResult {
  const bank = requestedBank === "auto" ? detectStatementBank(text) : requestedBank
  let transactions: ParsedStatementTransaction[] = []
  let interValidation: InterStatementValidation | undefined
  let bradescoValidation: BradescoStatementValidation | undefined
  let bradescoStructured: BradescoStatementResult | undefined

  if (bank === "inter") {
    const parsed = parseInterStatementWithValidation(text)
    transactions = parsed.transactions
    interValidation = parsed.validation
  } else if (bank === "bradesco") {
    const parsed = parseBradescoStatementWithValidation(text)
    transactions = parsed.transactions
    bradescoValidation = parsed.validation
    bradescoStructured = parsed.structured
  } else {
    transactions = parseGenericBrazilianStatement(text)
  }

  if (transactions.length === 0) transactions = parseGenericBrazilianStatement(text)
  return {
    bank,
    transactions,
    usedAi: false,
    interValidation,
    bradescoValidation,
    bradescoStructured,
  }
}
