import {
  INVESTMENT_TYPE_LABELS,
  investmentAllocationByInstitution,
  investmentAllocationByType,
  investmentEvolutionSeries,
  investmentMovements,
  investmentPerformance,
  investmentSummary,
} from "../../selectors"
import type { Investment } from "../../types"
import { isDateInRange, normalizePennyText } from "../query-utils"
import type { PennyKnowledgeSource } from "../types"

function isInvestmentMentioned(investment: Investment, question: string): boolean {
  const candidates = [investment.name, investment.institution, INVESTMENT_TYPE_LABELS[investment.type]]
    .map(normalizePennyText)
    .flatMap((value) => [value, ...value.split(" ").filter((token) => token.length >= 3)])
  return candidates.some((candidate) => candidate && new RegExp(`\\b${candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(question))
}

export const investmentsSource: PennyKnowledgeSource = {
  id: "investments",
  title: "Investimentos",
  description: "Carteira, desempenho e movimentações cadastradas manualmente.",
  topics: ["investments"],
  availableInformation: [
    "nome, tipo e instituição",
    "valor aplicado e atual",
    "retorno absoluto e percentual",
    "datas, vencimento e retorno esperado",
    "observações, alocação e movimentações",
  ],
  examples: ["Como está meu CDB?", "Quanto aportei no mês passado?", "Minha carteira está concentrada?"],
  sourceOfTruth: "poupabyte:data.investments",
  shouldQuery: (analysis) => !analysis.broad && analysis.topics.has("investments"),
  query: (snapshot, analysis) => {
    const mentioned = snapshot.investments.filter((investment) => isInvestmentMentioned(investment, analysis.normalizedQuestion))
    const selected = mentioned.length > 0 ? mentioned : snapshot.investments
    const details = selected
      .map((investment) => {
        const performance = investmentPerformance(investment)
        return {
          name: investment.name,
          type: INVESTMENT_TYPE_LABELS[investment.type],
          institution: investment.institution || "Sem instituição informada",
          investedAmount: investment.investedAmount,
          currentValue: investment.currentValue,
          returnAmount: performance.returnAmount,
          returnPercent: performance.returnPercent,
          applicationDate: investment.applicationDate.slice(0, 10),
          maturityDate: investment.maturityDate?.slice(0, 10),
          expectedReturnPercent: investment.expectedReturn,
          notes: investment.notes,
        }
      })
      .sort((a, b) => b.currentValue - a.currentValue)
    const movements = investmentMovements(selected)
      .filter((movement) => isDateInRange(movement.date, analysis.dateRange))
      .map((movement) => ({
        investment: movement.investmentName,
        type: movement.type,
        amount: movement.amount,
        date: movement.date.slice(0, 10),
        note: movement.note,
        previousValue: movement.previousValue,
        resultingValue: movement.resultingValue,
      }))
    const summary = investmentSummary(selected)

    return {
      reason: mentioned.length > 0
        ? "A pergunta cita um investimento, tipo ou instituição específica."
        : "A pergunta consulta a carteira ou suas movimentações.",
      data: {
        periodForMovements: analysis.dateRange?.label ?? "todo o histórico",
        summary: {
          totalInvested: summary.totalInvested,
          currentValue: summary.currentValue,
          accumulatedReturn: summary.accumulatedReturn,
          accumulatedReturnPercent: summary.accumulatedReturnPercent,
          assetCount: summary.assetCount,
          bestInvestment: summary.bestInvestment
            ? { name: summary.bestInvestment.investment.name, returnPercent: summary.bestInvestment.returnPercent }
            : null,
          worstInvestment: summary.worstInvestment
            ? { name: summary.worstInvestment.investment.name, returnPercent: summary.worstInvestment.returnPercent }
            : null,
        },
        allocationByType: investmentAllocationByType(selected),
        allocationByInstitution: investmentAllocationByInstitution(selected),
        evolutionLastSixMonths: investmentEvolutionSeries(selected, 6),
        investments: details.slice(0, 50),
        movements: movements.slice(0, 50),
        resultCount: details.length,
        movementCount: movements.length,
        truncated: details.length > 50 || movements.length > 50,
        dataQuality: "Valores e evolução dependem das atualizações manuais registradas no PoupaByte; não são cotações de mercado em tempo real.",
      },
    }
  },
}
