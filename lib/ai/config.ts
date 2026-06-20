import {
  DEFAULT_OPENROUTER_FALLBACK_MODEL,
  DEFAULT_OPENROUTER_MODEL,
} from "@/lib/penny"
import type { AiProviderId } from "./types"

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
export const DEFAULT_GEMINI_FALLBACK_MODEL = "gemini-2.5-pro"

export const DEFAULT_HUGGINGFACE_MODEL = "Qwen/Qwen2.5-7B-Instruct-1M"
export const DEFAULT_HUGGINGFACE_FALLBACK_MODEL = "meta-llama/Llama-3.1-8B-Instruct"
export const DEFAULT_HUGGINGFACE_API_BASE = "https://router.huggingface.co/v1"

export const DEFAULT_AI_TIMEOUT_MS = 60_000
export const DEFAULT_AI_TEMPERATURE = 0.2
export const DEFAULT_AI_MAX_TOKENS = 8_192
export const DEFAULT_AI_RATE_LIMIT_PER_MINUTE = 60

export type AiRoutingConfig = {
  enabled: boolean
  simpleProvider: AiProviderId
  mediumProvider: AiProviderId
  complexProvider: AiProviderId
  crossProviderFallback: boolean
}

export type AiRuntimeConfig = {
  provider: AiProviderId
  routing: AiRoutingConfig
  timeoutMs: number
  temperature: number
  maxTokens: number
  rateLimitPerMinute: number
  openrouter: {
    apiKey: string | undefined
    model: string
    fallbackModel: string
  }
  gemini: {
    apiKey: string | undefined
    model: string
    fallbackModel: string
    timeoutMs: number
  }
  huggingface: {
    apiKey: string | undefined
    model: string
    fallbackModel: string
    timeoutMs: number
    apiBase: string
  }
}

function parseProvider(value: string | undefined): AiProviderId {
  const normalized = value?.toLowerCase()
  if (normalized === "gemini") return "gemini"
  if (normalized === "huggingface" || normalized === "hf") return "huggingface"
  return "openrouter"
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true
  if (normalized === "false" || normalized === "0" || normalized === "no") return false
  return fallback
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function parseTemperature(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(2, Math.max(0, parsed))
}

export function getAiRuntimeConfig(env: NodeJS.ProcessEnv = process.env): AiRuntimeConfig {
  const timeoutMs = parsePositiveInt(env.AI_TIMEOUT_MS, DEFAULT_AI_TIMEOUT_MS)
  const geminiTimeoutMs = parsePositiveInt(env.GEMINI_TIMEOUT_MS, timeoutMs)
  const huggingFaceTimeoutMs = parsePositiveInt(env.HUGGINGFACE_TIMEOUT_MS, timeoutMs)

  const routingEnabled = parseBoolean(env.ROUTING_ENABLED, false)

  return {
    provider: parseProvider(env.AI_PROVIDER),
    routing: {
      enabled: routingEnabled,
      simpleProvider: parseProvider(env.SIMPLE_PROVIDER ?? "openrouter"),
      mediumProvider: parseProvider(env.MEDIUM_PROVIDER ?? env.AI_PROVIDER ?? "openrouter"),
      complexProvider: parseProvider(env.COMPLEX_PROVIDER ?? env.AI_PROVIDER ?? "openrouter"),
      crossProviderFallback: parseBoolean(env.ROUTING_CROSS_PROVIDER_FALLBACK, true),
    },
    timeoutMs,
    temperature: parseTemperature(env.AI_TEMPERATURE, DEFAULT_AI_TEMPERATURE),
    maxTokens: parsePositiveInt(env.AI_MAX_TOKENS, DEFAULT_AI_MAX_TOKENS),
    rateLimitPerMinute: parsePositiveInt(
      env.AI_RATE_LIMIT_PER_MINUTE,
      DEFAULT_AI_RATE_LIMIT_PER_MINUTE,
    ),
    openrouter: {
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
      fallbackModel: env.OPENROUTER_FALLBACK_MODEL || DEFAULT_OPENROUTER_FALLBACK_MODEL,
    },
    gemini: {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      fallbackModel: env.GEMINI_FALLBACK_MODEL || DEFAULT_GEMINI_FALLBACK_MODEL,
      timeoutMs: geminiTimeoutMs,
    },
    huggingface: {
      apiKey: env.HUGGINGFACE_API_KEY || env.HF_API_KEY,
      model: env.HUGGINGFACE_MODEL || DEFAULT_HUGGINGFACE_MODEL,
      fallbackModel: env.HUGGINGFACE_FALLBACK_MODEL || DEFAULT_HUGGINGFACE_FALLBACK_MODEL,
      timeoutMs: huggingFaceTimeoutMs,
      apiBase: env.HUGGINGFACE_API_BASE || DEFAULT_HUGGINGFACE_API_BASE,
    },
  }
}

export function isGeminiStandby(config: AiRuntimeConfig = getAiRuntimeConfig()): boolean {
  return config.provider !== "gemini"
}

export function isHuggingFaceStandby(config: AiRuntimeConfig = getAiRuntimeConfig()): boolean {
  return config.provider !== "huggingface"
}