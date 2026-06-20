import type { AiProviderId } from "../types"

export type RequestComplexity = "simple" | "medium" | "complex"

export type RoutingDecisionReason =
  | "routing_disabled"
  | "single_provider_available"
  | "complexity_simple"
  | "complexity_medium"
  | "complexity_complex"
  | "preferred_provider_unavailable"
  | "explicit_provider_override"

export type RoutingDecision = {
  complexity: RequestComplexity
  selectedProvider: AiProviderId
  reason: RoutingDecisionReason
  routingEnabled: boolean
  configuredProviders: AiProviderId[]
  preferredProvider: AiProviderId
  signals: string[]
}

export type RoutingAttempt = {
  provider: AiProviderId
  ok: boolean
  errorCode?: string
  durationMs: number
}

export type RoutingExecutionRecord = {
  id: string
  startedAt: string
  completedAt?: string
  complexity: RequestComplexity
  selectedProvider: AiProviderId
  executedProvider?: AiProviderId
  reason: RoutingDecisionReason
  routingEnabled: boolean
  configuredProviders: AiProviderId[]
  fallbackChain: AiProviderId[]
  attempts: RoutingAttempt[]
  responseTimeMs?: number
  signals: string[]
}