export type InterTransactionCategory =
  | "PIX_ENVIADO"
  | "PIX_RECEBIDO"
  | "PIX_RECEBIDO_DEVOLVIDO"
  | "PIX_ENVIADO_DEVOLVIDO"
  | "COMPRA_DEBITO"
  | "COMPRA_CREDITO"
  | "COMPRA_INTER_CEL"
  | "CASHBACK"
  | "SAQUE"
  | "TED_ENVIADA"
  | "TED_RECEBIDA"
  | "PAGAMENTO_BOLETO"
  | "RENDIMENTO"
  | "ESTORNO"
  | "OUTROS"

export interface InterStatementAccount {
  titular?: string
  cpf_cnpj?: string
  instituicao?: string
  agencia?: string
  conta?: string
  periodo_inicio?: string
  periodo_fim?: string
  solicitado_em?: string
  saldo_total?: number
  saldo_disponivel?: number
  saldo_bloqueado?: number
}

export interface InterStatementTransaction {
  data: string
  tipo_raw: string
  tipo_categoria: InterTransactionCategory
  descricao_raw: string
  valor: number
  saldo_apos: number
  contraparte: string | null
  codigo_controle: string | null
  estabelecimento: string | null
  pais: string | null
}

export interface InterStatementValidation {
  saldo_final_calculado: number | null
  saldo_disponivel_informado: number | undefined
  saldo_final_confere: boolean
  inconsistencias: string[]
  linhas_nao_reconhecidas: string[]
}

export interface InterStatementResult {
  conta: InterStatementAccount
  transacoes: InterStatementTransaction[]
  validacao: InterStatementValidation
}

const MESES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  "março": 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
}

