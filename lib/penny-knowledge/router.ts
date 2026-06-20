import { analyzePennyQuestion } from "./query-utils"
import { PENNY_KNOWLEDGE_SOURCES } from "./registry"
import type { PennyDataSnapshot, PennyKnowledgeContext, PennyKnowledgeQuery } from "./types"

export function queryPennyKnowledge(
  snapshot: PennyDataSnapshot,
  { question, previousUserQuestions = [], now = new Date() }: PennyKnowledgeQuery,
): PennyKnowledgeContext {
  const analysis = analyzePennyQuestion(question, previousUserQuestions, now)
  const selectedSources = PENNY_KNOWLEDGE_SOURCES.filter((source) => source.shouldQuery(analysis))
  const data: Record<string, unknown> = {}
  const routingSources: PennyKnowledgeContext["routing"]["selectedSources"] = []
  const alertKeys = new Set<string>()

  for (const source of selectedSources) {
    const result = source.query(snapshot, analysis)
    data[source.id] = result.data
    result.alertKeys?.forEach((key) => alertKeys.add(key))
    routingSources.push({
      id: source.id,
      title: source.title,
      reason: result.reason,
      sourceOfTruth: source.sourceOfTruth,
    })
  }

  return {
    generatedAt: now.toISOString(),
    question,
    routing: {
      selectedSources: routingSources,
      ...(analysis.dateRange
        ? { dateRange: { from: analysis.dateRange.from, to: analysis.dateRange.to, label: analysis.dateRange.label } }
        : {}),
      alertKeys: [...alertKeys],
    },
    data,
  }
}

export function pennyContextHasSources(context: PennyKnowledgeContext): boolean {
  return context.routing.selectedSources.length > 0
}
