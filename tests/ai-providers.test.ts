import { afterEach, describe, expect, it, vi } from "vitest"
import { getAiRuntimeConfig, isGeminiStandby, isHuggingFaceStandby } from "../lib/ai/config"
import { userMessageForError } from "../lib/ai/errors"
import { resetAiMonitoringForTests, getAiMonitoringSnapshot } from "../lib/ai/monitoring"
import { resetRoutingObservabilityForTests } from "../lib/ai/routing"
import { buildPennyUpstreamMessages } from "../lib/ai/penny-messages"
import { completePennyConversation } from "../lib/ai/orchestrator"
import { geminiProvider } from "../lib/ai/providers/gemini"
import { huggingFaceProvider } from "../lib/ai/providers/huggingface"
import { openRouterProvider } from "../lib/ai/providers/openrouter"
import { getRegisteredProviderIds } from "../lib/ai/registry"
import { transformGeminiStreamToOpenRouter } from "../lib/ai/stream/gemini-to-openrouter"
import { PENNY_SYSTEM_PROMPT } from "../lib/penny"

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  resetAiMonitoringForTests()
  resetRoutingObservabilityForTests()
  vi.restoreAllMocks()
})

describe("AI provider configuration", () => {
  it("defaults to openrouter and keeps gemini in standby", () => {
    delete process.env.AI_PROVIDER
    const config = getAiRuntimeConfig()
    expect(config.provider).toBe("openrouter")
    expect(isGeminiStandby(config)).toBe(true)
  })

  it("allows gemini activation only through explicit configuration", () => {
    process.env.AI_PROVIDER = "gemini"
    const config = getAiRuntimeConfig()
    expect(config.provider).toBe("gemini")
    expect(isGeminiStandby(config)).toBe(false)
  })

  it("registers openrouter, gemini and huggingface as independent providers", () => {
    expect(getRegisteredProviderIds()).toEqual(["openrouter", "gemini", "huggingface"])
  })

  it("keeps huggingface in standby by default", () => {
    delete process.env.AI_PROVIDER
    const config = getAiRuntimeConfig()
    expect(config.provider).toBe("openrouter")
    expect(isHuggingFaceStandby(config)).toBe(true)
  })

  it("allows huggingface activation only through explicit configuration", () => {
    process.env.AI_PROVIDER = "huggingface"
    const config = getAiRuntimeConfig()
    expect(config.provider).toBe("huggingface")
    expect(isHuggingFaceStandby(config)).toBe(false)
  })

  it("routes penny completions through gemini when AI_PROVIDER=gemini", async () => {
    process.env.AI_PROVIDER = "gemini"
    process.env.GEMINI_API_KEY = "test-key"
    process.env.GEMINI_MODEL = "gemini-2.5-flash"
    process.env.GEMINI_FALLBACK_MODEL = "gemini-2.5-flash"

    const completeSpy = vi.spyOn(geminiProvider, "complete").mockResolvedValue({
      ok: true,
      response: new Response("data: [DONE]\n\n"),
      model: "gemini-2.5-flash",
      provider: "gemini",
      mode: "stream",
    })
    const openRouterSpy = vi.spyOn(openRouterProvider, "complete")

    const result = await completePennyConversation({
      messages: [{ role: "user", content: "Como está meu saldo?" }],
      context: {
        generatedAt: "2026-06-19T12:00:00.000Z",
        question: "Como está meu saldo?",
        routing: { selectedSources: [], alertKeys: [] },
        data: {},
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.provider).toBe("gemini")
    expect(completeSpy).toHaveBeenCalledOnce()
    expect(openRouterSpy).not.toHaveBeenCalled()
  })

  it("routes penny completions through huggingface when AI_PROVIDER=huggingface", async () => {
    process.env.AI_PROVIDER = "huggingface"
    process.env.HUGGINGFACE_API_KEY = "hf_test"
    process.env.HUGGINGFACE_MODEL = "Qwen/Qwen2.5-7B-Instruct-1M"
    process.env.HUGGINGFACE_FALLBACK_MODEL = "Qwen/Qwen2.5-7B-Instruct-1M"

    const completeSpy = vi.spyOn(huggingFaceProvider, "complete").mockResolvedValue({
      ok: true,
      response: new Response("data: [DONE]\n\n"),
      model: "Qwen/Qwen2.5-7B-Instruct-1M",
      provider: "huggingface",
      mode: "stream",
    })
    const openRouterSpy = vi.spyOn(openRouterProvider, "complete")
    const geminiSpy = vi.spyOn(geminiProvider, "complete")

    const result = await completePennyConversation({
      messages: [{ role: "user", content: "Como está meu saldo?" }],
      context: {
        generatedAt: "2026-06-19T12:00:00.000Z",
        question: "Como está meu saldo?",
        routing: { selectedSources: [], alertKeys: [] },
        data: {},
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.provider).toBe("huggingface")
    expect(completeSpy).toHaveBeenCalledOnce()
    expect(openRouterSpy).not.toHaveBeenCalled()
    expect(geminiSpy).not.toHaveBeenCalled()
  })
})

describe("P.E.N.N.Y upstream messages", () => {
  it("preserves the existing system prompt and guidance structure", () => {
    const messages = buildPennyUpstreamMessages({
      messages: [{ role: "user", content: "Como está meu saldo?" }],
      context: {
        generatedAt: "2026-06-19T12:00:00.000Z",
        question: "Como está meu saldo?",
        routing: { selectedSources: [], alertKeys: [] },
        data: {},
      },
    })

    expect(messages[0]?.content).toBe(PENNY_SYSTEM_PROMPT)
    expect(messages.some((message) => message.content.includes("Use somente fatos presentes"))).toBe(true)
    expect(messages.at(-1)).toEqual({ role: "user", content: "Como está meu saldo?" })
  })
})

describe("Gemini provider", () => {
  it("reports missing API key with a friendly message", async () => {
    delete process.env.GEMINI_API_KEY
    const result = await geminiProvider.complete({
      messages: [{ role: "user", content: "Olá" }],
      mode: "blocking",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errorCode).toBe("missing_api_key")
      expect(result.userMessage).toBe(userMessageForError("missing_api_key"))
    }
  })

  it("maps HTTP 401 to invalid API key", async () => {
    process.env.GEMINI_API_KEY = "invalid-key"
    process.env.GEMINI_MODEL = "gemini-2.5-flash"
    process.env.GEMINI_FALLBACK_MODEL = "gemini-2.5-flash"

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("invalid key", { status: 401, statusText: "Unauthorized" }))

    const result = await geminiProvider.complete({
      messages: [{ role: "user", content: "Teste" }],
      mode: "blocking",
    })

    expect(fetchMock).toHaveBeenCalled()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errorCode).toBe("invalid_api_key")
      expect(result.statusCode).toBe(401)
    }
  })

  it("transforms Gemini SSE into OpenRouter-compatible chunks", async () => {
    const upstream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(
          encoder.encode(
            'data: {"candidates":[{"content":{"parts":[{"text":"Olá"}]}}]}\n\n',
          ),
        )
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      },
    })

    const transformed = transformGeminiStreamToOpenRouter(upstream)
    const reader = transformed.getReader()
    const decoder = new TextDecoder()
    let output = ""

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      output += decoder.decode(value)
    }

    expect(output).toContain('"delta":{"content":"Olá"}')
    expect(output).toContain("data: [DONE]")
  })

  it("prefixes blocking responses with gemini identity", async () => {
    process.env.GEMINI_API_KEY = "test-key"
    process.env.GEMINI_MODEL = "gemini-2.5-flash"
    process.env.GEMINI_FALLBACK_MODEL = "gemini-2.5-flash"

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "Resposta" }] } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const result = await geminiProvider.complete({
      messages: [{ role: "user", content: "Teste" }],
      mode: "blocking",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      const body = await result.response.text()
      expect(body).toContain('"delta":{"content":"Resposta"}')
    }
  })

})

