import { geminiProvider } from "./providers/gemini"
import { huggingFaceProvider } from "./providers/huggingface"
import { openRouterProvider } from "./providers/openrouter"
import type { AiProvider, AiProviderId } from "./types"

const providers: Record<AiProviderId, AiProvider> = {
  openrouter: openRouterProvider,
  gemini: geminiProvider,
  huggingface: huggingFaceProvider,
}

export function getAiProvider(id: AiProviderId): AiProvider {
  return providers[id]
}

export function listAiProviders(): AiProvider[] {
  return Object.values(providers)
}

export function getRegisteredProviderIds(): AiProviderId[] {
  return Object.keys(providers) as AiProviderId[]
}