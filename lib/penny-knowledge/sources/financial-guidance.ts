import { buildFinancialGuidanceSnapshot } from "../../financial-guidance"
import type { PennyKnowledgeSource } from "../types"

const GUIDANCE_PATTERN =
  /\b(reserva de emergencia|reserva de emergência|meses de despesas|50\/30\/20|50 30 20|metodo 50|método 50|lente de orcamento|lente de orçamento|gastos essenciais|sazonalidade|sazonal|mes caro|mês caro|13º|decimo terceiro|décimo terceiro|dinheiro parado|saldo parado|sem destino|oportunidade do dinheiro|avalanche|bola de neve|quitar divida|quitar dívida|estrategia de quitacao|estratégia de quitação)\b/

export const financialGuidanceSource: PennyKnowledgeSource = {
  id: "financial-guidance",
  title: "Orientação financeira educativa",
  description:
    "Análises de reserva de emergência, lente 50/30/20, sazonalidade e dinheiro parado com base nos dados reais do usuário.",
  topics: ["guidance"],
  availableInformation: [
    "meses cobertos pela reserva",
    "comparação 50/30/20",
    "padrões sazonais",
    "saldo parado sem destino",
    "educação sobre quitação de dívidas",
  ],
  examples: [
    "Minha reserva cobre quantos meses?",
    "Como meus gastos se comparam ao 50/30/20?",
    "Esse mês costuma ser mais caro?",
    "Tenho dinheiro parado?",
  ],
  sourceOfTruth: "transactions, investments, goals, limits e financialProfile",
  shouldQuery: (analysis) =>
    analysis.topics.has("guidance") ||
    GUIDANCE_PATTERN.test(analysis.normalizedQuestion) ||
    (analysis.broad && /\b(reserva|orcamento|orçamento|sazonal|parado)\b/.test(analysis.normalizedQuestion)),
  query: (snapshot, analysis) => {
    const guidance = buildFinancialGuidanceSnapshot({
      profile: snapshot.financialProfile,
      transactions: snapshot.transactions,
      goals: snapshot.goals,
      limits: snapshot.limits,
      subscriptions: snapshot.subscriptions,
      installments: snapshot.installments,
      investments: snapshot.investments,
      ref: analysis.now,
    })

    return {
      reason: "A pergunta pede orientação educativa com base nos dados financeiros reais do usuário.",
      data: {
        capabilityGroup: "current-data",
        ...guidance,
      },
    }
  },
}