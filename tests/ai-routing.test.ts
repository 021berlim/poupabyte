import { afterEach, describe, expect, it, vi } from "vitest"
import { getAiRuntimeConfig } from "../lib/ai/config"
import { resetAiMonitoringForTests } from "../lib/ai/monitoring"
import { PENNY_MASTER_PERSONA, buildPennyMasterPromptMessages } from "../lib/ai/master-prompt"
import { completePennyConversation } from "../lib/ai/orchestrator"
import { geminiProvider } from "../lib/ai/providers/gemini"
import { huggingFaceProvider } from "../lib/ai/providers/huggingface"
import { openRouterProvider } from "../lib/ai/providers/openrouter"
import {
  buildProviderFallbackChain,
  classifyRequestComplexity,
  getConfiguredProviderIds,
  resolveRoutingDecision,
  resetRoutingObservabilityForTests,
} from "../lib/ai/routing"
import { PENNY_SYSTEM_PROMPT } from "../lib/penny"

const ORIGINAL_ENV = { ...process.env }

const baseContext = {
  generatedAt: "2026-06-19T12:00:00.000Z",
  question: "Como está meu saldo?",
  routing: { selectedSources: [], alertKeys: [] },
  data: {},
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  resetAiMonitoringForTests()
  resetRoutingObservabilityForTests()
  vi.restoreAllMocks()
})

describe("P.E.N.N.Y master prompt", () => {
  it("centralizes persona and shared behavior rules for every provider", () => {
    const messages = buildPennyMasterPromptMessages({
      messages: [{ role: "user", content: "Como está meu saldo?" }],
      context: baseContext,
      userDisplayName: "Maria Silva",
    })

    expect(PENNY_MASTER_PERSONA).toBe(PENNY_SYSTEM_PROMPT)
    expect(messages[0]?.content).toBe(PENNY_SYSTEM_PROMPT)
    expect(messages.some((message) => message.content.includes("F.R.I.D.A.Y."))).toBe(true)
    expect(messages.some((message) => message.content.includes("Personal Economy and Networth Navigation"))).toBe(true)
    expect(messages.some((message) => message.content.includes("liste automaticamente as funcionalidades do app"))).toBe(true)
    expect(messages.some((message) => message.content.includes('nome de tratamento do usuário nesta sessão é "Maria"'))).toBe(true)
    expect(messages.some((message) => message.content.includes("longo prazo"))).toBe(true)
    expect(messages.some((message) => message.content.includes("diversificação"))).toBe(true)
    expect(messages.some((message) => message.content.includes("consultoria regulada pela CVM"))).toBe(true)
    expect(messages.some((message) => message.content.includes("Mapa do produto"))).toBe(true)
    expect(messages.some((message) => message.content.includes("Modo de foco"))).toBe(true)
    expect(messages.some((message) => message.content.includes("Escrita assistida"))).toBe(true)
    expect(messages.some((message) => message.content.includes("Plano de investimento por objetivo"))).toBe(true)
    expect(messages.some((message) => message.content.includes("Não revele qual provedor de IA"))).toBe(true)
  })

  it("applies short-greeting guidance without listing app features", () => {
    const messages = buildPennyMasterPromptMessages({
      messages: [{ role: "user", content: "hey penny" }],
      context: baseContext,
      userDisplayName: "Maria Silva",
    })

    expect(messages.some((message) => message.content.includes("saudação curta ou vaga"))).toBe(true)
    expect(messages.some((message) => message.content.includes("Nunca liste automaticamente as funcionalidades do app"))).toBe(true)
    expect(messages.some((message) => message.content.includes("attentionPanel"))).toBe(true)
  })

  it("skips greeting guidance when the conversation is already in progress", () => {
    const messages = buildPennyMasterPromptMessages({
      messages: [
        { role: "user", content: "hey penny" },
        { role: "assistant", content: "Oi, Maria." },
        { role: "user", content: "Como está meu saldo?" },
      ],
      context: baseContext,
      userDisplayName: "Maria Silva",
    })

    expect(messages.some((message) => message.content.includes("saudação curta ou vaga"))).toBe(false)
    expect(messages.some((message) => message.content.includes("A conversa já está em andamento"))).toBe(true)
  })
})

