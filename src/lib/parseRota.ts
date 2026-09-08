import * as XLSX from 'xlsx'
import { dataBRparaISO } from './format'

export interface LinhaRota {
  placa: string
  kmPercorrido: number
  dataInicial: string // ISO
  dataFinal: string // ISO
}

export interface DiaRotaDetalhe {
  data: string // ISO
  odometro: number
  kmPercorrido: number
  paradas: number
  velMedia: string
  velMaxima: string
  horaSaida: string
  horaChegada: string
  tempoTrabalho: string
  tempoDentroCerca: string
  tempoAcimaVel: string
  tempoMovimento: string
  tempoParado: string
}

export interface ResultadoParseRota {
  linhas: LinhaRota[]
  dataInicio: string // ISO, a mais comum entre as linhas — usada como id da semana
  dataFim: string
  /** placa (sem hífen) -> detalhe dia a dia, vindo da aba própria de cada veículo. */
  detalhePorPlaca: Map<string, DiaRotaDetalhe[]>
}

/** "805,881" (formato BR, milhar com ponto/decimal com vírgula) -> 805.881 */
function numeroBR(v: unknown): number {
  const s = String(v ?? '').replace(/km/i, '').trim()
  if (!s || s === '-') return 0
  return Number(s.replace(/\./g, '').replace(',', '.')) || 0
}

function texto(v: unknown): string {
  const s = String(v ?? '').trim()
  return s === '-' ? '' : s
}

const REGEX_PLACA = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/

/** Lê a aba própria de um veículo (nome = placa) com o detalhe dia a dia. */
function parseAbaVeiculo(wb: XLSX.WorkBook, nomeAba: string): DiaRotaDetalhe[] {
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nomeAba], { header: 1, defval: '' })
  const idxHeader = linhas.findIndex((r) => String(r[0]).trim() === 'Dia')
  if (idxHeader === -1) return []
  const header = linhas[idxHeader].map((c) => String(c).trim())
  const col = (nome: string) => header.findIndex((c) => c === nome)
  const iOdometro = col('Odometro')
  const iKm = col('Km Percorrido')
  const iParadas = col('Paradas')
  const iVelMedia = col('Velocidade Média')
  const iVelMaxima = col('Velocidade Máxima')
  const iHoraSaida = col('Hora Saída')
  const iHoraChegada = col('Hora Chegada')
  const iTempoTrabalho = col('Tempo de Trabalho')
  const iTempoDentroCerca = col('Tempo Dentro Cerca')
  const iTempoAcimaVel = col('Tempo Acima Velocidade')
  const iTempoMovimento = col('Tempo Movimento')
  const iTempoParado = col('Tempo Parado')

  const dias: DiaRotaDetalhe[] = []
  for (let i = idxHeader + 1; i < linhas.length; i++) {
    const row = linhas[i]
    const c0 = String(row[0] ?? '').trim()
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(c0)) continue // pula linha "Total:" e vazias
    dias.push({
      data: dataBRparaISO(c0),
      odometro: numeroBR(row[iOdometro]),
      kmPercorrido: numeroBR(row[iKm]),
      paradas: Number(texto(row[iParadas])) || 0,
      velMedia: texto(row[iVelMedia]),
      velMaxima: texto(row[iVelMaxima]),
      horaSaida: texto(row[iHoraSaida]),
      horaChegada: texto(row[iHoraChegada]),
      tempoTrabalho: texto(row[iTempoTrabalho]),
      tempoDentroCerca: texto(row[iTempoDentroCerca]),
      tempoAcimaVel: texto(row[iTempoAcimaVel]),
      tempoMovimento: texto(row[iTempoMovimento]),
      tempoParado: texto(row[iTempoParado]),
    })
  }
  return dias
}

/**
 * Lê o relatório de Rota exportado do rastreador: a aba "RESUMO" traz o km total do período por
 * placa (usada pro cálculo do reembolso), e cada veículo tem sua própria aba (nome = placa) com o
 * detalhe dia a dia (odômetro, paradas, velocidades, horários, tempos) — layout confirmado em
 * set/2026.
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

  const detalhePorPlaca = new Map<string, DiaRotaDetalhe[]>()
  for (const nome of wb.SheetNames) {
    const placaAba = nome.trim().replace(/\s+/g, '').toUpperCase()
    if (nome.trim().toUpperCase() === 'RESUMO' || nome.trim() === 'Document map' || !REGEX_PLACA.test(placaAba)) continue
    const dias = parseAbaVeiculo(wb, nome)
    if (dias.length > 0) detalhePorPlaca.set(placaAba, dias)
  }

  return { linhas, dataInicio, dataFim, detalhePorPlaca }
}
