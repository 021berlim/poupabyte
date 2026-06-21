import { getFactualKnowledgePayload } from "../../factual-knowledge"
import type { PennyKnowledgeSource } from "../types"

const FACTUAL_PATTERN =
  /\b(selic|cdi|fgc|fundo garantidor|tribut|fiscal|imposto de renda|ir\b|lci|lca|fii|cdb|tesouro direto|tabela regressiva|consultoria tributaria|consultoria tributária|declaracao|declaração|aposentadoria|previdencia|previdência|seguro|score de credito|score de crédito)\b/

const ENTRY_MATCHERS: Array<{ pattern: RegExp; ids: string[] }> = [
  { pattern: /\b(selic)\b/, ids: ["selic"] },
  { pattern: /\b(cdi)\b/, ids: ["cdi"] },
  { pattern: /\b(fgc|fundo garantidor)\b/, ids: ["fgc"] },
  { pattern: /\b(tribut|fiscal|imposto|ir\b|lci|lca|fii|cdb|tesouro|regressiv)/, ids: ["tax-by-asset-class"] },
  { pattern: /\b(avalanche|bola de neve|quitar divida|quitar dívida)\b/, ids: ["debt-strategies"] },
  { pattern: /\b(cartao|cartão|fatura|limite|divida|dívida)\b/, ids: ["future-debts", "debt-strategies"] },
  { pattern: /\b(seguro)\b/, ids: ["future-insurance"] },
  { pattern: /\b(aposentadoria|previdencia|previdência|inss)\b/, ids: ["future-retirement"] },
  { pattern: /\b(score de credito|score de crédito)\b/, ids: ["future-credit-score"] },
]

export const factualKnowledgeSource: PennyKnowledgeSource = {
  id: "factual-knowledge",
  title: "Conhecimento financeiro factual",
  description:
    "Conceitos educativos do sistema financeiro com dados atualizáveis fora do prompt estático.",
  topics: ["factual"],
  availableInformation: [
    "Selic e CDI como referências",
    "conceito de FGC",
    "tratamento fiscal por classe de ativo",
    "estratégias de quitação (educação)",
    "limitações de funcionalidades futuras",
  ],
  examples: [
    "O que é Selic?",
    "Como funciona o FGC?",
    "LCI tem imposto?",
    "Qual dívida devo pagar primeiro?",
  ],
  sourceOfTruth: "lib/factual-knowledge/config.ts",
  shouldQuery: (analysis) =>
    analysis.topics.has("factual") || FACTUAL_PATTERN.test(analysis.normalizedQuestion),
  query: (snapshot, analysis) => {
    const entryIds = new Set<string>()
    for (const matcher of ENTRY_MATCHERS) {
      if (matcher.pattern.test(analysis.normalizedQuestion)) {
        matcher.ids.forEach((id) => entryIds.add(id))
      }
    }

    const payload = getFactualKnowledgePayload(entryIds.size ? [...entryIds] : undefined)

    return {
      reason: "A pergunta pede conceito factual do sistema financeiro ou limitação de dados futuros.",
      data: {
        capabilityGroup: entryIds.size
          ? [...entryIds].some((id) => id.startsWith("future-"))
            ? "future-data"
            : "unstable-factual"
          : "unstable-factual",
        debtDataAvailable: snapshot.installments.length > 0 || snapshot.transactions.some((tx) => tx.category === "dividas"),
        debtDataSufficient: false,
        ...payload,
      },
    }
  },
}