const RE_MONEY = /-?R\$\s*[\d.,]+/
const RE_MONEY_GLOBAL = /-?R\$\s*[\d.,]+/g
const RE_DIA = /^(\d{1,2}) de (\S+) de (\d{4})\s+Saldo do dia:\s*(-?R\$\s*[\d.,]+)\s*$/i
const RE_TX = /^([^:"]+):\s*"([^"]*)"\s+(-?R\$\s*[\d.,]+)\s+(-?R\$\s*[\d.,]+)\s*$/
const RE_HEADER_LINE =
  /CPF\/CNPJ:\s*([\d./-]+)\s*,\s*Institui[cç][aã]o:\s*([^,]+?)\s*,\s*Ag[eê]ncia:\s*([\w-]+)\s*,\s*Conta:\s*([\w-]+)/i
const RE_PERIODO = /Per[ií]odo:\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i
const RE_SOLICITADO = /Solicitado em:\s*(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})h(\d{2})/i

const TIPO_CATEGORIA_MAP: Record<string, InterTransactionCategory> = {
  "pix enviado": "PIX_ENVIADO",
  "pix recebido": "PIX_RECEBIDO",
  "pix recebido devolvido": "PIX_RECEBIDO_DEVOLVIDO",
  "pix enviado devolvido": "PIX_ENVIADO_DEVOLVIDO",
  "compra no debito": "COMPRA_DEBITO",
  "compra no débito": "COMPRA_DEBITO",
  "compra no credito": "COMPRA_CREDITO",
  "compra no crédito": "COMPRA_CREDITO",
  "compra inter cel": "COMPRA_INTER_CEL",
  cashback: "CASHBACK",
  saque: "SAQUE",
  "ted enviada": "TED_ENVIADA",
  "ted recebida": "TED_RECEBIDA",
  "pagamento de boleto": "PAGAMENTO_BOLETO",
  rendimento: "RENDIMENTO",
  estorno: "ESTORNO",
}

/** Converte 'R$ 1.234,56' / '-R$ 0,01' para número, normalizando -0.0 → 0.0 */
export function parseMoneyBrl(value: string): number {
  let s = value.trim()
  const neg = s.startsWith("-")
  s = s.replace(/-/g, "").replace(/R\$/g, "").trim()
  s = s.replace(/\./g, "").replace(",", ".")
  let v = s ? Number.parseFloat(s) : 0
  if (!Number.isFinite(v)) v = 0
  if (neg) v = -v
  if (Object.is(v, -0) || v === 0) v = 0
  return Math.round(v * 100) / 100
}

function parseDataExtenso(dia: string, mesNome: string, ano: string): string {
  const mes = MESES[mesNome.toLowerCase()]
  if (!mes) return ""
  const day = dia.padStart(2, "0")
  const month = String(mes).padStart(2, "0")
  return `${ano}-${month}-${day}`
}

function brDateToIso(value: string): string {
  const [day, month, year] = value.split("/")
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

export function categorizarTipoInter(tipoRaw: string): InterTransactionCategory {
  return TIPO_CATEGORIA_MAP[tipoRaw.trim().toLowerCase()] ?? "OUTROS"
}

export function parseDescricaoInter(
  _tipoCategoria: InterTransactionCategory,
  descricaoRaw: string,
): Pick<InterStatementTransaction, "contraparte" | "codigo_controle" | "estabelecimento" | "pais"> {
  const out = {
    contraparte: null as string | null,
    codigo_controle: null as string | null,
    estabelecimento: null as string | null,
    pais: null as string | null,
  }

  const pixMatch = descricaoRaw.match(/^Cp\s*:\s*(\d+)-(.*)$/i)
  if (pixMatch) {
    out.codigo_controle = pixMatch[1]
    const contraparte = pixMatch[2].trim()
    out.contraparte =
      contraparte.toLowerCase() === "null" || contraparte === "" ? null : contraparte
    return out
  }

  const compraMatch = descricaoRaw.match(/^No estabelecimento (.+?)\s+([A-Z]{3})$/i)
  if (compraMatch) {
    out.estabelecimento = compraMatch[1].trim()
    out.pais = compraMatch[2].toUpperCase()
    return out
  }

  return out
}

function extrairValorAposLabel(linhas: string[], idxLabel: number): string | null {
  for (let j = idxLabel; j < Math.min(idxLabel + 4, linhas.length); j += 1) {
    const match = linhas[j].match(RE_MONEY)
    if (match) return match[0]
  }
  return null
}

function textoSemAcentos(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function parseResumoSaldosEmColunas(
  linhas: string[],
): Pick<InterStatementAccount, "saldo_total" | "saldo_disponivel" | "saldo_bloqueado"> {
  for (let i = 0; i < linhas.length; i += 1) {
    const label = textoSemAcentos(linhas[i])
    if (
      !label.includes("saldo total") ||
      !label.includes("saldo disponivel") ||
      !label.includes("saldo bloqueado")
    ) {
      continue
    }

    const valores: string[] = []
    for (let j = i; j < Math.min(i + 4, linhas.length) && valores.length < 3; j += 1) {
      valores.push(...(linhas[j].match(RE_MONEY_GLOBAL) ?? []))
    }
    if (valores.length >= 3) {
      return {
        saldo_total: parseMoneyBrl(valores[0]),
        saldo_disponivel: parseMoneyBrl(valores[1]),
        saldo_bloqueado: parseMoneyBrl(valores[2]),
      }
    }
  }
  return {}
}

function parseCabecalho(linhas: string[]): InterStatementAccount {
  const cab: InterStatementAccount = { ...parseResumoSaldosEmColunas(linhas) }
  const textoCompleto = linhas.join("\n")

  const solicitado = textoCompleto.match(RE_SOLICITADO)
  if (solicitado) {
    const [, d, mo, y, h, mi] = solicitado
    cab.solicitado_em = `${y}-${mo}-${d}T${h}:${mi}`
  }

  const header = textoCompleto.match(RE_HEADER_LINE)
  if (header) {
    cab.cpf_cnpj = header[1]
    cab.instituicao = header[2].trim()
    cab.agencia = header[3]
    cab.conta = header[4]
  }

  const periodo = textoCompleto.match(RE_PERIODO)
  if (periodo) {
    cab.periodo_inicio = brDateToIso(periodo[1])
    cab.periodo_fim = brDateToIso(periodo[2])
  }

  for (let i = 0; i < linhas.length; i += 1) {
    if (linhas[i].includes("Solicitado em")) {
      for (let j = i + 1; j < Math.min(i + 3, linhas.length); j += 1) {
        const cand = linhas[j].trim()
        if (cand && !cand.includes("R$") && !cand.includes(":")) {
          cab.titular = cand
          break
        }
      }
      break
    }
  }

  for (let i = 0; i < linhas.length; i += 1) {
    const linha = linhas[i].trim()
    if (linha === "Saldo total") {
      const v = extrairValorAposLabel(linhas, i)
      if (v) cab.saldo_total = parseMoneyBrl(v)
    } else if (linha.startsWith("Saldo disponível") || linha.startsWith("Saldo disponivel")) {
      const v = extrairValorAposLabel(linhas, i)
      if (v) cab.saldo_disponivel = parseMoneyBrl(v)
    } else if (linha.startsWith("Saldo bloqueado")) {
      const v = extrairValorAposLabel(linhas, i)
      if (v) cab.saldo_bloqueado = parseMoneyBrl(v)
    }
  }

  return cab
}

function isHeaderOrMetadataLine(line: string): boolean {
  const value = line.trim()
  if (!value) return true
  if (RE_SOLICITADO.test(value)) return true
  if (RE_HEADER_LINE.test(value)) return true
  if (RE_PERIODO.test(value)) return true
  if (value === "Saldo total") return true
  if (value.startsWith("Saldo disponível") || value.startsWith("Saldo disponivel")) return true
  if (value.startsWith("Saldo bloqueado")) return true
  if (value.startsWith("(bloqueado")) return true
  if (value.includes("INSTITUI") && value.includes("BANCO INTER")) return true
  return false
}

/**
 * Parser estruturado para extratos do Banco Inter (texto extraído de PDF).
 * Inclui validação obrigatória de saldos (fechamento diário, encadeamento e saldo final).
 *
 * A primeira transação do extrato não participa da checagem de encadeamento contínuo,
 * pois o saldo de abertura do período não é informado no documento.
 */
export function parseInterStatementStructured(text: string): InterStatementResult {
  const linhas = text.split(/\r?\n/).map((l) => l.trim())
  const conta = parseCabecalho(linhas)

  const transacoes: InterStatementTransaction[] = []
  const inconsistencias: string[] = []
  const linhasNaoReconhecidas: string[] = []

  let dataAtual: string | null = null
  let saldoDiaRawAtual: string | null = null
  let dentroDoCorpo = false

  function fechaDiaAnterior() {
    if (transacoes.length === 0 || dataAtual === null || saldoDiaRawAtual === null) return
    const ultimo = transacoes[transacoes.length - 1]
    if (ultimo.data !== dataAtual) return
    const esperado = parseMoneyBrl(saldoDiaRawAtual)
    if (Math.abs(ultimo.saldo_apos - esperado) > 0.001) {
      inconsistencias.push(
        `Saldo do dia ${dataAtual} (${esperado}) != saldo após última transação do dia (${ultimo.saldo_apos})`,
      )
    }
  }

  for (const linha of linhas) {
    if (!linha) continue

    const diaMatch = linha.match(RE_DIA)
    if (diaMatch) {
      dentroDoCorpo = true
      fechaDiaAnterior()
      const [, dia, mesNome, ano, saldoRaw] = diaMatch
      dataAtual = parseDataExtenso(dia, mesNome, ano)
      saldoDiaRawAtual = saldoRaw
      continue
    }

    const txMatch = linha.match(RE_TX)
    if (txMatch) {
      dentroDoCorpo = true
      const [, tipoRaw, descricaoRaw, valorRaw, saldoRaw] = txMatch
      const tipoCategoria = categorizarTipoInter(tipoRaw)
      const sub = parseDescricaoInter(tipoCategoria, descricaoRaw.trim())
      transacoes.push({
        data: dataAtual ?? "",
        tipo_raw: tipoRaw.trim(),
        tipo_categoria: tipoCategoria,
        descricao_raw: descricaoRaw.trim(),
        valor: parseMoneyBrl(valorRaw),
        saldo_apos: parseMoneyBrl(saldoRaw),
        ...sub,
      })
      continue
    }

    if (dentroDoCorpo && !isHeaderOrMetadataLine(linha) && !RE_MONEY.test(linha)) {
      linhasNaoReconhecidas.push(linha)
    }
  }

  fechaDiaAnterior()

  // Encadeamento contínuo — pula a 1ª transação (saldo de abertura não informado no extrato).
  let saldoAnterior: number | null = null
  for (let i = 0; i < transacoes.length; i += 1) {
    const tx = transacoes[i]
    if (saldoAnterior !== null) {
      const esperado = Math.round((saldoAnterior + tx.valor) * 100) / 100
      if (Math.abs(esperado - tx.saldo_apos) > 0.001) {
        inconsistencias.push(
          `Transação ${i} (${tx.data} ${tx.tipo_raw}): esperado saldo ${esperado}, obtido ${tx.saldo_apos}`,
        )
      }
    }
    saldoAnterior = tx.saldo_apos
  }

  const saldoFinalCalculado = transacoes.length > 0 ? transacoes[transacoes.length - 1].saldo_apos : null
  const saldoDisponivelInformado = conta.saldo_disponivel
  const saldoFinalConfere =
    saldoFinalCalculado !== null &&
    saldoDisponivelInformado !== undefined &&
    Math.abs(saldoFinalCalculado - saldoDisponivelInformado) < 0.001

  return {
    conta,
    transacoes,
    validacao: {
      saldo_final_calculado: saldoFinalCalculado,
      saldo_disponivel_informado: saldoDisponivelInformado,
      saldo_final_confere: saldoFinalConfere,
      inconsistencias,
      linhas_nao_reconhecidas: linhasNaoReconhecidas,
    },
  }
}