describe("Request complexity classifier", () => {
  it("classifies objective balance questions as simple", () => {
    const complexity = classifyRequestComplexity({
      messages: [{ role: "user", content: "Qual é o meu saldo?" }],
      context: { ...baseContext, question: "Qual é o meu saldo?" },
    })

    expect(complexity).toBe("simple")
  })

  it("classifies planning questions as complex", () => {
    const complexity = classifyRequestComplexity({
      messages: [{ role: "user", content: "Monte um plano financeiro de longo prazo com simulação de cenários." }],
      context: {
        ...baseContext,
        question: "Monte um plano financeiro de longo prazo com simulação de cenários.",
        routing: {
          selectedSources: [
            { id: "overview", title: "Visão", reason: "r", sourceOfTruth: "s" },
            { id: "cashflow", title: "Fluxo", reason: "r", sourceOfTruth: "s" },
            { id: "goals", title: "Metas", reason: "r", sourceOfTruth: "s" },
            { id: "limits", title: "Limites", reason: "r", sourceOfTruth: "s" },
          ],
          alertKeys: [],
        },
      },
    })

    expect(complexity).toBe("complex")
  })
})

describe("P.E.N.N.Y AI Router", () => {
  it("uses the only configured provider when a single provider is available", () => {
    process.env.OPENROUTER_API_KEY = "or-key"
    delete process.env.GEMINI_API_KEY
    delete process.env.HUGGINGFACE_API_KEY
    process.env.ROUTING_ENABLED = "true"
    process.env.SIMPLE_PROVIDER = "gemini"
    process.env.MEDIUM_PROVIDER = "huggingface"
    process.env.COMPLEX_PROVIDER = "huggingface"

    const decision = resolveRoutingDecision(
      {
        messages: [{ role: "user", content: "Qual é o meu saldo?" }],
        context: baseContext,
      },
      getAiRuntimeConfig(),
    )

    expect(getConfiguredProviderIds()).toEqual(["openrouter"])
    expect(decision.selectedProvider).toBe("openrouter")
    expect(decision.reason).toBe("single_provider_available")
  })

  it("keeps legacy AI_PROVIDER behavior when routing is disabled", () => {
    process.env.AI_PROVIDER = "gemini"
    process.env.GEMINI_API_KEY = "gemini-key"
    process.env.OPENROUTER_API_KEY = "or-key"
    process.env.ROUTING_ENABLED = "false"

    const decision = resolveRoutingDecision(
      {
        messages: [{ role: "user", content: "Como está meu saldo?" }],
        context: baseContext,
      },
      getAiRuntimeConfig(),
    )

    expect(decision.selectedProvider).toBe("gemini")
    expect(decision.reason).toBe("routing_disabled")
  })

  it("routes simple requests to SIMPLE_PROVIDER when routing is enabled", () => {
    process.env.OPENROUTER_API_KEY = "or-key"
    process.env.GEMINI_API_KEY = "gemini-key"
    process.env.ROUTING_ENABLED = "true"
    process.env.SIMPLE_PROVIDER = "openrouter"
    process.env.MEDIUM_PROVIDER = "gemini"
    process.env.COMPLEX_PROVIDER = "gemini"

    const decision = resolveRoutingDecision(
      {
        messages: [{ role: "user", content: "Qual é o meu saldo?" }],
        context: { ...baseContext, question: "Qual é o meu saldo?" },
      },
      getAiRuntimeConfig(),
    )

    expect(decision.complexity).toBe("simple")
    expect(decision.selectedProvider).toBe("openrouter")
    expect(decision.reason).toBe("complexity_simple")
  })

  it("builds fallback chains across configured providers", () => {
    expect(
      buildProviderFallbackChain("openrouter", ["openrouter", "gemini", "huggingface"]),
    ).toEqual(["openrouter", "gemini", "huggingface"])
  })

  it("falls back to the next configured provider when the selected one fails", async () => {
    process.env.OPENROUTER_API_KEY = "or-key"
    process.env.GEMINI_API_KEY = "gemini-key"
    process.env.ROUTING_ENABLED = "true"
    process.env.SIMPLE_PROVIDER = "openrouter"
    process.env.MEDIUM_PROVIDER = "openrouter"
    process.env.COMPLEX_PROVIDER = "openrouter"

    vi.spyOn(openRouterProvider, "complete").mockResolvedValue({
      ok: false,
      provider: "openrouter",
      errorCode: "service_unavailable",
      technicalMessage: "upstream down",
      userMessage: "indisponível",
    })

    const geminiSpy = vi.spyOn(geminiProvider, "complete").mockResolvedValue({
      ok: true,
      response: new Response("data: [DONE]\n\n"),
      model: "gemini-2.5-flash",
      provider: "gemini",
      mode: "stream",
    })

    vi.spyOn(huggingFaceProvider, "complete")

    const result = await completePennyConversation({
      messages: [{ role: "user", content: "Qual é o meu saldo?" }],
      context: baseContext,
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.provider).toBe("gemini")
    expect(geminiSpy).toHaveBeenCalledOnce()
  })
})