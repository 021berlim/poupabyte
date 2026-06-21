import { describe, expect, it } from "vitest"
import {
  categorizarTipoInter,
  parseDescricaoInter,
  parseInterStatementStructured,
  parseMoneyBrl,
} from "../lib/inter-statement-parser"
import { parseInterStatementWithValidation } from "../lib/statement-import"

const SAMPLE_EXTRATO = `
Solicitado em: 19/06/2026 - 16h07
JOAO DAVID FERREIRA DA MOTTA
CPF/CNPJ: 160.308.247-67, Instituição: Banco Inter, Agência: 0001-9, Conta: 17110041-7
Período: 19/05/2026 a 19/06/2026
Saldo total
(bloqueado + disponível)
R$ 0,09
Saldo disponível: R$ 0,09
Saldo bloqueado: R$ 0,00

19 de Maio de 2026 Saldo do dia: R$ 0,09
Compra no debito: "No estabelecimento JACK STUDIO RIO DE JANEIR BRA" -R$ 0,01 R$ 0,09

20 de Maio de 2026 Saldo do dia: -R$ 6,00
Pix enviado: "Cp :60746948-Joao David Ferreira da Motta" -R$ 6,09 -R$ 6,00

21 de Maio de 2026 Saldo do dia: R$ 0,09
Pix recebido devolvido: "Cp :60746948-null" R$ 6,09 R$ 0,09
`.trim()

const SAMPLE_SALDO_ZERO_NEGATIVO = `
Período: 01/06/2026 a 30/06/2026
Saldo disponível: R$ 0,00

22 de Maio de 2026 Saldo do dia: -R$ 0,00
Compra no debito: "No estabelecimento TEST SHOP SAO PAULO BRA" -R$ 0,09 -R$ 0,00
`.trim()

const SAMPLE_LAYOUT_REAL_INTER = `
Solicitado em: 19/06/2026 - 16h07
CLIENTE TESTE
CPF/CNPJ: 123.456.789-00 , Instituição: Banco Inter , Agência: 0001-9 , Conta: 12345678-9
Período: 19/05/2026 a 19/06/2026
Saldo total Saldo disponível: Saldo bloqueado:
R$ 1,80 R$ 1,80 R$ 0,00
(bloqueado + disponível)
Valor Saldo por transação
18 de Junho de 2026 Saldo do dia: R$ 1,80
Cashback: "INTER PRE 20GB MENSAL" R$ 1,80 R$ 1,80
`.trim()

describe("parseMoneyBrl", () => {
  it("converte valores positivos e negativos", () => {
    expect(parseMoneyBrl("R$ 1.234,56")).toBe(1234.56)
    expect(parseMoneyBrl("-R$ 6,09")).toBe(-6.09)
  })

  it("normaliza zero negativo", () => {
    expect(parseMoneyBrl("-R$ 0,00")).toBe(0)
    expect(Object.is(parseMoneyBrl("-R$ 0,00"), -0)).toBe(false)
  })
})

describe("categorizarTipoInter", () => {
  it("mapeia tipos conhecidos e usa OUTROS como fallback", () => {
    expect(categorizarTipoInter("Pix enviado")).toBe("PIX_ENVIADO")
    expect(categorizarTipoInter("TED enviada")).toBe("TED_ENVIADA")
    expect(categorizarTipoInter("Tipo desconhecido")).toBe("OUTROS")
  })
})

describe("parseDescricaoInter", () => {
  it("extrai contraparte de Pix e normaliza null literal", () => {
    const pix = parseDescricaoInter("PIX_ENVIADO", "Cp :60746948-Joao David Ferreira da Motta")
    expect(pix.codigo_controle).toBe("60746948")
    expect(pix.contraparte).toBe("Joao David Ferreira da Motta")

    const devolvido = parseDescricaoInter("PIX_RECEBIDO_DEVOLVIDO", "Cp :60746948-null")
    expect(devolvido.contraparte).toBeNull()
  })

  it("extrai estabelecimento e país de compra no débito", () => {
    const compra = parseDescricaoInter(
      "COMPRA_DEBITO",
      "No estabelecimento JACK STUDIO RIO DE JANEIR BRA",
    )
    expect(compra.estabelecimento).toBe("JACK STUDIO RIO DE JANEIR")
    expect(compra.pais).toBe("BRA")
  })
})

