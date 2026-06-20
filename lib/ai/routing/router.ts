import type { AiRoutingConfig, AiRuntimeConfig } from "../config"
import type { AiProviderId, PennyUpstreamInput } from "../types"
import { analyzeRequestComplexity, classifyRequestComplexity } from "./classifier"
import { getConfiguredProviderIds } from "./providers"
import type { RequestComplexity, RoutingDecision, RoutingDecisionReason } from "./types"

function providerForComplexity(
  complexity: RequestComplexity,
  routing: AiRoutingConfig,
): AiProviderId {
  if (complexity === "simple") return routing.simpleProvider
  if (complexity === "complex") return routing.complexProvider
  return routing.mediumProvider
}

function reasonForComplexity(complexity: RequestComplexity): RoutingDecisionReason {
  if (complexity === "simple") return "complexity_simple"
  if (complexity === "complex") return "complexity_complex"
  return "complexity_medium"
}

function resolveAvailableProvider(
  preferred: AiProviderId,
  configured: AiProviderId[],
  complexity: RequestComplexity,
): { provider: AiProviderId; reason: RoutingDecisionReason } {
  if (configured.includes(preferred)) {
    return { provider: preferred, reason: reasonForComplexity(complexity) }
  }

  return {
    provider: configured[0],
    reason: "preferred_provider_unavailable",
  }
}

export function resolveRoutingDecision(
  input: PennyUpstreamInput,
  config: AiRuntimeConfig,
  explicitProvider?: AiProviderId,
): RoutingDecision {
  const configuredProviders = getConfiguredProviderIds()
  const { signals } = analyzeRequestComplexity(input)

  if (explicitProvider) {
    return {
      complexity: classifyRequestComplexity(input),
      selectedProvider: explicitProvider,
      reason: "explicit_provider_override",
      routingEnabled: config.routing.enabled,
      configuredProviders,
      preferredProvider: explicitProvider,
      signals,
    }
  }

  if (configuredProviders.length === 1) {
    return {
      complexity: classifyRequestComplexity(input),
      selectedProvider: configuredProviders[0],
      reason: "single_provider_available",
      routingEnabled: config.routing.enabled,
      configuredProviders,
      preferredProvider: configuredProviders[0],
      signals,
    }
  }

  if (!config.routing.enabled) {
    const selected = configuredProviders.includes(config.provider)
      ? config.provider
      : configuredProviders[0]

    return {
      complexity: classifyRequestComplexity(input),
      selectedProvider: selected,
      reason: "routing_disabled",
      routingEnabled: false,
      configuredProviders,
      preferredProvider: selected,
      signals,
    }
  }

  const complexity = classifyRequestComplexity(input)
  const preferredProvider = providerForComplexity(complexity, config.routing)
  const resolved = resolveAvailableProvider(preferredProvider, configuredProviders, complexity)

  return {
    complexity,
    selectedProvider: resolved.provider,
    reason: resolved.reason,
    routingEnabled: true,
    configuredProviders,
    preferredProvider,
    signals,
  }
}