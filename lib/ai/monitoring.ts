import type { AiErrorCode, AiProviderId } from "./types"

type ProviderMetrics = {
  requestCount: number
  successCount: number
  errorCount: number
  totalResponseTimeMs: number
  estimatedInputTokens: number
  estimatedOutputTokens: number
  lastModel?: string
  lastProvider?: AiProviderId
  lastRequestAt?: string
  errorsByCode: Partial<Record<AiErrorCode, number>>
}

const metricsByProvider: Record<AiProviderId, ProviderMetrics> = {
  openrouter: createEmptyMetrics(),
  gemini: createEmptyMetrics(),
  huggingface: createEmptyMetrics(),
}

function createEmptyMetrics(): ProviderMetrics {
  return {
    requestCount: 0,
    successCount: 0,
    errorCount: 0,
    totalResponseTimeMs: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    errorsByCode: {},
  }
}

export function estimateTokensFromText(text: string): number {
  if (!text) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}

export function recordAiRequestStart(provider: AiProviderId): () => void {
  const startedAt = Date.now()
  metricsByProvider[provider].requestCount += 1
  metricsByProvider[provider].lastProvider = provider
  metricsByProvider[provider].lastRequestAt = new Date().toISOString()

  return () => {
    metricsByProvider[provider].totalResponseTimeMs += Date.now() - startedAt
  }
}

export function recordAiRequestSuccess(
  provider: AiProviderId,
  model: string,
  estimatedInputTokens = 0,
  estimatedOutputTokens = 0,
) {
  const metrics = metricsByProvider[provider]
  metrics.successCount += 1
  metrics.lastModel = model
  metrics.estimatedInputTokens += estimatedInputTokens
  metrics.estimatedOutputTokens += estimatedOutputTokens
}

export function recordAiRequestError(provider: AiProviderId, errorCode: AiErrorCode, model?: string) {
  const metrics = metricsByProvider[provider]
  metrics.errorCount += 1
  if (model) metrics.lastModel = model
  metrics.errorsByCode[errorCode] = (metrics.errorsByCode[errorCode] ?? 0) + 1
}

export type AiMonitoringSnapshot = {
  provider: AiProviderId
  requestCount: number
  successCount: number
  errorCount: number
  averageResponseTimeMs: number
  errorRate: number
  estimatedInputTokens: number
  estimatedOutputTokens: number
  lastModel?: string
  lastRequestAt?: string
  errorsByCode: Partial<Record<AiErrorCode, number>>
}

export function getAiMonitoringSnapshot(provider?: AiProviderId): AiMonitoringSnapshot | AiMonitoringSnapshot[] {
  const build = (id: AiProviderId): AiMonitoringSnapshot => {
    const metrics = metricsByProvider[id]
    const completed = metrics.successCount + metrics.errorCount
    return {
      provider: id,
      requestCount: metrics.requestCount,
      successCount: metrics.successCount,
      errorCount: metrics.errorCount,
      averageResponseTimeMs:
        completed > 0 ? Math.round(metrics.totalResponseTimeMs / completed) : 0,
      errorRate: completed > 0 ? Number((metrics.errorCount / completed).toFixed(4)) : 0,
      estimatedInputTokens: metrics.estimatedInputTokens,
      estimatedOutputTokens: metrics.estimatedOutputTokens,
      lastModel: metrics.lastModel,
      lastRequestAt: metrics.lastRequestAt,
      errorsByCode: { ...metrics.errorsByCode },
    }
  }

  if (provider) return build(provider)
  return (["openrouter", "gemini", "huggingface"] as const).map(build)
}

const requestTimestamps = new Map<AiProviderId, number[]>()

export function checkUsageLimit(provider: AiProviderId, limitPerMinute: number): boolean {
  const now = Date.now()
  const windowStart = now - 60_000
  const timestamps = (requestTimestamps.get(provider) ?? []).filter((value) => value >= windowStart)
  timestamps.push(now)
  requestTimestamps.set(provider, timestamps)
  return timestamps.length <= limitPerMinute
}

export function resetAiMonitoringForTests() {
  requestTimestamps.clear()
  metricsByProvider.openrouter = createEmptyMetrics()
  metricsByProvider.gemini = createEmptyMetrics()
  metricsByProvider.huggingface = createEmptyMetrics()
}