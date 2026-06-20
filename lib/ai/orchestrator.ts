import { getAiRuntimeConfig } from "./config"
import { buildFailure } from "./errors"
import { buildPennyUpstreamMessages } from "./penny-messages"
import {
  buildProviderFallbackChain,
  finalizeRoutingExecution,
  getConfiguredProviderIds,
  recordRoutingAttempt,
  resolveRoutingDecision,
  startRoutingExecution,
} from "./routing"
import { getAiProvider } from "./registry"
import type { AiCompletionRequest, AiCompletionResult, AiProviderId, PennyUpstreamInput } from "./types"

export type PennyCompletionOptions = {
  provider?: AiProviderId
  mode?: AiCompletionRequest["mode"]
  appUrl?: string
}

const PROVIDER_IDS = ["openrouter", "gemini", "huggingface"] as const

export function resolveActiveProviderId(preferred?: AiProviderId): AiProviderId {
  const config = getAiRuntimeConfig()
  return preferred ?? config.provider
}

function buildProviderRequest(
  providerId: AiProviderId,
  config: ReturnType<typeof getAiRuntimeConfig>,
  options: PennyCompletionOptions,
): AiCompletionRequest {
  const base = {
    mode: options.mode ?? "stream",
    appUrl: options.appUrl,
    temperature: config.temperature,
  } satisfies Partial<AiCompletionRequest>

  if (providerId === "openrouter") {
    return {
      ...base,
      messages: [],
      timeoutMs: config.timeoutMs,
      model: config.openrouter.model,
      fallbackModel: config.openrouter.fallbackModel,
    }
  }

  if (providerId === "gemini") {
    return {
      ...base,
      messages: [],
      timeoutMs: config.gemini.timeoutMs,
      model: config.gemini.model,
      fallbackModel: config.gemini.fallbackModel,
      maxTokens: config.maxTokens,
    }
  }

  return {
    ...base,
    messages: [],
    timeoutMs: config.huggingface.timeoutMs,
    model: config.huggingface.model,
    fallbackModel: config.huggingface.fallbackModel,
    maxTokens: config.maxTokens,
  }
}

function resolveExecutionChain(
  decision: ReturnType<typeof resolveRoutingDecision>,
  config: ReturnType<typeof getAiRuntimeConfig>,
): AiProviderId[] {
  const useCrossProviderFallback =
    config.routing.enabled
    && config.routing.crossProviderFallback
    && decision.configuredProviders.length > 1

  if (!useCrossProviderFallback) {
    return [decision.selectedProvider]
  }

  return buildProviderFallbackChain(
    decision.selectedProvider,
    decision.configuredProviders,
  )
}

export async function completePennyConversation(
  input: PennyUpstreamInput,
  options: PennyCompletionOptions = {},
): Promise<AiCompletionResult> {
  const config = getAiRuntimeConfig()
  const decision = resolveRoutingDecision(input, config, options.provider)
  const messages = buildPennyUpstreamMessages(input)
  const executionChain = resolveExecutionChain(decision, config)
  const routingRecord = startRoutingExecution(decision, executionChain)

  let lastFailure: AiCompletionResult | null = null

  for (const providerId of executionChain) {
    const provider = getAiProvider(providerId)
    if (!provider.isConfigured()) continue

    const startedAt = Date.now()
    const result = await provider.complete({
      ...buildProviderRequest(providerId, config, options),
      messages,
    })

    recordRoutingAttempt(routingRecord, {
      provider: providerId,
      ok: result.ok,
      errorCode: result.ok ? undefined : result.errorCode,
      durationMs: Date.now() - startedAt,
    })

    if (result.ok) {
      finalizeRoutingExecution(routingRecord, providerId, true)
      return result
    }

    lastFailure = result
    console.warn("P.E.N.N.Y AI Router provider failed", {
      provider: providerId,
      errorCode: result.errorCode,
      complexity: decision.complexity,
      reason: decision.reason,
      signals: decision.signals,
    })
  }

  const failedProvider = executionChain.at(-1) ?? decision.selectedProvider
  finalizeRoutingExecution(routingRecord, failedProvider, false)

  if (lastFailure) return lastFailure

  return buildFailure(
    decision.selectedProvider,
    "missing_api_key",
    "Nenhum provedor de IA configurado está disponível para processar a solicitação.",
  )
}

export function getProviderReadiness() {
  const config = getAiRuntimeConfig()
  const configuredProviders = getConfiguredProviderIds()
  const providers = PROVIDER_IDS.map((id) => {
    const provider = getAiProvider(id)
    const providerConfig =
      id === "openrouter"
        ? config.openrouter
        : id === "gemini"
          ? config.gemini
          : config.huggingface

    return {
      id,
      label: provider.capabilities.label,
      configured: provider.isConfigured(),
      active: config.routing.enabled
        ? configuredProviders.includes(id)
        : config.provider === id,
      defaultModel: providerConfig.model,
      fallbackModel: providerConfig.fallbackModel,
      supportsStreaming: provider.capabilities.supportsStreaming,
    }
  })

  return {
    activeProvider: config.routing.enabled ? null : config.provider,
    configuredProviders,
    routingEnabled: config.routing.enabled,
    routing: config.routing,
    standbyProviders: PROVIDER_IDS.filter((id) =>
      config.routing.enabled
        ? !configuredProviders.includes(id)
        : id !== config.provider,
    ),
    timeoutMs: config.timeoutMs,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    rateLimitPerMinute: config.rateLimitPerMinute,
    providers,
  }
}