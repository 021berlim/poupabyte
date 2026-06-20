import {
  DEFAULT_HUGGINGFACE_API_BASE,
  DEFAULT_HUGGINGFACE_FALLBACK_MODEL,
  DEFAULT_HUGGINGFACE_MODEL,
  getAiRuntimeConfig,
} from "../config"
import { fetchWithTimeout } from "../fetch-with-timeout"
import {
  buildFailure,
  classifyFetchError,
  classifyHttpError,
} from "../errors"
import {
  checkUsageLimit,
  estimateTokensFromText,
  recordAiRequestError,
  recordAiRequestStart,
  recordAiRequestSuccess,
} from "../monitoring"
import { OPENROUTER_SSE_HEADERS } from "../stream/openrouter-sse"

import type { AiCompletionRequest, AiCompletionResult, AiErrorCode, AiProvider } from "../types"

const PROVIDER_LABEL = "Hugging Face Inference"
const PROVIDER_ID = "huggingface" as const

type HuggingFaceChatResponse = {
  choices?: Array<{ message?: { content?: string } }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
  }
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

function sanitizeMessageContent(value: string): string {
  return value.trim().slice(0, 8_000)
}

function sanitizeMessages(request: AiCompletionRequest) {
  return request.messages.map((message) => ({
    role: message.role,
    content: sanitizeMessageContent(message.content),
  }))
}

function huggingFaceChatEndpoint(apiBase: string): string {
  const normalized = apiBase.replace(/\/$/, "")
  return `${normalized}/chat/completions`
}

function classifyHuggingFaceHttpError(
  status: number,
  detail: string,
): { code: AiErrorCode; technicalMessage: string } {
  const normalizedDetail = detail.toLowerCase()

  if (status === 404 || /model.*not found|does not exist|unknown model/i.test(normalizedDetail)) {
    return {
      code: "model_not_found",
      technicalMessage: `${PROVIDER_LABEL} respondeu com HTTP ${status} (modelo inexistente ou indisponível na plataforma).`,
    }
  }

  if (
    status === 503
    || status === 502
    || /loading|currently unavailable|model is warming|overloaded/i.test(normalizedDetail)
  ) {
    return {
      code: "model_unavailable",
      technicalMessage: `${PROVIDER_LABEL} respondeu com HTTP ${status} (modelo temporariamente indisponível).`,
    }
  }

  return classifyHttpError(status, PROVIDER_LABEL)
}

async function requestHuggingFaceCompletion(
  model: string,
  apiKey: string,
  request: AiCompletionRequest,
  mode: "stream" | "blocking",
): Promise<AiCompletionResult> {
  const finishTiming = recordAiRequestStart(PROVIDER_ID)
  const config = getAiRuntimeConfig()
  const timeoutMs = request.timeoutMs ?? config.huggingface.timeoutMs
  const temperature = request.temperature ?? config.temperature
  const maxTokens = request.maxTokens ?? config.maxTokens
  const inputText = request.messages.map((message) => message.content).join("\n")
  const estimatedInputTokens = estimateTokensFromText(inputText)
  const endpoint = huggingFaceChatEndpoint(config.huggingface.apiBase)

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: sanitizeMessages(request),
          stream: mode === "stream",
          temperature,
          max_tokens: maxTokens,
        }),
      },
      timeoutMs,
    )

    if (!response.ok || (mode === "stream" && !response.body)) {
      const detail = (await response.text()).slice(0, 500)
      const classified = classifyHuggingFaceHttpError(response.status, detail)
      finishTiming()
      recordAiRequestError(PROVIDER_ID, classified.code, model)
      return buildFailure(
        PROVIDER_ID,
        classified.code,
        detail || classified.technicalMessage,
        model,
        response.status,
      )
    }

    if (mode === "stream") {
      finishTiming()
      recordAiRequestSuccess(PROVIDER_ID, model, estimatedInputTokens)
      return {
        ok: true,
        response: new Response(response.body, {
          status: 200,
          headers: OPENROUTER_SSE_HEADERS,
        }),
        model,
        provider: PROVIDER_ID,
        mode,
        estimatedInputTokens,
      }
    }

    const payload = (await response.json()) as HuggingFaceChatResponse
    if (payload.error?.message) {
      const classified = classifyHuggingFaceHttpError(502, payload.error.message)
      finishTiming()
      recordAiRequestError(PROVIDER_ID, classified.code, model)
      return buildFailure(PROVIDER_ID, classified.code, payload.error.message, model, 502)
    }

    const content = payload.choices?.[0]?.message?.content ?? ""
    if (!content) {
      finishTiming()
      recordAiRequestError(PROVIDER_ID, "invalid_response", model)
      return buildFailure(
        PROVIDER_ID,
        "invalid_response",
        "Hugging Face encerrou a resposta sem conteúdo.",
        model,
      )
    }

    const estimatedOutputTokens =
      payload.usage?.completion_tokens ?? estimateTokensFromText(content)

    finishTiming()
    recordAiRequestSuccess(
      PROVIDER_ID,
      model,
      payload.usage?.prompt_tokens ?? estimatedInputTokens,
      estimatedOutputTokens,
    )

    return {
      ok: true,
      response: new Response(
        `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`,
        { status: 200, headers: OPENROUTER_SSE_HEADERS },
      ),
      model,
      provider: PROVIDER_ID,
      mode: "blocking",
      estimatedInputTokens,
      estimatedOutputTokens,
    }
  } catch (error) {
    finishTiming()
    const classified = classifyFetchError(error, PROVIDER_LABEL)
    recordAiRequestError(PROVIDER_ID, classified.code, model)
    return buildFailure(PROVIDER_ID, classified.code, classified.technicalMessage, model)
  }
}

