import type { AiErrorCode, AiProviderId } from "./types"

const USER_MESSAGES: Record<AiErrorCode, string> = {
  missing_api_key:
    "O provedor de IA não está configurado no servidor. Entre em contato com o administrador.",
  invalid_api_key:
    "A credencial do provedor de IA é inválida. Entre em contato com o administrador.",
  timeout:
    "A resposta demorou mais do que o esperado. Tente novamente em instantes.",
  rate_limit:
    "O limite de uso do provedor de IA foi atingido. Aguarde um momento e tente novamente.",
  service_unavailable:
    "A P.E.N.N.Y está temporariamente indisponível. Tente novamente em instantes.",
  connection_error:
    "Não foi possível conectar ao provedor de IA. Verifique sua conexão e tente novamente.",
  invalid_response:
    "O provedor de IA retornou uma resposta inválida. Tente novamente em instantes.",
  invalid_request:
    "A solicitação não pôde ser processada pelo provedor de IA.",
  usage_limit:
    "O limite de uso configurado foi excedido. Tente novamente mais tarde.",
  model_not_found:
    "O modelo de IA configurado não foi encontrado. Entre em contato com o administrador.",
  model_unavailable:
    "O modelo de IA está temporariamente indisponível. Tente novamente em instantes.",
  unknown:
    "A P.E.N.N.Y está temporariamente indisponível. Tente novamente em instantes.",
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