describe("Hugging Face provider", () => {
  it("reports missing API key with a friendly message", async () => {
    delete process.env.HUGGINGFACE_API_KEY
    delete process.env.HF_API_KEY

    const result = await huggingFaceProvider.complete({
      messages: [{ role: "user", content: "Olá" }],
      mode: "blocking",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errorCode).toBe("missing_api_key")
      expect(result.userMessage).toBe(userMessageForError("missing_api_key"))
    }
  })

  it("maps HTTP 404 to model_not_found", async () => {
    process.env.HUGGINGFACE_API_KEY = "hf_test"
    process.env.HUGGINGFACE_MODEL = "invalid/model"
    process.env.HUGGINGFACE_FALLBACK_MODEL = "invalid/model"

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("model not found", { status: 404, statusText: "Not Found" }),
    )

    const result = await huggingFaceProvider.complete({
      messages: [{ role: "user", content: "Teste" }],
      mode: "blocking",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errorCode).toBe("model_not_found")
      expect(result.statusCode).toBe(404)
    }
  })

  it("prefixes streaming responses with huggingface identity", async () => {
    process.env.HUGGINGFACE_API_KEY = "hf_test"
    process.env.HUGGINGFACE_MODEL = "Qwen/Qwen2.5-7B-Instruct-1M"
    process.env.HUGGINGFACE_FALLBACK_MODEL = "Qwen/Qwen2.5-7B-Instruct-1M"

    const upstream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"Olá"}}]}\n\n',
          ),
        )
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      },
    })

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(upstream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    )

    const result = await huggingFaceProvider.complete({
      messages: [{ role: "user", content: "Teste" }],
      mode: "stream",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      const body = await result.response.text()
      expect(body).toContain('"delta":{"content":"Olá"}')
    }
  })

  it("records monitoring metrics on success", async () => {
    process.env.HUGGINGFACE_API_KEY = "hf_test"
    process.env.HUGGINGFACE_MODEL = "Qwen/Qwen2.5-7B-Instruct-1M"
    process.env.HUGGINGFACE_FALLBACK_MODEL = "Qwen/Qwen2.5-7B-Instruct-1M"

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Resposta" } }],
          usage: { prompt_tokens: 12, completion_tokens: 5 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const result = await huggingFaceProvider.complete({
      messages: [{ role: "user", content: "Teste" }],
      mode: "blocking",
    })

    expect(result.ok).toBe(true)
    const snapshot = getAiMonitoringSnapshot("huggingface")
    expect(snapshot.requestCount).toBe(1)
    expect(snapshot.successCount).toBe(1)
    expect(snapshot.lastModel).toBe("Qwen/Qwen2.5-7B-Instruct-1M")
  })
})

describe("Gemini provider metrics", () => {
  it("records monitoring metrics on success", async () => {
    process.env.GEMINI_API_KEY = "test-key"
    process.env.GEMINI_MODEL = "gemini-2.5-flash"
    process.env.GEMINI_FALLBACK_MODEL = "gemini-2.5-flash"

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "Resposta" }] } }],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const result = await geminiProvider.complete({
      messages: [{ role: "user", content: "Teste" }],
      mode: "blocking",
    })

    expect(result.ok).toBe(true)
    const snapshot = getAiMonitoringSnapshot("gemini")
    expect(snapshot.requestCount).toBe(1)
    expect(snapshot.successCount).toBe(1)
    expect(snapshot.lastModel).toBeTruthy()
  })
})