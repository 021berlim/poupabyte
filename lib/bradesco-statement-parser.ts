export type BradescoTransactionCategory =
  | "PIX_RECEBIDO"
  | "PIX_ENVIADO"
  | "PIX_QR_DINAMICO"
  | "PIX_QR_ESTATICO"
  | "COMPRA_DEBITO"
  | "PAGAMENTO_GOVERNO"
  | "RENDIMENTO"
  | "OUTROS"

export interface BradescoStatementAccount {
  titular?: string
  instituicao: "Bradesco Celular"
  agencia?: string
  conta?: string
  solicitado_em?: string
  periodo_inicio?: string
  periodo_fim?: string
}

export interface BradescoStatementTransaction {
  data_extrato: string
  data_real: string | null
  tipo_raw: string
  tipo_categoria: BradescoTransactionCategory
  docto: string
  papel: "REM" | "DES" | null
  contraparte: string | null
  estabelecimento: string | null
  referencia: string | null
  detalhe_raw: string
  valor: number
  saldo_apos: number
}

export interface BradescoReferenceBalance {
  data: string
  saldo: number
}

export interface BradescoDeclaredTotal {
  secao: "movimentacao" | "ultimos_lancamentos"
  credito: number
  debito: number
  saldo_final: number
}

export interface BradescoStatementValidation {
  totais_conferem: boolean
  encadeamento_confere: boolean
  continuidade_secoes_confere: boolean
  inconsistencias: string[]
  linhas_nao_reconhecidas: string[]
}

export interface BradescoStatementResult {
  conta: BradescoStatementAccount
  transacoes: BradescoStatementTransaction[]
  saldos_referencia: BradescoReferenceBalance[]
  totais_declarados: BradescoDeclaredTotal[]
  validacao: BradescoStatementValidation
}

type SectionKind = BradescoDeclaredTotal["secao"]

interface InternalTransaction extends BradescoStatementTransaction {
  secao: SectionKind
  valor_exibido: number
}

const RE_MOVEMENT = /^(?:(\d{2}\/\d{2}\/\d{4})\s+)?(\d{6,7})\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})$/
const RE_REFERENCE = /^(?:(\d{2}\/\d{2}\/\d{4})\s+)?COD\.\s*LANC\.\s*0(?:\s+(-?[\d.]+,\d{2}))?\s+(-?[\d.]+,\d{2})$/i
const RE_TOTAL = /^Total\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})$/i
const RE_PIX_DETAIL = /^(REM|DES):\s*(.+?)\s+(\d{2}\/\d{2})$/i

const CATEGORY_MAP: Record<string, BradescoTransactionCategory> = {
  "PIX RECEBIDO": "PIX_RECEBIDO",
  "PIX ENVIADO": "PIX_ENVIADO",
  "PIX QR CODE DINAMICO": "PIX_QR_DINAMICO",
  "PIX QR CODE ESTATICO": "PIX_QR_ESTATICO",
  "COMPRA ELO DEBITO VISTA": "COMPRA_DEBITO",
  "PAGAMENTO GOVERNO RJ": "PAGAMENTO_GOVERNO",
  RENDIMENTOS: "RENDIMENTO",
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
}

function money(value: string): number {
  const parsed = Number.parseFloat(value.replace(/\./g, "").replace(",", "."))
  if (!Number.isFinite(parsed) || parsed === 0) return 0
  return Math.round(parsed * 100) / 100
}

function cents(value: number): number {
  return Math.round(value * 100)
}

function isoDate(value: string): string {
  const [day, month, year] = value.split("/")
  return `${year}-${month}-${day}`
}

