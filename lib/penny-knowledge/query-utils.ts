import { CATEGORIES, getCategory } from "../categories"
import type { CategoryId, CategoryRef, Transaction } from "../types"
import type { PennyDateRange, PennyKnowledgeTopic, PennyQuestionAnalysis } from "./types"

const MONTHS: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
}

const TOPIC_PATTERNS: Record<PennyKnowledgeTopic, RegExp> = {
  app: /\b(app|aplicativo|poupabyte|penny|tela|pagina|menu|botao|funciona|usar|encontro|acesso|importar|extrato pdf)\b|\bonde (?:vejo|encontro|acesso)\b/,
  overview: /\b(resumo geral|visao geral|panorama|situacao financeira|minhas financas|saude financeira|score|pontuacao|patrimonio|relatorio|relatorios|como estou)\b/,
  planning: /\b(salario|salário|orcamento|orçamento|sobra|disponivel|disponível|comprometido|assinatura|parcela|parcelamento|cartao|cartão|planejamento|importacao|importação|pdf|quanto posso gastar|quanto ainda posso)\b/,
  transactions: /\b(transacao|transacoes|lancamento|lancamentos|compra|compras|receita|receitas|despesa|despesas|gastei|gasto|gastos|ganhei|renda|pagamento|pix|salario|economizar|reduzir|cortar|consumo)\b/,
  cashflow: /\b(fluxo de caixa|entrada|entradas|saida|saidas|realizado|previsto|projecao|projeção|dinheiro disponivel|sobra do mes)\b/,
  goals: /\b(meta|metas|objetivo|objetivos|reserva|progresso|prazo|aporte diario|falta para)\b/,
  limits: /\b(limite|limites|orcamento|teto|planejado|excedido|ultrapassado)\b/,
  investments: /\b(investimento|investimentos|carteira|ativo|ativos|aporte|aportes|resgate|resgates|dividendo|dividendos|renda passiva|rentabilidade|rendimento|retorno|diversificacao|instituicao|vencimento|cdb|tesouro|acao|acoes|fii|fiis|fundo|fundos|etf|etfs|cripto|poupanca|previdencia)\b/,
  notifications: /\b(notificacao|notificacoes|alerta|alertas|aviso|avisos|nao lida|nao lidas|pendencia|pendencias)\b/,
}

const BROAD_PATTERN = /\b(resumo geral|visao geral|panorama|situacao financeira|minhas financas|tudo)\b/

export function normalizePennyText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0)
}

function range(from: Date, to: Date, label: string): PennyDateRange {
  return { from: isoDate(from), to: isoDate(to), label, explicit: true }
}

export function resolvePennyDateRange(question: string, now = new Date()): PennyDateRange | undefined {
  const normalized = normalizePennyText(question)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (/\bhoje\b/.test(normalized)) return range(today, today, "hoje")
  if (/\bontem\b/.test(normalized)) {
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
    return range(yesterday, yesterday, "ontem")
  }
  if (/\b(este mes|mes atual|neste mes)\b/.test(normalized)) {
    return range(new Date(now.getFullYear(), now.getMonth(), 1), endOfMonth(now.getFullYear(), now.getMonth()), "este mês")
  }
  if (/\b(mes passado|ultimo mes|mes anterior)\b/.test(normalized)) {
    const reference = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return range(reference, endOfMonth(reference.getFullYear(), reference.getMonth()), "mês passado")
  }
  if (/\b(este ano|ano atual|neste ano)\b/.test(normalized)) {
    return range(new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear(), 11, 31), "este ano")
  }
  if (/\b(ano passado|ultimo ano|ano anterior)\b/.test(normalized)) {
    return range(new Date(now.getFullYear() - 1, 0, 1), new Date(now.getFullYear() - 1, 11, 31), "ano passado")
  }

  const lastDays = normalized.match(/\b(?:ultimos?|ultimas?)\s+(\d{1,3})\s+dias?\b/)
  if (lastDays) {
    const days = Math.max(1, Number(lastDays[1]))
    return range(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1), today, `últimos ${days} dias`)
  }
  const lastMonths = normalized.match(/\b(?:ultimos?|ultimas?)\s+(\d{1,2})\s+meses?\b/)
  if (lastMonths) {
    const months = Math.max(1, Number(lastMonths[1]))
    return range(new Date(now.getFullYear(), now.getMonth() - months + 1, 1), endOfMonth(now.getFullYear(), now.getMonth()), `últimos ${months} meses`)
  }

  const explicitDate = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (explicitDate) {
    const yearValue = explicitDate[3]
      ? Number(explicitDate[3].length === 2 ? `20${explicitDate[3]}` : explicitDate[3])
      : now.getFullYear()
    const date = new Date(yearValue, Number(explicitDate[2]) - 1, Number(explicitDate[1]))
    if (Number.isFinite(date.getTime())) return range(date, date, `dia ${explicitDate[0]}`)
  }

  for (const [monthName, month] of Object.entries(MONTHS)) {
    const match = normalized.match(new RegExp(`\\b${monthName}(?:\\s+de\\s+|\\s+)?(20\\d{2})?\\b`))
    if (!match) continue
    const year = match[1] ? Number(match[1]) : now.getFullYear()
    return range(new Date(year, month, 1), endOfMonth(year, month), `${monthName} de ${year}`)
  }

  const yearMatch = normalized.match(/\b(20\d{2})\b/)
  if (yearMatch) {
    const year = Number(yearMatch[1])
    return range(new Date(year, 0, 1), new Date(year, 11, 31), String(year))
  }

  return undefined
}

