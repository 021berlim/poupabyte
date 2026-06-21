import { buildAttentionPanelItem, buildPennyFinancialContext } from "../../penny-context"
import { isShortGreetingMessage } from "../../penny"
import {
  expenseByCategory,
  financialHealthScore,
  goalSummary,
  investmentSummary,
  limitUsage,
  monthlyComparison,
  totalNetWorth,
  transactionSummary,
} from "../../selectors"
import { currentMonthRange, isDateInRange } from "../query-utils"
import type { PennyKnowledgeSource } from "../types"

export const overviewSource: PennyKnowledgeSource = {
  id: "financial-overview",
  title: "Visão financeira consolidada",
  description: "Resumo derivado das fontes financeiras, sem expor registros individuais desnecessariamente.",
  topics: ["overview"],
  availableInformation: [
    "salário declarado e planejamento mensal",
    "receitas, despesas e resultado do mês",
    "comparação mensal",
    "score de saúde financeira",
    "resumo de metas, limites e investimentos",
    "ritmo e anomalias de gastos",
  ],
  examples: ["Como está minha saúde financeira?", "Dê um panorama geral.", "Qual é meu patrimônio?"],
  sourceOfTruth: "agregação de transactions, goals, limits e investments",
  shouldQuery: (analysis) =>
    analysis.broad ||
    analysis.topics.has("overview") ||
    isShortGreetingMessage(analysis.question),
  query: (snapshot, analysis) => {
    const availableTransactions = snapshot.transactions.filter((transaction) => new Date(transaction.date) <= analysis.now)
    const monthRange = currentMonthRange(analysis.now)
    const currentMonthTransactions = availableTransactions.filter((transaction) => isDateInRange(transaction.date, monthRange))
    const health = financialHealthScore(availableTransactions, snapshot.goals, snapshot.limits, snapshot.investments)
    const investmentStats = investmentSummary(snapshot.investments)
    const insights = buildPennyFinancialContext({
      financialProfile: snapshot.financialProfile,
      transactions: availableTransactions,
      goals: snapshot.goals,
      limits: snapshot.limits,
      subscriptions: snapshot.subscriptions,
      installments: snapshot.installments,
      investments: snapshot.investments,
      previousScore: snapshot.previousHealthScore,
      mentionedAlertKeys: snapshot.mentionedAlertKeys,
      now: analysis.now,
    })
    const alertKeys = insights.pendingAlerts.map((alert) => alert.key)

    const attentionPanel = buildAttentionPanelItem({
      transactions: snapshot.transactions,
      limits: snapshot.limits,
      goals: snapshot.goals,
      subscriptions: snapshot.subscriptions,
      now: analysis.now,
    })

    return {
      reason: "A pergunta solicita uma visão consolidada, patrimônio ou saúde financeira.",
      alertKeys,
      data: {
        attentionPanel,
        generatedForPeriod: monthRange.label,
        monthlyPlanning: insights.monthlyPlanning,
        totalNetWorth: totalNetWorth(availableTransactions, snapshot.investments),
        currentMonth: transactionSummary(currentMonthTransactions),
        monthlyComparison: monthlyComparison(availableTransactions, analysis.now),
        expenseByCategoryThisMonth: expenseByCategory(currentMonthTransactions),
        financialHealth: {
          ...health,
          previousScore: insights.financialHealth.previousScore,
          variation: insights.financialHealth.variation,
          methodology: "Indicador interno baseado em saldo, economia mensal, metas, investimentos e limites críticos.",
        },
        goals: goalSummary(snapshot.goals),
        limits: {
          items: limitUsage(snapshot.limits, availableTransactions, analysis.now).map((item) => ({
            category: item.limit.category,
            spent: item.spent,
            limit: item.limit.amount,
            usagePercent: item.percent,
            remaining: item.remaining,
            status: item.status,
          })),
        },
        investments: {
          totalInvested: investmentStats.totalInvested,
          currentValue: investmentStats.currentValue,
          accumulatedReturn: investmentStats.accumulatedReturn,
          accumulatedReturnPercent: investmentStats.accumulatedReturnPercent,
          assetCount: investmentStats.assetCount,
          allocationByType: insights.investments.allocationByType,
          bestInvestment: investmentStats.bestInvestment
            ? { name: investmentStats.bestInvestment.investment.name, returnPercent: investmentStats.bestInvestment.returnPercent }
            : null,
          worstInvestment: investmentStats.worstInvestment
            ? { name: investmentStats.worstInvestment.investment.name, returnPercent: investmentStats.worstInvestment.returnPercent }
            : null,
        },
        spendingInsights: {
          pace: insights.spendingPace,
          unusualExpenses: insights.exorbitantSpending,
          pendingAlerts: insights.pendingAlerts,
        },
      },
    }
  },
}
