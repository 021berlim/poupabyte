import { getAiRuntimeConfig } from "../config"
import { fetchWithTimeout } from "../fetch-with-timeout"
import { buildFailure, classifyFetchError, classifyHttpError } from "../errors"
import { estimateTokensFromText, recordAiRequestError, recordAiRequestStart, recordAiRequestSuccess } from "../monitoring"
import { OPENROUTER_SSE_HEADERS } from "../stream/openrouter-sse"
import type { AiCompletionRequest, AiCompletionResult, AiProvider } from "../types"

const PROVIDER_LABEL = "OpenRouter"

async function requestOpenRouterCompletion(
  model: string,
  apiKey: string,
  appUrl: string,
  request: AiCompletionRequest,
): Promise<AiCompletionResult> {
  const finishTiming = recordAiRequestStart("openrouter")
  const mode = request.mode ?? "stream"
  const timeoutMs = request.timeoutMs ?? getAiRuntimeConfig().timeoutMs
  const temperature = request.temperature ?? getAiRuntimeConfig().temperature
  const inputText = request.messages.map((message) => message.content).join("\n")
  const estimatedInputTokens = estimateTokensFromText(inputText)

  try {
    const response = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": appUrl,
          "X-Title": "PoupaByte P.E.N.N.Y",
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          stream: mode === "stream",
          temperature,
          ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
        }),
      },
      timeoutMs,
    )

    if (!response.ok || (mode === "stream" && !response.body)) {
      const detail = (await response.text()).slice(0, 500)
      const classified = classifyHttpError(response.status, PROVIDER_LABEL)
      finishTiming()
      recordAiRequestError("openrouter", classified.code, model)
      return buildFailure(
        "openrouter",
        classified.code,
        detail || classified.technicalMessage,
        model,
        response.status,
      )
    }

    finishTiming()
    recordAiRequestSuccess("openrouter", model, estimatedInputTokens)

    if (mode === "stream") {
      return {
        ok: true,
        response: new Response(response.body, {
          status: 200,
          headers: OPENROUTER_SSE_HEADERS,
        }),
        model,
        provider: "openrouter",
        mode,
        estimatedInputTokens,
      }
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = payload.choices?.[0]?.message?.content ?? ""
    const estimatedOutputTokens = estimateTokensFromText(content)

    return {
      ok: true,
      response: new Response(
        `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`,
        { status: 200, headers: OPENROUTER_SSE_HEADERS },
      ),
      model,
      provider: "openrouter",
      mode,
      estimatedInputTokens,
      estimatedOutputTokens,
    }
  } catch (error) {
    finishTiming()
    const classified = classifyFetchError(error, PROVIDER_LABEL)
    recordAiRequestError("openrouter", classified.code, model)
    return buildFailure("openrouter", classified.code, classified.technicalMessage, model)
  }
}

export const openRouterProvider: AiProvider = {
  id: "openrouter",
  capabilities: {
    id: "openrouter",
    label: PROVIDER_LABEL,
    supportsStreaming: true,
    supportsFallbackModel: true,
    defaultModel: getAiRuntimeConfig().openrouter.model,
    fallbackModel: getAiRuntimeConfig().openrouter.fallbackModel,
  },
  isConfigured() {
    return Boolean(getAiRuntimeConfig().openrouter.apiKey)
  },
  async complete(request) {
    const config = getAiRuntimeConfig()
    const apiKey = config.openrouter.apiKey
    if (!apiKey) {
      recordAiRequestError("openrouter", "missing_api_key")
      return buildFailure(
        "openrouter",
        "missing_api_key",
        "OPENROUTER_API_KEY is not configured.",
      )
    }

    const model = request.model ?? config.openrouter.model
    const fallbackModel = request.fallbackModel ?? config.openrouter.fallbackModel
    const appUrl = request.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    const primary = await requestOpenRouterCompletion(model, apiKey, appUrl, request)

    if (primary.ok || fallbackModel === model) return primary

    return requestOpenRouterCompletion(fallbackModel, apiKey, appUrl, {
      ...request,
      model: fallbackModel,
    })
  },
}