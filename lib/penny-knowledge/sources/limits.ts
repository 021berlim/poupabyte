import { getCategory } from "../../categories"
import { limitMonthlyHistory, limitUsage } from "../../selectors"
import { currentMonthRange } from "../query-utils"
import type { PennyKnowledgeSource } from "../types"

export const limitsSource: PennyKnowledgeSource = {
  id: "limits",
  title: "Orçamento mensal",
  description: "Orçamento por categoria confrontado com as despesas registradas.",
  topics: ["limits"],
  availableInformation: ["orçamento", "gasto", "percentual", "restante", "excesso", "status", "histórico de seis meses"],
  examples: ["Estou dentro do orçamento?", "Quanto resta para alimentação?", "Qual categoria está mais perigosa?"],
  sourceOfTruth: "poupabyte:data.limits + poupabyte:data.transactions",
  shouldQuery: (analysis) => !analysis.broad && analysis.topics.has("limits"),
  query: (snapshot, analysis) => {
    const requestedRange = analysis.dateRange ?? currentMonthRange(analysis.now)
    const reference = new Date(`${requestedRange.to}T12:00:00`)
    const categories = new Set(analysis.categories)
    const limits = categories.size
      ? snapshot.limits.filter((limit) => categories.has(limit.category))
      : snapshot.limits
    const usages = limitUsage(limits, snapshot.transactions, reference)
      .map((usage) => ({
        category: getCategory(usage.limit.category).label,
        limit: usage.limit.amount,
        spent: usage.spent,
        usagePercent: usage.percent,
        remaining: usage.remaining,
        status: usage.status,
        exceededBy: usage.remaining < 0 ? Math.abs(usage.remaining) : 0,
        history: limitMonthlyHistory(usage.limit, snapshot.transactions, 6),
      }))
      .sort((a, b) => b.usagePercent - a.usagePercent)

    return {
      reason: "A pergunta consulta orçamento ou limite mensal de uma categoria.",
      data: {
        referenceMonth: requestedRange.label,
        thresholds: { attentionAtPercent: 71, criticalAtPercent: 91, exceededAtPercent: 100 },
        totals: {
          limit: usages.reduce((total, item) => total + item.limit, 0),
          spent: usages.reduce((total, item) => total + item.spent, 0),
          attentionCount: usages.filter((item) => item.status === "attention" || item.status === "critical").length,
          exceededCount: usages.filter((item) => item.status === "exceeded").length,
        },
        limits: usages.slice(0, 50),
        resultCount: usages.length,
        truncated: usages.length > 50,
      },
    }
  },
}
