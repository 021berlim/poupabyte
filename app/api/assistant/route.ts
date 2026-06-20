import { NextResponse } from "next/server"
import { z } from "zod"
import {
  completePennyConversation,
  getAiRuntimeConfig,
  hasAnyConfiguredProvider,
  resolveActiveProviderId,
} from "@/lib/ai"
import { getAiProvider } from "@/lib/ai/registry"

export const runtime = "nodejs"
export const maxDuration = 60

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(8_000),
})

const sourceSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(1).max(500),
  sourceOfTruth: z.string().trim().min(1).max(200),
}).strict()

const contextSchema = z.object({
  generatedAt: z.string().datetime(),
  question: z.string().trim().min(1).max(8_000),
  routing: z.object({
    selectedSources: z.array(sourceSchema).max(12),
    dateRange: z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      label: z.string().trim().min(1).max(100),
    }).strict().optional(),
    alertKeys: z.array(z.string().max(200)).max(100),
  }).strict(),
  data: z.record(z.string(), z.unknown()),
}).strict()

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
  context: contextSchema,
  userName: z.string().trim().min(1).max(120).optional(),
}).strict()

const FORBIDDEN_IDENTITY_KEYS = new Set(["user", "profile", "email", "avatar", "password", "createdat"])

function containsIdentityData(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsIdentityData)
  if (!value || typeof value !== "object") return false
  return Object.entries(value).some(([key, item]) =>
    FORBIDDEN_IDENTITY_KEYS.has(key.toLowerCase()) || containsIdentityData(item),
  )
}

function missingApiKeyMessage(providerId: ReturnType<typeof resolveActiveProviderId>): string {
  const envVar =
    providerId === "gemini"
      ? "GEMINI_API_KEY"
      : providerId === "huggingface"
        ? "HUGGINGFACE_API_KEY"
        : "OPENROUTER_API_KEY"
  return `A variável ${envVar} não está configurada no servidor.`
}

export async function POST(request: Request) {
  const config = getAiRuntimeConfig()

  if (!hasAnyConfiguredProvider()) {
    return NextResponse.json(
      { error: "Nenhum provedor de IA está configurado no servidor." },
      { status: 503 },
    )
  }

  if (!config.routing.enabled) {
    const providerId = resolveActiveProviderId()
    const provider = getAiProvider(providerId)

    if (!provider.isConfigured()) {
      return NextResponse.json({ error: missingApiKeyMessage(providerId) }, { status: 503 })
    }
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensagens ou contexto financeiro inválidos." }, { status: 400 })
  }

  const latestMessage = parsed.data.messages.at(-1)
  if (
    latestMessage?.role !== "user" ||
    latestMessage.content.trim() !== parsed.data.context.question.trim() ||
    containsIdentityData(parsed.data.context.data)
  ) {
    return NextResponse.json({ error: "Contexto de conhecimento incompatível com a pergunta." }, { status: 400 })
  }

  const contextJson = JSON.stringify(parsed.data.context)
  const conversationSize = parsed.data.messages.reduce((total, message) => total + message.content.length, 0)
  if (contextJson.length > 50_000 || conversationSize > 40_000) {
    return NextResponse.json({ error: "A conversa excedeu o tamanho permitido." }, { status: 413 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const result = await completePennyConversation(
    {
      messages: parsed.data.messages,
      context: parsed.data.context,
      userDisplayName: parsed.data.userName,
    },
    { appUrl, mode: "stream" },
  )

  if (!result.ok) {
    console.error(`${getAiRuntimeConfig().provider} request failed`, {
      provider: result.provider,
      errorCode: result.errorCode,
      technicalMessage: result.technicalMessage,
      model: result.model,
      statusCode: result.statusCode,
    })
    const status =
      result.statusCode && result.statusCode >= 400 && result.statusCode < 600
        ? result.statusCode
        : 502
    return NextResponse.json({ error: result.userMessage }, { status })
  }

  return result.response
}