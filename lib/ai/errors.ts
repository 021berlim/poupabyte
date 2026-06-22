import type { AiErrorCode, AiProviderId } from "./types"

const USER_MESSAGES: Record<AiErrorCode, string> = {
  missing_api_key: "A Penny não está configurada. Fale com o suporte.",
  invalid_api_key: "A Penny não pôde se conectar. Fale com o suporte.",
  timeout: "A resposta demorou demais. Tente novamente.",
  rate_limit: "Muitas perguntas seguidas. Aguarde um momento.",
  service_unavailable: "A Penny está indisponível. Tente novamente.",
  connection_error: "Sem conexão. Verifique a internet.",
  invalid_response: "Não foi possível ler a resposta. Tente novamente.",
  invalid_request: "Não foi possível processar a pergunta. Tente novamente.",
  usage_limit: "Limite de uso atingido. Tente mais tarde.",
  model_not_found: "Modelo de IA não encontrado. Fale com o suporte.",
  model_unavailable: "Modelo indisponível. Tente novamente.",
  unknown: "A Penny está indisponível. Tente novamente.",
}

export function userMessageForError(code: AiErrorCode): string {
  return USER_MESSAGES[code]
}

export function classifyHttpError(status: number, providerLabel: string): {
  code: AiErrorCode
  technicalMessage: string
} {
  if (status === 401 || status === 403) {
    return {
      code: "invalid_api_key",
      technicalMessage: `${providerLabel} respondeu com HTTP ${status} (credencial inválida ou sem permissão).`,
    }
  }
  if (status === 408 || status === 504) {
    return {
      code: "timeout",
      technicalMessage: `${providerLabel} respondeu com HTTP ${status} (timeout upstream).`,
    }
  }
  if (status === 429) {
    return {
      code: "rate_limit",
      technicalMessage: `${providerLabel} respondeu com HTTP ${status} (limite de taxa excedido).`,
    }
  }
  if (status >= 500) {
    return {
      code: "service_unavailable",
      technicalMessage: `${providerLabel} respondeu com HTTP ${status} (serviço indisponível).`,
    }
  }
  if (status === 400 || status === 422) {
    return {
      code: "invalid_request",
      technicalMessage: `${providerLabel} respondeu com HTTP ${status} (payload inválido).`,
    }
  }
  return {
    code: "unknown",
    technicalMessage: `${providerLabel} respondeu com HTTP ${status}.`,
  }
}

export function classifyFetchError(error: unknown, providerLabel: string): {
  code: AiErrorCode
  technicalMessage: string
} {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return {
        code: "timeout",
        technicalMessage: `${providerLabel} request timeout: ${error.message}`,
      }
    }
    if (/fetch failed|network|ECONNREFUSED|ENOTFOUND|socket/i.test(error.message)) {
      return {
        code: "connection_error",
        technicalMessage: `${providerLabel} connection error: ${error.message}`,
      }
    }
    return {
      code: "unknown",
      technicalMessage: `${providerLabel} request failed: ${error.message}`,
    }
  }
  return {
    code: "unknown",
    technicalMessage: `${providerLabel} request failed with unknown error.`,
  }
}

export function buildFailure(
  provider: AiProviderId,
  code: AiErrorCode,
  technicalMessage: string,
  model?: string,
  statusCode?: number,
) {
  return {
    ok: false as const,
    provider,
    errorCode: code,
    technicalMessage,
    userMessage: userMessageForError(code),
    model,
    statusCode,
  }
}