import { NextResponse } from "next/server"
import { getAiMonitoringSnapshot, getProviderReadiness, getRoutingObservabilitySummary } from "@/lib/ai"

export const runtime = "nodejs"
export const dynamic = "force-static"

export async function GET() {
  const readiness = getProviderReadiness()
  const monitoring = getAiMonitoringSnapshot()

  return NextResponse.json({
    activeProvider: readiness.activeProvider,
    configuredProviders: readiness.configuredProviders,
    routingEnabled: readiness.routingEnabled,
    routing: readiness.routing,
    standbyProviders: readiness.standbyProviders,
    geminiStandby: readiness.routingEnabled
      ? !readiness.configuredProviders.includes("gemini")
      : readiness.activeProvider !== "gemini",
    huggingfaceStandby: readiness.routingEnabled
      ? !readiness.configuredProviders.includes("huggingface")
      : readiness.activeProvider !== "huggingface",
    configuration: {
      timeoutMs: readiness.timeoutMs,
      temperature: readiness.temperature,
      maxTokens: readiness.maxTokens,
      rateLimitPerMinute: readiness.rateLimitPerMinute,
    },
    routingObservability: getRoutingObservabilitySummary(),
    providers: readiness.providers.map((provider) => ({
      id: provider.id,
      label: provider.label,
      configured: provider.configured,
      active: provider.active,
      defaultModel: provider.defaultModel,
      fallbackModel: provider.fallbackModel,
      supportsStreaming: provider.supportsStreaming,
    })),
    monitoring,
  })
}