export function topicsForQuestion(normalizedQuestion: string): Set<PennyKnowledgeTopic> {
  const topics = new Set<PennyKnowledgeTopic>()
  for (const [topic, pattern] of Object.entries(TOPIC_PATTERNS) as Array<[PennyKnowledgeTopic, RegExp]>) {
    if (pattern.test(normalizedQuestion)) topics.add(topic)
  }

  const mentionedCategories = Object.values(CATEGORIES).filter((category) =>
    new RegExp(`\\b${normalizePennyText(category.label)}\\b`).test(normalizedQuestion),
  )
  const categoryImpliesTransaction = mentionedCategories.some((category) =>
    category.id !== "investimentos" || topics.has("transactions"),
  )
  if (categoryImpliesTransaction && !topics.has("limits")) topics.add("transactions")

  if (/\b(reduzir|cortar|economizar|orcamento)\b/.test(normalizedQuestion)) topics.add("limits")
  return topics
}

export function analyzePennyQuestion(
  question: string,
  previousUserQuestions: string[] = [],
  now = new Date(),
): PennyQuestionAnalysis {
  const normalizedQuestion = normalizePennyText(question)
  const topics = topicsForQuestion(normalizedQuestion)
  const inheritedTopics = new Set<PennyKnowledgeTopic>()
  const followUp = topics.size === 0

  if (followUp) {
    for (let index = previousUserQuestions.length - 1; index >= 0; index -= 1) {
      const previousTopics = topicsForQuestion(normalizePennyText(previousUserQuestions[index]))
      if (previousTopics.size === 0) continue
      previousTopics.forEach((topic) => {
        if (topic !== "app") inheritedTopics.add(topic)
      })
      break
    }
  }
  inheritedTopics.forEach((topic) => topics.add(topic))

  const appHelp = topics.has("app") && /\b(como|onde|qual tela|botao|funciona|usar|consigo|posso|importar)\b/.test(normalizedQuestion)
  if (appHelp && !/\b(quanto|valor|total|saldo|gastei|recebi|rentabilidade|progresso|como estao|situacao)\b/.test(normalizedQuestion)) {
    for (const topic of [...topics]) if (topic !== "app") topics.delete(topic)
  }

  const categories = Object.values(CATEGORIES)
    .filter((category) => new RegExp(`\\b${normalizePennyText(category.label)}\\b`).test(normalizedQuestion))
    .map((category) => category.id)

  return {
    question,
    normalizedQuestion,
    topics,
    inheritedTopics,
    dateRange: resolvePennyDateRange(question, now),
    categories,
    broad: BROAD_PATTERN.test(normalizedQuestion),
    appHelp,
    followUp,
    now,
  }
}

export function transactionDate(value: string): string {
  return value.slice(0, 10)
}

export function isDateInRange(value: string, dateRange?: PennyDateRange): boolean {
  if (!dateRange) return true
  const date = transactionDate(value)
  return date >= dateRange.from && date <= dateRange.to
}

export function currentMonthRange(now: Date): PennyDateRange {
  return range(new Date(now.getFullYear(), now.getMonth(), 1), endOfMonth(now.getFullYear(), now.getMonth()), "este mês")
}

export function lastMonthsRange(now: Date, months: number): PennyDateRange {
  return range(new Date(now.getFullYear(), now.getMonth() - months + 1, 1), endOfMonth(now.getFullYear(), now.getMonth()), `últimos ${months} meses`)
}

export function filterTransactionsForAnalysis(
  transactions: Transaction[],
  analysis: PennyQuestionAnalysis,
  fallbackRange?: PennyDateRange,
): { transactions: Transaction[]; dateRange?: PennyDateRange; categories: CategoryRef[] } {
  const dateRange = analysis.dateRange ?? fallbackRange
  const categories = analysis.categories as CategoryRef[]
  return {
    transactions: transactions.filter((transaction) =>
      isDateInRange(transaction.date, dateRange) && (categories.length === 0 || categories.includes(transaction.category)),
    ),
    dateRange,
    categories,
  }
}

export function presentTransaction(transaction: Transaction) {
  return {
    type: transaction.type,
    description: transaction.description,
    amount: transaction.amount,
    category: getCategory(transaction.category).label,
    date: transactionDate(transaction.date),
  }
}
