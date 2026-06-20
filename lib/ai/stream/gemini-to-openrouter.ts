import {
  buildBlockingOpenRouterResponse,
  encodeOpenRouterDelta,
  encodeOpenRouterDone,
  encodeOpenRouterError,
  OPENROUTER_SSE_HEADERS,
} from "./openrouter-sse"


type GeminiStreamChunk = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
    finishReason?: string
  }>
  error?: {
    message?: string
    code?: number
    status?: string
  }
}

function extractGeminiText(chunk: GeminiStreamChunk): string {
  const parts = chunk.candidates?.[0]?.content?.parts ?? []
  return parts.map((part) => part.text ?? "").join("")
}

function parseGeminiSseEvent(event: string): GeminiStreamChunk | null {
  const data = event
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")

  if (!data || data === "[DONE]") return null

  try {
    return JSON.parse(data) as GeminiStreamChunk
  } catch {
    return null
  }
}

export function transformGeminiStreamToOpenRouter(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ""

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader()

      try {
        while (true) {
          const { value, done } = await reader.read()
          buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n")

          let boundary = buffer.indexOf("\n\n")
          while (boundary >= 0) {
            const event = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            const chunk = parseGeminiSseEvent(event)

            if (chunk?.error?.message) {
              controller.enqueue(encoder.encode(encodeOpenRouterError(chunk.error.message)))
              controller.close()
              return
            }

            const text = chunk ? extractGeminiText(chunk) : ""
            if (text) controller.enqueue(encoder.encode(encodeOpenRouterDelta(text)))

            boundary = buffer.indexOf("\n\n")
          }

          if (done) {
            controller.enqueue(encoder.encode(encodeOpenRouterDone()))
            controller.close()
            return
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao processar streaming do Gemini."
        controller.enqueue(encoder.encode(encodeOpenRouterError(message)))
        controller.close()
      } finally {
        reader.releaseLock()
      }
    },
    cancel() {
      upstream.cancel().catch(() => undefined)
    },
  })
}

export function wrapGeminiStreamResponse(upstream: Response): Response {
  if (!upstream.body) {
    return new Response(encodeOpenRouterError("O Gemini não retornou corpo de resposta."), {
      status: 200,
      headers: OPENROUTER_SSE_HEADERS,
    })
  }

  return new Response(transformGeminiStreamToOpenRouter(upstream.body), {
    status: 200,
    headers: OPENROUTER_SSE_HEADERS,
  })
}

export function wrapGeminiBlockingResponse(payload: GeminiStreamChunk): Response {
  if (payload.error?.message) {
    return new Response(encodeOpenRouterError(payload.error.message), {
      status: 200,
      headers: OPENROUTER_SSE_HEADERS,
    })
  }

  const content = extractGeminiText(payload)
  if (!content) {
    return new Response(encodeOpenRouterError("O Gemini encerrou a resposta sem conteúdo."), {
      status: 200,
      headers: OPENROUTER_SSE_HEADERS,
    })
  }

  return buildBlockingOpenRouterResponse(content)
}