async function requestWithFallback(
  model: string,
  fallbackModel: string,
  apiKey: string,
  request: AiCompletionRequest,
): Promise<AiCompletionResult> {
  const preferredMode = request.mode ?? "stream"

  const primary = await requestHuggingFaceCompletion(model, apiKey, request, preferredMode)
  if (primary.ok) return primary

  if (preferredMode === "stream" && primary.errorCode !== "missing_api_key") {
    const blocking = await requestHuggingFaceCompletion(model, apiKey, request, "blocking")
    if (blocking.ok) return blocking
  }

  if (fallbackModel === model) return primary

  const fallback = await requestHuggingFaceCompletion(fallbackModel, apiKey, {
    ...request,
    model: fallbackModel,
  }, preferredMode)

  if (fallback.ok || preferredMode === "blocking") return fallback

  return requestHuggingFaceCompletion(fallbackModel, apiKey, {
    ...request,
    model: fallbackModel,
  }, "blocking")
}

export const huggingFaceProvider: AiProvider = {
  id: PROVIDER_ID,
  capabilities: {
    id: PROVIDER_ID,
    label: PROVIDER_LABEL,
    supportsStreaming: true,
    supportsFallbackModel: true,
    defaultModel: DEFAULT_HUGGINGFACE_MODEL,
    fallbackModel: DEFAULT_HUGGINGFACE_FALLBACK_MODEL,
  },
  isConfigured() {
    return Boolean(getAiRuntimeConfig().huggingface.apiKey)
  },
  async complete(request) {
    const config = getAiRuntimeConfig()

    if (!checkUsageLimit(PROVIDER_ID, config.rateLimitPerMinute)) {
      recordAiRequestError(PROVIDER_ID, "usage_limit")
      return buildFailure(
        PROVIDER_ID,
        "usage_limit",
        "Hugging Face provider usage limit exceeded for the configured window.",
        request.model,
        429,
      )
    }

    const apiKey = config.huggingface.apiKey
    if (!apiKey) {
      recordAiRequestError(PROVIDER_ID, "missing_api_key")
      return buildFailure(
        PROVIDER_ID,
        "missing_api_key",
        "HUGGINGFACE_API_KEY is not configured.",
      )
    }

    const model = request.model ?? config.huggingface.model
    const fallbackModel = request.fallbackModel ?? config.huggingface.fallbackModel

    return requestWithFallback(model, fallbackModel, apiKey, request)
  },
}