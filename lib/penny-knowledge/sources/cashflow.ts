import { openingBalanceBeforePeriod, transactionSummary } from "../../selectors"
import { isCashRelevant } from "../../transaction-cash"
import { filterTransactionsForAnalysis, lastMonthsRange, presentTransaction, transactionDate } from "../query-utils"
import type { PennyKnowledgeSource } from "../types"

export const cashflowSource: PennyKnowledgeSource = {
  id: "cashflow",
  title: "Fluxo",
  description: "Evolução do saldo pelos lançamentos.",
  topics: ["cashflow"],
  availableInformation: ["saldo inicial e final", "variação", "evolução diária", "maior entrada e saída"],
  examples: ["Como evoluiu meu saldo?", "Qual foi o saldo no mês passado?", "Qual foi minha maior saída?"],
  sourceOfTruth: "poupabyte:data.transactions",
  shouldQuery: (analysis) => !analysis.broad && analysis.topics.has("cashflow"),
  query: (snapshot, analysis) => {
    const selected = filterTransactionsForAnalysis(snapshot.transactions, analysis, lastMonthsRange(analysis.now, 3))
    const from = selected.dateRange?.from ?? "0000-01-01"
    const openingBalance = openingBalanceBeforePeriod(snapshot.transactions, from)
    const byDay = new Map<string, { income: number; expense: number }>()
    for (const transaction of selected.transactions) {
      if (!isCashRelevant(transaction)) continue
      const key = transactionDate(transaction.date)
      const row = byDay.get(key) ?? { income: 0, expense: 0 }
      if (transaction.type === "income") row.income += transaction.amount
      else if (transaction.type === "expense") row.expense += transaction.amount
      byDay.set(key, row)
    }
    let balance = openingBalance
    const dailyEvolution = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, row]) => {
        balance += row.income - row.expense
        return { date, income: row.income, expense: row.expense, net: row.income - row.expense, accumulatedBalance: balance }
      })
    const biggestIncome = [...selected.transactions]
      .filter((transaction) => transaction.type === "income")
      .sort((a, b) => b.amount - a.amount)[0]
    const biggestExpense = [...selected.transactions]
      .filter((transaction) => transaction.type === "expense")
      .sort((a, b) => b.amount - a.amount)[0]
    const summary = transactionSummary(selected.transactions)

    return {
      reason: "A pergunta solicita saldo, entradas, saídas ou evolução do caixa.",
      data: {
        period: selected.dateRange?.label,
        openingBalance,
        closingBalance: openingBalance + summary.balance,
        change: summary.balance,
        income: summary.income,
        expense: summary.expense,
        biggestIncome: biggestIncome ? presentTransaction(biggestIncome) : null,
        biggestExpense: biggestExpense ? presentTransaction(biggestExpense) : null,
        dailyEvolution: dailyEvolution.slice(-120),
        truncated: dailyEvolution.length > 120,
      },
    }
  },
}
