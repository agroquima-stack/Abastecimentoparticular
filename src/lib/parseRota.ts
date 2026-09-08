import * as XLSX from 'xlsx'
import { dataBRparaISO } from './format'

export interface LinhaRota {
  placa: string
  kmPercorrido: number
  dataInicial: string // ISO
  dataFinal: string // ISO
}

export interface ResultadoParseRota {
  linhas: LinhaRota[]
  dataInicio: string // ISO, a mais comum entre as linhas — usada como id da semana
  dataFim: string
}

/** "805,881" (formato BR, milhar com ponto/decimal com vírgula) -> 805.881 */
function numeroBR(v: unknown): number {
  const s = String(v ?? '').trim()
  if (!s || s === '-') return 0
  return Number(s.replace(/\./g, '').replace(',', '.')) || 0
}

/**
 * Lê a aba "RESUMO" do relatório de rota exportado do rastreador (uma linha por placa, com o km
 * percorrido total do período — no fluxo semanal, o fim de semana anterior). Layout confirmado
 * em set/2026: header na linha onde a 1ª coluna é "Ativo", com colunas "KM Percorrido",
 * "Data Inicial" e "Data Final" nomeadas (posição pode variar entre exportações).
 */
export async function parseRotaXls(arquivo: File): Promise<ResultadoParseRota> {
  const buffer = await arquivo.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const nomeAba = wb.SheetNames.find((n) => n.trim().toUpperCase() === 'RESUMO')
  if (!nomeAba) throw new Error('Aba "RESUMO" não encontrada no arquivo. Confira se é o relatório de Rota exportado do rastreador.')

  const linhasBrutas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nomeAba], { header: 1, defval: '' })
  const idxHeader = linhasBrutas.findIndex((r) => String(r[0]).trim() === 'Ativo')
  if (idxHeader === -1) throw new Error('Não encontrei a linha de cabeçalho ("Ativo") na aba RESUMO.')

  const header = linhasBrutas[idxHeader].map((c) => String(c).trim())
  const iPlaca = 0
  const iKm = header.findIndex((c) => c === 'KM Percorrido')
  const iDataInicial = header.findIndex((c) => c === 'Data Inicial')
  const iDataFinal = header.findIndex((c) => c === 'Data Final')
  if (iKm === -1 || iDataInicial === -1 || iDataFinal === -1) {
    throw new Error('Colunas esperadas (KM Percorrido, Data Inicial, Data Final) não encontradas na aba RESUMO.')
  }

  const linhas: LinhaRota[] = []
  const contagemDatas = new Map<string, number>()
  for (let i = idxHeader + 1; i < linhasBrutas.length; i++) {
    const row = linhasBrutas[i]
    const placa = String(row[iPlaca] ?? '').replace(/\s+/g, '').toUpperCase()
    if (!placa) continue
    const dataInicialBR = String(row[iDataInicial] ?? '').trim()
    const dataFinalBR = String(row[iDataFinal] ?? '').trim()
    if (!dataInicialBR || !dataFinalBR) continue
    const dataInicial = dataBRparaISO(dataInicialBR)
    const dataFinal = dataBRparaISO(dataFinalBR)
    linhas.push({ placa, kmPercorrido: numeroBR(row[iKm]), dataInicial, dataFinal })
    contagemDatas.set(dataInicial, (contagemDatas.get(dataInicial) || 0) + 1)
  }
  if (linhas.length === 0) throw new Error('Nenhuma linha de veículo encontrada na aba RESUMO.')

  const dataInicio = [...contagemDatas.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const dataFimContagem = new Map<string, number>()
  for (const l of linhas) dataFimContagem.set(l.dataFinal, (dataFimContagem.get(l.dataFinal) || 0) + 1)
  const dataFim = [...dataFimContagem.entries()].sort((a, b) => b[1] - a[1])[0][0]

  return { linhas, dataInicio, dataFim }
}
