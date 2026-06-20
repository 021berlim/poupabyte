export type AiProviderId = "openrouter" | "gemini" | "huggingface"

export type AiChatRole = "system" | "user" | "assistant"

export type AiChatMessage = {
  role: AiChatRole
  content: string
}

export type AiCompletionMode = "stream" | "blocking"

export type AiCompletionRequest = {
  messages: AiChatMessage[]
  mode?: AiCompletionMode
  model?: string
  fallbackModel?: string
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
  appUrl?: string
}

export type AiCompletionSuccess = {
  ok: true
  response: Response
  model: string
  provider: AiProviderId
  mode: AiCompletionMode
  estimatedInputTokens?: number
  estimatedOutputTokens?: number
}

export type AiCompletionFailure = {
  ok: false
  provider: AiProviderId
  errorCode: AiErrorCode
  technicalMessage: string
  userMessage: string
  model?: string
  statusCode?: number
}

export type AiCompletionResult = AiCompletionSuccess | AiCompletionFailure

export type AiErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "timeout"
  | "rate_limit"
  | "service_unavailable"
  | "connection_error"
  | "invalid_response"
  | "invalid_request"
  | "usage_limit"
  | "model_not_found"
  | "model_unavailable"
  | "unknown"

export type AiProviderCapabilities = {
  id: AiProviderId
  label: string
  supportsStreaming: boolean
  supportsFallbackModel: boolean
  defaultModel: string
  fallbackModel?: string
}

export type AiProvider = {
  readonly id: AiProviderId
  readonly capabilities: AiProviderCapabilities
  isConfigured(): boolean
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>
}

export type PennyAssistantContext = {
  generatedAt: string
  question: string
  routing: {
    selectedSources: Array<{
      id: string
      title: string
      reason: string
      sourceOfTruth: string
    }>
    dateRange?: {
      from: string
      to: string
      label: string
    }
    alertKeys: string[]
  }
  data: Record<string, unknown>
}

export type PennyUpstreamInput = {
  messages: Array<{ role: "user" | "assistant"; content: string }>
  context: PennyAssistantContext
  userDisplayName?: string
}