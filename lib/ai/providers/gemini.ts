import { DEFAULT_GEMINI_FALLBACK_MODEL, DEFAULT_GEMINI_MODEL, getAiRuntimeConfig } from "../config"
import { fetchWithTimeout } from "../fetch-with-timeout"
import { buildFailure, classifyFetchError, classifyHttpError } from "../errors"
import {
  checkUsageLimit,
  estimateTokensFromText,
  recordAiRequestError,
  recordAiRequestStart,
  recordAiRequestSuccess,
} from "../monitoring"
import {
  transformGeminiStreamToOpenRouter,
  wrapGeminiBlockingResponse,
  wrapGeminiStreamResponse,
} from "../stream/gemini-to-openrouter"
import { OPENROUTER_SSE_HEADERS } from "../stream/openrouter-sse"

import type { AiChatMessage, AiCompletionRequest, AiCompletionResult, AiProvider } from "../types"

const PROVIDER_LABEL = "Google AI Studio (Gemini)"
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"

type GeminiContent = {
  role: "user" | "model"
  parts: Array<{ text: string }>
}

type GeminiRequestBody = {
  systemInstruction?: { parts: Array<{ text: string }> }
  contents: GeminiContent[]
  generationConfig: {
    temperature: number
    maxOutputTokens: number
  }
}

type GeminiResponsePayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
  }
  error?: {
    message?: string
    code?: number
    status?: string
  }
}

function sanitizeGeminiText(value: string): string {
  return value.trim().slice(0, 8_000)
}

function toGeminiPayload(messages: AiChatMessage[]): GeminiRequestBody {
  const systemMessages = messages
    .filter((message) => message.role === "system")
    .map((message) => sanitizeGeminiText(message.content))
    .filter(Boolean)

  const contents: GeminiContent[] = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: sanitizeGeminiText(message.content) }],
    }))

  return {
    ...(systemMessages.length
      ? { systemInstruction: { parts: [{ text: systemMessages.join("\n\n") }] } }
      : {}),
    contents,
    generationConfig: {
      temperature: getAiRuntimeConfig().temperature,
      maxOutputTokens: getAiRuntimeConfig().maxTokens,
    },
  }
}

function geminiEndpoint(model: string, stream: boolean): string {
  const action = stream ? "streamGenerateContent" : "generateContent"
  const query = stream ? "?alt=sse" : ""
  return `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:${action}${query}`
}

async function requestGeminiCompletion(
  model: string,
  apiKey: string,
  request: AiCompletionRequest,
): Promise<AiCompletionResult> {
  const finishTiming = recordAiRequestStart("gemini")
  const config = getAiRuntimeConfig()
  const mode = request.mode ?? "stream"
  const timeoutMs = request.timeoutMs ?? config.gemini.timeoutMs
  const temperature = request.temperature ?? config.temperature
  const maxTokens = request.maxTokens ?? config.maxTokens
  const inputText = request.messages.map((message) => message.content).join("\n")
  const estimatedInputTokens = estimateTokensFromText(inputText)

  if (!checkUsageLimit("gemini", config.rateLimitPerMinute)) {
    finishTiming()
    recordAiRequestError("gemini", "usage_limit", model)
    return buildFailure(
      "gemini",
      "usage_limit",
      "Gemini provider usage limit exceeded for the configured window.",
      model,
      429,
    )
  }

  const payload = toGeminiPayload(request.messages)
  payload.generationConfig = { temperature, maxOutputTokens: maxTokens }

  try {
    const response = await fetchWithTimeout(
      geminiEndpoint(model, mode === "stream"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(payload),
      },
      timeoutMs,
    )

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500)
      const classified = classifyHttpError(response.status, PROVIDER_LABEL)
      finishTiming()
      recordAiRequestError("gemini", classified.code, model)
      return buildFailure(
        "gemini",
        classified.code,
        detail || classified.technicalMessage,
        model,
        response.status,
      )
    }

    if (mode === "stream") {
      finishTiming()
      recordAiRequestSuccess("gemini", model, estimatedInputTokens)
      return {
        ok: true,
        response: wrapGeminiStreamResponse(response),
        model,
        provider: "gemini",
        mode,
        estimatedInputTokens,
      }
    }

    const blockingPayload = (await response.json()) as GeminiResponsePayload
    if (blockingPayload.error?.message) {
      finishTiming()
      recordAiRequestError("gemini", "invalid_response", model)
      return buildFailure(
        "gemini",
        "invalid_response",
        blockingPayload.error.message,
        model,
        blockingPayload.error.code,
      )
    }

    const content = blockingPayload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? ""
    const estimatedOutputTokens =
      blockingPayload.usageMetadata?.candidatesTokenCount ?? estimateTokensFromText(content)

    finishTiming()
    recordAiRequestSuccess(
      "gemini",
      model,
      blockingPayload.usageMetadata?.promptTokenCount ?? estimatedInputTokens,
      estimatedOutputTokens,
    )

    return {
      ok: true,
      response: wrapGeminiBlockingResponse(blockingPayload),
      model,
      provider: "gemini",
      mode: "blocking",
      estimatedInputTokens,
      estimatedOutputTokens,
    }
  } catch (error) {
    finishTiming()
    const classified = classifyFetchError(error, PROVIDER_LABEL)
    recordAiRequestError("gemini", classified.code, model)
    return buildFailure("gemini", classified.code, classified.technicalMessage, model)
  }
}

export const geminiProvider: AiProvider = {
  id: "gemini",
  capabilities: {
    id: "gemini",
    label: PROVIDER_LABEL,
    supportsStreaming: true,
    supportsFallbackModel: true,
    defaultModel: DEFAULT_GEMINI_MODEL,
    fallbackModel: DEFAULT_GEMINI_FALLBACK_MODEL,
  },
  isConfigured() {
    return Boolean(getAiRuntimeConfig().gemini.apiKey)
  },
  async complete(request) {
    const config = getAiRuntimeConfig()
    const apiKey = config.gemini.apiKey
    if (!apiKey) {
      recordAiRequestError("gemini", "missing_api_key")
      return buildFailure(
        "gemini",
        "missing_api_key",
        "GEMINI_API_KEY is not configured.",
      )
    }

    const model = request.model ?? config.gemini.model
    const fallbackModel = request.fallbackModel ?? config.gemini.fallbackModel

    const primary = await requestGeminiCompletion(model, apiKey, request)
    if (primary.ok || fallbackModel === model) return primary

    return requestGeminiCompletion(fallbackModel, apiKey, { ...request, model: fallbackModel })
  },
}

export function createGeminiBlockingFallbackStream(content: string): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`,
        ),
      )
      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      controller.close()
    },
  })

  return new Response(body, {
    status: 200,
    headers: OPENROUTER_SSE_HEADERS,
  })
}

export { transformGeminiStreamToOpenRouter }