import { FACTUAL_KNOWLEDGE_CONFIG, type FactualKnowledgeEntry } from "./config"

export { FACTUAL_KNOWLEDGE_CONFIG }
export type { FactualKnowledgeConfig, FactualKnowledgeEntry } from "./config"

export function getFactualKnowledgeEntries(ids?: string[]): FactualKnowledgeEntry[] {
  if (!ids?.length) return FACTUAL_KNOWLEDGE_CONFIG.entries
  const allowed = new Set(ids)
  return FACTUAL_KNOWLEDGE_CONFIG.entries.filter((entry) => allowed.has(entry.id))
}

export function getFactualKnowledgePayload(entryIds?: string[]) {
  return {
    version: FACTUAL_KNOWLEDGE_CONFIG.version,
    lastUpdated: FACTUAL_KNOWLEDGE_CONFIG.lastUpdated,
    disclaimer: FACTUAL_KNOWLEDGE_CONFIG.disclaimer,
    entries: getFactualKnowledgeEntries(entryIds),
    usageRules: [
      "Conteúdo educativo; não é recomendação de produto nem consultoria tributária.",
      "Quando unstable=true, reforce que a regra pode mudar.",
      "Nunca fixe alíquotas, limites legais ou promessas de rendimento a partir desta fonte.",
    ],
  }
}