import { getCategory } from "../../categories"
import {
  expenseByCategory,
  monthlyComparison,
  totalBalance,
  transactionSummary,
} from "../../selectors"
import {
  currentMonthRange,
  filterTransactionsForAnalysis,
  lastMonthsRange,
  normalizePennyText,
  presentTransaction,
} from "../query-utils"
import type { PennyKnowledgeSource } from "../types"

const DESCRIPTION_STOP_WORDS = new Set([
  "quanto", "gastei", "gasto", "gastos", "receita", "receitas", "despesa", "despesas", "transacao",
  "transacoes", "lancamento", "lancamentos", "este", "essa", "meu", "minha", "mes", "ano", "ultimos",
])

export const transactionsSource: PennyKnowledgeSource = {
  id: "transactions",
  title: "Movimentações",
  description: "Lançamentos reais e agregações de receitas e despesas.",
  topics: ["transactions"],
  availableInformation: [
    "descrição, valor, categoria, tipo e data",
    "totais e médias",
    "distribuição por categoria",
    "comparação com o mês anterior",
    "maiores e últimos lançamentos",
  ],
  examples: ["Quanto gastei com alimentação?", "Qual foi minha maior compra?", "Liste os Pix do mês passado."],
  sourceOfTruth: "poupabyte:data.transactions",
  shouldQuery: (analysis) => !analysis.broad && analysis.topics.has("transactions"),
  query: (snapshot, analysis) => {
    const asksRecent = /\b(ultimo|ultimos|recente|recentes|liste|listar|mostre|quais)\b/.test(analysis.normalizedQuestion)
    const asksReduction = /\b(reduzir|cortar|economizar|onde gasto mais)\b/.test(analysis.normalizedQuestion)
    const fallbackRange = asksRecent
      ? undefined
      : asksReduction
        ? lastMonthsRange(analysis.now, 3)
        : currentMonthRange(analysis.now)
    const selected = filterTransactionsForAnalysis(snapshot.transactions, analysis, fallbackRange)

    const meaningfulTerms = analysis.normalizedQuestion
      .split(" ")
      .filter((term) => term.length >= 4 && !DESCRIPTION_STOP_WORDS.has(term))
    const descriptionMatches = selected.transactions.filter((transaction) => {
      const description = normalizePennyText(transaction.description)
      return meaningfulTerms.some((term) => description.split(" ").includes(term))
    })
    const hasSpecificDescription = descriptionMatches.length > 0 && descriptionMatches.length < selected.transactions.length
    const relevant = hasSpecificDescription ? descriptionMatches : selected.transactions
    const ordered = [...relevant].sort((a, b) => b.date.localeCompare(a.date))
    const topExpenses = [...relevant]
      .filter((transaction) => transaction.type === "expense")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(presentTransaction)
    const topIncome = [...relevant]
      .filter((transaction) => transaction.type === "income")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(presentTransaction)
    const categories = expenseByCategory(relevant).map((item) => ({
      category: item.label,
      total: item.total,
      percent: transactionSummary(relevant).expense > 0 ? (item.total / transactionSummary(relevant).expense) * 100 : 0,
    }))
    const summary = transactionSummary(relevant)

    return {
      reason: selected.categories.length
        ? `A pergunta consulta lançamentos da categoria ${selected.categories.map((id) => getCategory(id).label).join(", ")}.`
        : "A pergunta consulta receitas, despesas ou lançamentos.",
      data: {
        period: selected.dateRange?.label ?? "todo o histórico",
        appliedFilters: {
          categories: selected.categories.map((id) => getCategory(id).label),
          descriptionTermsApplied: hasSpecificDescription ? meaningfulTerms : [],
        },
        summary,
        totalBalanceAllTime: totalBalance(snapshot.transactions),
        categoryBreakdown: categories,
        monthlyComparison: monthlyComparison(snapshot.transactions, analysis.now),
        largestExpenses: topExpenses,
        largestIncome: topIncome,
        transactions: ordered.slice(0, 50).map(presentTransaction),
        resultCount: ordered.length,
        truncated: ordered.length > 50,
      },
    }
  },
}