describe("parseInterStatementStructured", () => {
  it("extrai cabeçalho, transações e valida saldos com 100% de consistência", () => {
    const result = parseInterStatementStructured(SAMPLE_EXTRATO)

    expect(result.conta.titular).toBe("JOAO DAVID FERREIRA DA MOTTA")
    expect(result.conta.cpf_cnpj).toBe("160.308.247-67")
    expect(result.conta.instituicao).toBe("Banco Inter")
    expect(result.conta.periodo_inicio).toBe("2026-05-19")
    expect(result.conta.periodo_fim).toBe("2026-06-19")
    expect(result.conta.solicitado_em).toBe("2026-06-19T16:07")
    expect(result.conta.saldo_disponivel).toBe(0.09)

    expect(result.transacoes).toHaveLength(3)
    expect(result.transacoes[0]).toMatchObject({
      data: "2026-05-19",
      tipo_raw: "Compra no debito",
      tipo_categoria: "COMPRA_DEBITO",
      valor: -0.01,
      saldo_apos: 0.09,
      estabelecimento: "JACK STUDIO RIO DE JANEIR",
      pais: "BRA",
    })
    expect(result.transacoes[1]).toMatchObject({
      data: "2026-05-20",
      tipo_categoria: "PIX_ENVIADO",
      valor: -6.09,
      saldo_apos: -6,
      contraparte: "Joao David Ferreira da Motta",
    })
    expect(result.transacoes[2]).toMatchObject({
      data: "2026-05-21",
      tipo_categoria: "PIX_RECEBIDO_DEVOLVIDO",
      valor: 6.09,
      saldo_apos: 0.09,
      contraparte: null,
    })
    expect(result.validacao.saldo_final_confere).toBe(true)
    expect(result.validacao.inconsistencias).toEqual([])
    expect(result.validacao.linhas_nao_reconhecidas).toEqual([])
  })

  it("normaliza saldo do dia exibido como -R$ 0,00", () => {
    const result = parseInterStatementStructured(SAMPLE_SALDO_ZERO_NEGATIVO)
    expect(result.transacoes[0].saldo_apos).toBe(0)
    expect(result.validacao.saldo_final_confere).toBe(true)
    expect(result.validacao.inconsistencias).toEqual([])
  })

  it("aceita tipos desconhecidos sem descartar a transação", () => {
    const text = `
Período: 01/06/2026 a 30/06/2026
Saldo disponível: R$ 10,00

10 de Junho de 2026 Saldo do dia: R$ 10,00
Rendimento: "CDB Inter" R$ 10,00 R$ 10,00
`.trim()

    const result = parseInterStatementStructured(text)
    expect(result.transacoes).toHaveLength(1)
    expect(result.transacoes[0].tipo_raw).toBe("Rendimento")
    expect(result.transacoes[0].tipo_categoria).toBe("RENDIMENTO")
    expect(result.validacao.saldo_final_confere).toBe(true)
  })
})

describe("parseInterStatementWithValidation", () => {
  it("converte para transações importáveis mantendo validação", () => {
    const { transactions, validation } = parseInterStatementWithValidation(SAMPLE_EXTRATO)

    expect(transactions).toHaveLength(3)
    expect(transactions[0].description).toBe("JACK STUDIO RIO DE JANEIR")
    expect(transactions[0].type).toBe("expense")
    expect(transactions[1].description).toContain("Joao David Ferreira da Motta")
    expect(transactions[1].type).toBe("transfer")
    expect(transactions[2].type).toBe("income")
    expect(validation.saldo_final_confere).toBe(true)
    expect(validation.inconsistencias).toEqual([])
  })

  it("usa o sinal do valor como fonte de verdade e preserva o tipo Cashback", () => {
    const { transactions, validation, conta } =
      parseInterStatementWithValidation(SAMPLE_LAYOUT_REAL_INTER)

    expect(conta).toMatchObject({
      titular: "CLIENTE TESTE",
      cpf_cnpj: "123.456.789-00",
      instituicao: "Banco Inter",
      agencia: "0001-9",
      conta: "12345678-9",
      saldo_total: 1.8,
      saldo_disponivel: 1.8,
      saldo_bloqueado: 0,
    })
    expect(transactions).toEqual([
      expect.objectContaining({
        description: "Cashback - INTER PRE 20GB MENSAL",
        amount: 1.8,
        type: "income",
      }),
    ])
    expect(validation.saldo_final_confere).toBe(true)
    expect(validation.inconsistencias).toEqual([])
  })
})