/** Resolve DD/MM against the posting date, including the December/January rollover. */
export function resolveBradescoRealDate(dayMonth: string, statementDate: string): string {
  const [day, month] = dayMonth.split("/").map(Number)
  const statementYear = Number(statementDate.slice(0, 4))
  const candidate = `${statementYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  return candidate > statementDate
    ? `${statementYear - 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : candidate
}

export function categorizeBradescoType(typeRaw: string): BradescoTransactionCategory {
  return CATEGORY_MAP[normalize(typeRaw)] ?? "OUTROS"
}

function isPix(typeRaw: string): boolean {
  return normalize(typeRaw).startsWith("PIX ")
}

function parseHeader(lines: string[]): BradescoStatementAccount {
  const account: BradescoStatementAccount = { instituicao: "Bradesco Celular" }

  for (const line of lines) {
    const normalized = normalize(line)
    const requested = normalized.match(/^DATA:\s*(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})H(\d{2})$/)
    if (requested) {
      const [, day, month, year, hour, minute] = requested
      account.solicitado_em = `${year}-${month}-${day}T${hour}:${minute}`
    }

    if (normalized.startsWith("NOME:")) account.titular = line.replace(/^Nome:\s*/i, "").trim()

    if (normalized.startsWith("EXTRATO DE:")) {
      const agency = normalized.match(/AGENCIA:\s*([^|]+)/)
      const number = normalized.match(/CONTA:\s*([^|]+)/)
      const period = normalized.match(/MOVIMENTACAO ENTRE:\s*(\d{2}\/\d{2}\/\d{4})\s+E\s+(\d{2}\/\d{2}\/\d{4})/)
      if (agency) account.agencia = agency[1].trim()
      if (number) account.conta = number[1].trim()
      if (period) {
        account.periodo_inicio = isoDate(period[1])
        account.periodo_fim = isoDate(period[2])
      }
    }
  }

  return account
}

function isHeaderLine(line: string): boolean {
  const value = normalize(line)
  return (
    !value ||
    value === "BRADESCO CELULAR" ||
    value.startsWith("DATA:") ||
    value.startsWith("NOME:") ||
    value.startsWith("EXTRATO DE:") ||
    value.startsWith("FOLHA:") ||
    (value.startsWith("DATA HISTORICO") && value.includes("SALDO (R$)"))
  )
}

/**
 * Parses the coordinate-sorted text emitted by pdf-text-extract.ts for Bradesco Celular.
 * Transaction direction is derived exclusively from consecutive balances.
 */
