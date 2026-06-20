export const OPENROUTER_SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const

export function encodeOpenRouterDelta(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
}

export function encodeOpenRouterError(message: string): string {
  return `data: ${JSON.stringify({ error: { message } })}\n\n`
}

export function encodeOpenRouterDone(): string {
  return "data: [DONE]\n\n"
}

export function buildBlockingOpenRouterResponse(content: string): Response {
  const body = [
    encodeOpenRouterDelta(content),
    encodeOpenRouterDone(),
  ].join("")

  return new Response(body, {
    status: 200,
    headers: OPENROUTER_SSE_HEADERS,
  })
}