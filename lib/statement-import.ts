import { suggestCategory } from "./auto-categorize"
import type { CategoryContext } from "./category-system"
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

const MONTHS: Record<string, string> = {
  janeiro: "01",
  fevereiro: "02",
  marco: "03",
  abril: "04",
  maio: "05",
  junho: "06",
  julho: "07",
  agosto: "08",
  setembro: "09",
  outubro: "10",
  novembro: "11",
  dezembro: "12",
}

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
const TRANSFER_TERMS = ["PIX ENVIADO", "TRANSFERENCIA ENVIADA", "TRANSFERÊNCIA ENVIADA", "TED ENVIADA", "DOC ENVIADO"]

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

function interDateToIso(day: string, month: string, year: string) {
  return `${year}-${MONTHS[normalized(month).toLowerCase()]}-${day.padStart(2, "0")}`
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
  const result = suggestCategory(description, type, categoryCtx, ctx.categoryRules ?? [])
  return {
    category: result.category,
    subcategoryId: result.subcategoryId,
    confidence: result.confidence,
  }
}

function inferType(description: string, signedValue: string, creditDebit?: string): TransactionType {
  const text = normalized(description)
  if (containsAny(text, TRANSFER_TERMS)) return "transfer"
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

function cleanInterDescription(kind: string, description: string) {
  const cleaned = description
    .replace(/^"|"$/g, "")
    .replace(/^Cp\s*:\s*\d+\s*-\s*/i, "")
    .replace(/^No estabelecimento\s+/i, "")
    .trim()
  if (normalized(kind) === "COMPRA NO DEBITO") return cleaned
  if (normalized(kind) === "COMPRA INTER CEL" || normalized(kind) === "CASHBACK") return cleaned
  return `${kind} - ${cleaned}`
}

export function parseInterStatement(text: string): ParsedStatementTransaction[] {
  const transactions: ParsedStatementTransaction[] = []
  const transactionPattern = /^(Pix recebido devolvido|Pix recebido|Pix enviado|Compra no debito|Compra Inter Cel|Cashback):\s*(.*?)\s+(-?R\$\s*[\d.]+,\d{2})\s+(-?R\$\s*[\d.]+,\d{2})$/i
  const datePattern = /^(\d{1,2})\s+de\s+([\p{L}]+)\s+de\s+(\d{4})/iu
  let currentDate = ""

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim()
    const dateMatch = line.match(datePattern)
    if (dateMatch) {
      currentDate = interDateToIso(dateMatch[1], dateMatch[2], dateMatch[3])
      continue
    }
    if (!currentDate || normalized(line).startsWith("SALDO ")) continue

    const match = line.match(transactionPattern)
    if (!match) continue
    const kind = match[1]
    const signedValue = match[3].replace(/\s+/g, "")
    const description = cleanInterDescription(kind, match[2])
    const type = inferType(description, signedValue)
    const suggestion = suggestStatementCategory(description, type === "transfer" ? "expense" : type)
    transactions.push({
      date: currentDate,
      description,
      amount: parseMoney(signedValue),
      type,
      category: suggestion.category,
      subcategoryId: suggestion.subcategoryId,
      confidence: type === "transfer" ? 0.7 : suggestion.confidence,
    })
  }

  return transactions
}

function isBradescoType(line: string): line is (typeof BRADESCO_TYPES)[number] {
  return BRADESCO_TYPES.includes(normalized(line) as (typeof BRADESCO_TYPES)[number])
}

function isIgnoredBradescoLine(line: string) {
  const value = normalized(line)
  return (
    !value ||
    value === "BRADESCO CELULAR" ||
    value.startsWith("NOME:") ||
    value.startsWith("EXTRATO DE:") ||
    value.startsWith("FOLHA:") ||
    value.startsWith("DATA:") ||
    value.startsWith("DATA HISTORICO DOCTO.") ||
    value.startsWith("TOTAL ") ||
    value.includes("COD. LANC.")
  )
}

function cleanBradescoDetail(value: string) {
  return value
    .replace(/^(REM|DES):\s*/i, "")
    .replace(/\s+\d{2}\/\d{2}\s*$/, "")
    .trim()
}

function bradescoDescription(kind: string, detail: string) {
  const cleaned = cleanBradescoDetail(detail)
  if (kind === "COMPRA ELO DEBITO VISTA") return cleaned || "Compra no débito"
  if (kind === "PAGAMENTO GOVERNO RJ") return "Pagamento Governo RJ"
  if (kind === "RENDIMENTOS") return "Rendimentos"
  const labels: Record<string, string> = {
    "PIX RECEBIDO": "Pix recebido",
    "PIX ENVIADO": "Pix enviado",
    "PIX QR CODE DINAMICO": "Pix QR Code dinâmico",
    "PIX QR CODE ESTATICO": "Pix QR Code estático",
  }
  return cleaned ? `${labels[kind] ?? kind} - ${cleaned}` : labels[kind] ?? kind
}

export function parseBradescoStatement(text: string): ParsedStatementTransaction[] {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim())
  const transactions: ParsedStatementTransaction[] = []
  const movementPattern = /^(?:(\d{2}\/\d{2}\/\d{4})\s+)?\d{6,7}\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})$/
  let currentDate = ""

  for (let index = 0; index < lines.length; index += 1) {
    const lineDate = lines[index].match(/^(\d{2}\/\d{2}\/\d{4})/)
    if (lineDate) currentDate = brDateToIso(lineDate[1])

    const kind = normalized(lines[index])
    if (!isBradescoType(kind)) continue

    let movementIndex = -1
    let movementMatch: RegExpMatchArray | null = null
    for (let cursor = index + 1; cursor < Math.min(lines.length, index + 12); cursor += 1) {
      if (isBradescoType(lines[cursor])) break
      const candidate = lines[cursor].match(movementPattern)
      if (candidate) {
        movementIndex = cursor
        movementMatch = candidate
        break
      }
    }
    if (!movementMatch || movementIndex < 0) continue
    if (movementMatch[1]) currentDate = brDateToIso(movementMatch[1])
    if (!currentDate) continue

    let detail = ""
    let detailIndex = movementIndex
    for (let cursor = movementIndex + 1; cursor < Math.min(lines.length, movementIndex + 8); cursor += 1) {
      if (isBradescoType(lines[cursor]) || lines[cursor].match(movementPattern)) break
      if (isIgnoredBradescoLine(lines[cursor])) continue
      detail = lines[cursor]
      detailIndex = cursor
      break
    }

    const description = bradescoDescription(kind, detail)
    const type = inferType(description, movementMatch[2])
    const suggestion = suggestStatementCategory(description, type === "transfer" ? "expense" : type)
    transactions.push({
      date: currentDate,
      description,
      amount: parseMoney(movementMatch[2]),
      type,
      category: suggestion.category,
      subcategoryId: suggestion.subcategoryId,
      confidence: suggestion.confidence,
    })
    index = detailIndex
  }

  return transactions
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
      const suggestion = suggestStatementCategory(description, type === "transfer" ? "expense" : type)
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
  if (bank === "inter") transactions = parseInterStatement(text)
  else if (bank === "bradesco") transactions = parseBradescoStatement(text)
  else transactions = parseGenericBrazilianStatement(text)
  if (transactions.length === 0) transactions = parseGenericBrazilianStatement(text)
  return { bank, transactions, usedAi: false }
}