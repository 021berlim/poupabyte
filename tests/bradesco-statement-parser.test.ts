import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  categorizeBradescoType,
  parseBradescoStatementStructured,
  resolveBradescoRealDate,
} from "../lib/bradesco-statement-parser"
import { parseBradescoStatementWithValidation, parseStatement } from "../lib/statement-import"

const REAL_EXTRACT = readFileSync(
  new URL("./fixtures/bradesco-cellular-real-extract.txt", import.meta.url),
  "utf8",
)

describe("parseBradescoStatementStructured", () => {
  it("regrede o extrato real completo com 81 transações e todos os checkpoints", () => {
    const result = parseBradescoStatementStructured(REAL_EXTRACT)

    expect(result.conta).toMatchObject({
      titular: "JOAO DAVID FERREIRA DA MOTTA",
      instituicao: "Bradesco Celular",
      agencia: "2778",
      conta: "47413-4",
      solicitado_em: "2026-06-19T16:03",
      periodo_inicio: "2026-05-21",
      periodo_fim: "2026-06-19",
    })
    expect(result.transacoes).toHaveLength(81)
    expect(result.saldos_referencia).toEqual([
      { data: "2026-05-20", saldo: 71.4 },
      { data: "2026-06-16", saldo: 3.62 },
    ])
    expect(result.totais_declarados).toEqual([
      { secao: "movimentacao", credito: 1585.12, debito: 1652.9, saldo_final: 3.62 },
      { secao: "ultimos_lancamentos", credito: 25, debito: 28.08, saldo_final: 0.54 },
    ])

    const totalCredit = result.transacoes.reduce((sum, transaction) => sum + Math.max(transaction.valor, 0), 0)
    const totalDebit = result.transacoes.reduce((sum, transaction) => sum + Math.max(-transaction.valor, 0), 0)
    expect(totalCredit).toBeCloseTo(1610.12, 2)
    expect(totalDebit).toBeCloseTo(1680.98, 2)
    expect(result.transacoes.at(-1)?.saldo_apos).toBe(0.54)
    expect(result.validacao).toEqual({
      totais_conferem: true,
      encadeamento_confere: true,
      continuidade_secoes_confere: true,
      inconsistencias: [],
      linhas_nao_reconhecidas: [],
    })
  })

  it("mantém data de postagem e data real Pix separadas", () => {
    const result = parseBradescoStatementStructured(REAL_EXTRACT)
    expect(result.transacoes.find((transaction) => transaction.docto === "1459193")).toMatchObject({
      data_extrato: "2026-05-25",
      data_real: "2026-05-23",
      papel: "REM",
      contraparte: "RENATO JORGE PAIXAO A",
    })
    expect(result.transacoes.find((transaction) => transaction.docto === "1412005")).toMatchObject({
      data_extrato: "2026-06-12",
      data_real: "2026-06-12",
      papel: "DES",
    })
  })

  it("determina crédito e débito pelo delta, inclusive Pagamento Governo RJ", () => {
    const result = parseBradescoStatementStructured(REAL_EXTRACT)
    expect(result.transacoes.find((transaction) => transaction.docto === "0005119")).toMatchObject({
      tipo_categoria: "PAGAMENTO_GOVERNO",
      valor: 500,
      saldo_apos: 503.02,
      referencia: "UG404310/2026OB005119T0000022975",
    })
  })
})

describe("regras auxiliares Bradesco", () => {
  it("resolve a virada de ano sem permitir data real posterior à postagem", () => {
    expect(resolveBradescoRealDate("31/12", "2027-01-02")).toBe("2026-12-31")
    expect(resolveBradescoRealDate("30/05", "2026-06-01")).toBe("2026-05-30")
  })

  it("preserva tipo desconhecido como OUTROS e não descarta a linha", () => {
    const text = `
Bradesco Celular
01/06/2026 COD. LANC. 0 10,00
NOVO TIPO BRADESCO
01/06/2026 1234567 2,00 12,00
DETALHE FUTURO
Total 2,00 0,00 12,00
`.trim()
    const result = parseBradescoStatementStructured(text)
    expect(categorizeBradescoType("NOVO TIPO BRADESCO")).toBe("OUTROS")
    expect(result.transacoes).toEqual([
      expect.objectContaining({
        tipo_raw: "NOVO TIPO BRADESCO",
        tipo_categoria: "OUTROS",
        detalhe_raw: "DETALHE FUTURO",
        valor: 2,
      }),
    ])
    expect(result.validacao.linhas_nao_reconhecidas).toEqual([])
  })
})

describe("integração da importação Bradesco", () => {
  it("usa data_real no fluxo de caixa e expõe a validação na API interna", () => {
    const parsed = parseBradescoStatementWithValidation(REAL_EXTRACT)
    const weekendPix = parsed.transactions.find(
      (transaction) =>
        transaction.description.includes("RENATO JORGE PAIXAO A") &&
        transaction.amount === 10 &&
        transaction.type === "income",
    )
    expect(weekendPix?.date).toBe("2026-05-23")

    const statement = parseStatement(REAL_EXTRACT, "auto")
    expect(statement.bank).toBe("bradesco")
    expect(statement.transactions).toHaveLength(81)
    expect(statement.bradescoValidation?.totais_conferem).toBe(true)
    expect(statement.bradescoStructured?.transacoes[8]).toMatchObject({
      data_extrato: "2026-05-25",
      data_real: "2026-05-23",
    })
  })
})