export function parseBradescoStatementStructured(text: string): BradescoStatementResult {
  const rawLines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim())
  const account = parseHeader(rawLines)
  const transactions: InternalTransaction[] = []
  const referenceBalances: BradescoReferenceBalance[] = []
  const declaredTotals: BradescoDeclaredTotal[] = []
  const inconsistencies: string[] = []
  const unrecognized: string[] = []

  let section: SectionKind = "movimentacao"
  let currentDate = ""
  let previousBalance: number | null = null
  let previousSectionFinal: number | null = null
  let sectionsContinuous = true

  for (let index = 0; index < rawLines.length; index += 1) {
    const line = rawLines[index]
    const normalized = normalize(line)

    if (normalized.startsWith("EXTRATO DE:")) {
      if (normalized.includes("ULTIMOS LANCAMENTOS")) section = "ultimos_lancamentos"
      continue
    }
    if (isHeaderLine(line)) continue

    const reference = line.match(RE_REFERENCE)
    if (reference) {
      if (reference[1]) currentDate = isoDate(reference[1])
      const balance = money(reference[3])
      referenceBalances.push({ data: currentDate, saldo: balance })
      if (section === "ultimos_lancamentos" && previousSectionFinal !== null && cents(balance) !== cents(previousSectionFinal)) {
        sectionsContinuous = false
        inconsistencies.push(`Saldo de abertura dos últimos lançamentos (${balance}) difere do fechamento anterior (${previousSectionFinal}).`)
      }
      previousBalance = balance
      continue
    }

    const total = line.match(RE_TOTAL)
    if (total) {
      const declared: BradescoDeclaredTotal = {
        secao: section,
        credito: money(total[1]),
        debito: money(total[2]),
        saldo_final: money(total[3]),
      }
      declaredTotals.push(declared)
      previousSectionFinal = declared.saldo_final
      previousBalance = declared.saldo_final
      continue
    }

    // A transaction is always type + movement + detail after repeated page headers are skipped.
    let movementIndex = index + 1
    while (movementIndex < rawLines.length && isHeaderLine(rawLines[movementIndex])) movementIndex += 1
    const movement = rawLines[movementIndex]?.match(RE_MOVEMENT)
    if (!movement) {
      unrecognized.push(line)
      continue
    }

    let detailIndex = movementIndex + 1
    while (detailIndex < rawLines.length && isHeaderLine(rawLines[detailIndex])) detailIndex += 1
    const detail = rawLines[detailIndex] ?? ""
    if (!detail || RE_TOTAL.test(detail) || RE_REFERENCE.test(detail) || RE_MOVEMENT.test(detail)) {
      unrecognized.push(line)
      continue
    }

    if (movement[1]) currentDate = isoDate(movement[1])
    if (!currentDate) {
      inconsistencies.push(`Transação sem data de extrato: ${line}`)
      unrecognized.push(line)
      index = detailIndex
      continue
    }

    const displayedValue = Math.abs(money(movement[3]))
    const balanceAfter = money(movement[4])
    let signedValue = 0
    if (previousBalance === null) {
      inconsistencies.push(`Não há saldo de referência para determinar o sinal de ${currentDate} ${line}.`)
    } else {
      signedValue = Math.round((balanceAfter - previousBalance) * 100) / 100
      if (Math.abs(cents(Math.abs(signedValue)) - cents(displayedValue)) > 0) {
        inconsistencies.push(
          `Valor de ${currentDate} ${line}: exibido ${displayedValue}, mas o delta de saldo é ${signedValue}.`,
        )
      }
    }

    const category = categorizeBradescoType(line)
    let realDate: string | null = null
    let role: "REM" | "DES" | null = null
    let counterparty: string | null = null
    let establishment: string | null = null
    let referenceText: string | null = null
    const pixDetail = detail.match(RE_PIX_DETAIL)

    if (isPix(line)) {
      if (pixDetail) {
        role = pixDetail[1].toUpperCase() as "REM" | "DES"
        counterparty = pixDetail[2].trim()
        realDate = resolveBradescoRealDate(pixDetail[3], currentDate)
      } else {
        inconsistencies.push(`Detalhe Pix não reconhecido em ${currentDate}: ${detail}`)
      }
    } else if (category === "COMPRA_DEBITO") {
      establishment = detail
    } else if (category === "PAGAMENTO_GOVERNO" || category === "RENDIMENTO") {
      referenceText = detail
    }

    transactions.push({
      data_extrato: currentDate,
      data_real: realDate,
      tipo_raw: line,
      tipo_categoria: category,
      docto: movement[2],
      papel: role,
      contraparte: counterparty,
      estabelecimento: establishment,
      referencia: referenceText,
      detalhe_raw: detail,
      valor: signedValue,
      saldo_apos: balanceAfter,
      secao: section,
      valor_exibido: displayedValue,
    })
    previousBalance = balanceAfter
    index = detailIndex
  }

  let totalsMatch = declaredTotals.length > 0
  for (const declared of declaredTotals) {
    const sectionTransactions = transactions.filter((transaction) => transaction.secao === declared.secao)
    const credit = sectionTransactions.reduce((sum, transaction) => sum + Math.max(transaction.valor, 0), 0)
    const debit = sectionTransactions.reduce((sum, transaction) => sum + Math.max(-transaction.valor, 0), 0)
    const finalBalance = sectionTransactions.at(-1)?.saldo_apos
    if (
      cents(credit) !== cents(declared.credito) ||
      cents(debit) !== cents(declared.debito) ||
      finalBalance === undefined ||
      cents(finalBalance) !== cents(declared.saldo_final)
    ) {
      totalsMatch = false
      inconsistencies.push(
        `Totais da seção ${declared.secao} não conferem: calculado ${credit.toFixed(2)}/${debit.toFixed(2)}/${finalBalance?.toFixed(2) ?? "sem saldo"}, declarado ${declared.credito.toFixed(2)}/${declared.debito.toFixed(2)}/${declared.saldo_final.toFixed(2)}.`,
      )
    }
  }

  const chainingMatches = !inconsistencies.some((message) =>
    message.startsWith("Valor de") || message.startsWith("Não há saldo de referência"),
  )

  return {
    conta: account,
    transacoes: transactions.map(({ secao: _section, valor_exibido: _displayed, ...transaction }) => transaction),
    saldos_referencia: referenceBalances,
    totais_declarados: declaredTotals,
    validacao: {
      totais_conferem: totalsMatch,
      encadeamento_confere: chainingMatches,
      continuidade_secoes_confere: sectionsContinuous,
      inconsistencias: inconsistencies,
      linhas_nao_reconhecidas: unrecognized,
    },
  }
}
