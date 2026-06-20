import type { AiProviderId } from "../types"
import type { RoutingAttempt, RoutingDecision, RoutingExecutionRecord } from "./types"

const MAX_RECORDS = 200
const records: RoutingExecutionRecord[] = []

function createRecordId(): string {
  return `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function startRoutingExecution(
  decision: RoutingDecision,
  fallbackChain: AiProviderId[],
): RoutingExecutionRecord {
  const record: RoutingExecutionRecord = {
    id: createRecordId(),
    startedAt: new Date().toISOString(),
    complexity: decision.complexity,
    selectedProvider: decision.selectedProvider,
    reason: decision.reason,
    routingEnabled: decision.routingEnabled,
    configuredProviders: [...decision.configuredProviders],
    fallbackChain: [...fallbackChain],
    attempts: [],
    signals: [...decision.signals],
  }

  records.unshift(record)
  if (records.length > MAX_RECORDS) records.length = MAX_RECORDS
  return record
}

export function recordRoutingAttempt(
  record: RoutingExecutionRecord,
  attempt: RoutingAttempt,
) {
  record.attempts.push(attempt)
}

export function finalizeRoutingExecution(
  record: RoutingExecutionRecord,
  executedProvider: AiProviderId,
  ok: boolean,
) {
  const startedAt = Date.parse(record.startedAt)
  record.completedAt = new Date().toISOString()
  record.executedProvider = executedProvider
  record.responseTimeMs = Number.isFinite(startedAt)
    ? Date.now() - startedAt
    : undefined

  if (!ok) return

  console.info("P.E.N.N.Y AI Router completed request", {
    id: record.id,
    complexity: record.complexity,
    selectedProvider: record.selectedProvider,
    executedProvider: record.executedProvider,
    reason: record.reason,
    fallbackCount: Math.max(0, record.attempts.length - 1),
    responseTimeMs: record.responseTimeMs,
    signals: record.signals,
  })
}

export function getRoutingObservabilitySnapshot(limit = 25): RoutingExecutionRecord[] {
  return records.slice(0, limit).map((record) => ({
    ...record,
    attempts: [...record.attempts],
    configuredProviders: [...record.configuredProviders],
    fallbackChain: [...record.fallbackChain],
    signals: [...record.signals],
  }))
}

export function getRoutingObservabilitySummary() {
  const completed = records.filter((record) => record.completedAt)
  const successful = completed.filter((record) => record.executedProvider)
  const withFallback = completed.filter((record) => record.attempts.length > 1)

  const byComplexity = {
    simple: completed.filter((record) => record.complexity === "simple").length,
    medium: completed.filter((record) => record.complexity === "medium").length,
    complex: completed.filter((record) => record.complexity === "complex").length,
  }

  const averageResponseTimeMs =
    successful.length > 0
      ? Math.round(
          successful.reduce((total, record) => total + (record.responseTimeMs ?? 0), 0)
            / successful.length,
        )
      : 0

  return {
    totalRequests: records.length,
    completedRequests: completed.length,
    successfulRequests: successful.length,
    fallbackRequests: withFallback.length,
    averageResponseTimeMs,
    byComplexity,
    recent: getRoutingObservabilitySnapshot(10),
  }
}

export function resetRoutingObservabilityForTests() {
  records.length = 0
}