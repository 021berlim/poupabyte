import { getAiProvider } from "../registry"
import type { AiProviderId } from "../types"

export const PROVIDER_PRIORITY_ORDER: readonly AiProviderId[] = [
  "openrouter",
  "gemini",
  "huggingface",
]

export function getConfiguredProviderIds(): AiProviderId[] {
  return PROVIDER_PRIORITY_ORDER.filter((id) => getAiProvider(id).isConfigured())
}

export function hasAnyConfiguredProvider(): boolean {
  return getConfiguredProviderIds().length > 0
}

export function buildProviderFallbackChain(
  primary: AiProviderId,
  configured: AiProviderId[] = getConfiguredProviderIds(),
): AiProviderId[] {
  const chain: AiProviderId[] = []
  if (configured.includes(primary)) chain.push(primary)

  for (const providerId of PROVIDER_PRIORITY_ORDER) {
    if (providerId !== primary && configured.includes(providerId)) {
      chain.push(providerId)
    }
  }

  return chain
}