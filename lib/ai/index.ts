export {
  getAiRuntimeConfig,
  isGeminiStandby,
  isHuggingFaceStandby,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_FALLBACK_MODEL,
  DEFAULT_HUGGINGFACE_MODEL,
  DEFAULT_HUGGINGFACE_FALLBACK_MODEL,
} from "./config"
export type { AiRoutingConfig } from "./config"
export { userMessageForError } from "./errors"
export {
  buildPennyMasterPromptMessages,
  PENNY_MASTER_FINANCIAL_RULES,
  PENNY_MASTER_PERSONA,
  PENNY_MASTER_RELIABILITY_RULES,
  PENNY_MASTER_SECURITY_RULES,
} from "./master-prompt"
export { completePennyConversation, getProviderReadiness, resolveActiveProviderId } from "./orchestrator"
export { resolvePennyUserDisplayName } from "@/lib/penny"
export { buildPennyUpstreamMessages } from "./penny-messages"
export { getAiProvider, getRegisteredProviderIds, listAiProviders } from "./registry"
export { getAiMonitoringSnapshot, resetAiMonitoringForTests } from "./monitoring"
export {
  classifyRequestComplexity,
  getConfiguredProviderIds,
  getRoutingObservabilitySnapshot,
  getRoutingObservabilitySummary,
  hasAnyConfiguredProvider,
  resolveRoutingDecision,
  resetRoutingObservabilityForTests,
} from "./routing"
export type {
  AiChatMessage,
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
  AiProviderId,
  PennyAssistantContext,
  PennyUpstreamInput,
} from "./types"