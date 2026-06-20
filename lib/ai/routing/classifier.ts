import type { PennyUpstreamInput } from "../types"
import type { RequestComplexity } from "./types"

const COMPLEX_PATTERNS = [
  /\bplanej/,
  /\bestrat[eé]gi/,
  /\bsimul/,
  /\blongo prazo\b/,
  /\bdiagn[oó]stic/,
  /\bproje[cç]/,
  /\bcen[aá]rio/,
  /\ban[aá]lise profunda\b/,
  /\bcomo posso melhorar\b/,
  /\bplano financeiro\b/,
]

const SIMPLE_PATTERNS = [
  /\bsaldo\b/,
  /\bquanto (?:tenho|gastei|sobrou)\b/,
  /\bonde (?:vejo|encontro|acesso)\b/,
  /\bcomo acesso\b/,
  /\balertas?\b/,
  /\bqual (?:é|e) o\b/,
  /\bresumo r[aá]pido\b/,
]

export type ComplexitySignals = {
  score: number
  signals: string[]
}

export function analyzeRequestComplexity(input: PennyUpstreamInput): ComplexitySignals {
  const question = input.context.question.trim()
  const normalized = question.toLowerCase()
  let score = 0
  const signals: string[] = []

  if (question.length > 220) {
    score += 2
    signals.push("pergunta_longa")
  } else if (question.length > 90) {
    score += 1
    signals.push("pergunta_media")
  } else {
    signals.push("pergunta_curta")
  }

  const sourceCount = input.context.routing.selectedSources.length
  if (sourceCount >= 4) {
    score += 2
    signals.push("muitas_fontes")
  } else if (sourceCount >= 2) {
    score += 1
    signals.push("fontes_multiplas")
  }

  const contextSize = JSON.stringify(input.context.data).length
  if (contextSize > 15_000) {
    score += 2
    signals.push("contexto_grande")
  } else if (contextSize > 5_000) {
    score += 1
    signals.push("contexto_medio")
  }

  if (input.messages.length > 8) {
    score += 1
    signals.push("conversa_extensa")
  }

  if (input.context.routing.dateRange) {
    score += 1
    signals.push("recorte_temporal")
  }

  if (COMPLEX_PATTERNS.some((pattern) => pattern.test(normalized))) {
    score += 3
    signals.push("tema_complexo")
  }

  if (SIMPLE_PATTERNS.some((pattern) => pattern.test(normalized)) && question.length < 120) {
    score -= 2
    signals.push("consulta_objetiva")
  }

  return { score, signals }
}

export function classifyRequestComplexity(input: PennyUpstreamInput): RequestComplexity {
  const { score } = analyzeRequestComplexity(input)
  if (score <= 0) return "simple"
  if (score >= 4) return "complex"
  return "medium"
}