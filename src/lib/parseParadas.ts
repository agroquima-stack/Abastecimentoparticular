import * as XLSX from 'xlsx'
import { dataBRparaISO } from './format'

export interface LocalComTempo {
  nome: string
  minutos: number
}

export interface ParadaDia {
  data: string // ISO
  /** locais visitados no dia, com o tempo total parado em cada um, ordenado do maior pro menor. */
  locais: LocalComTempo[]
}

/** placa (sem hífen/espaço) -> lista de dias com locais visitados naquele dia */
export type ParadasPorVeiculo = Map<string, ParadaDia[]>

const REGEX_PLACA = /([A-Z]{3}-?\d[A-Z]\d{2}|[A-Z]{3}-?\d{4})/

/** "00:07" ou "1:43" -> minutos. "-" ou vazio -> 0. */
function tempoParaMinutos(v: unknown): number {
  const s = String(v ?? '').trim()
  if (!s || s === '-') return 0
  const partes = s.split(':').map(Number)
  if (partes.some(Number.isNaN)) return 0
  if (partes.length === 2) return partes[0] * 60 + partes[1]
  if (partes.length === 3) return partes[0] * 60 * 24 + partes[1] * 60 + partes[2]
  return 0
}

function tituloCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ')
}

interface LocalExtraido {
  /** chave normalizada (minúsculo, sem UF) — usada só pra somar tempo do mesmo local vindo de
   * endereços com capitalização/UF diferentes (ex.: "Araguaína -" e "ARAGUAÍNA - TO"). */
  chave: string
  label: string
}

/**
 * "Rua X, 0, Bairro Y - Araguaína - TO" -> "Araguaína - TO"
 * "Rua X, 0,  - Marabá - " -> "Marabá"
 * Nomes de ponto cadastrado (sem " - ", ex.: "BOI FORTE AGROPECUARIA LTDA") voltam como estão —
 * são o próprio local da parada, só não têm cidade explícita no texto.
 */
function extrairLocal(texto: string): LocalExtraido | null {
  // Remove um "-" solto sobrando no fim (endereço sem UF: "... - Araguaína -") antes de dividir,
  // sem mexer em hifens colados a uma palavra (ex.: "Avenida T-9").
  const t = texto.trim().replace(/\s-\s*$/, '')
  if (!t || t === '-') return null
  if (!t.includes(' - ')) return { chave: t.toLowerCase(), label: t }
  const partes = t.split(' - ').map((p) => p.trim()).filter(Boolean)
  if (partes.length === 0) return null
  const ultima = partes[partes.length - 1]
  if (/^[A-ZÀ-Ú]{2}$/.test(ultima) && partes.length >= 2) {
    const cidade = partes[partes.length - 2]
    if (!cidade) return { chave: ultima.toLowerCase(), label: ultima }
    return { chave: cidade.toLowerCase(), label: `${tituloCase(cidade)} - ${ultima}` }
  }
  return ultima ? { chave: ultima.toLowerCase(), label: tituloCase(ultima) } : null
}

/**
 * Lê a aba "Paradas" do relatório exportado do rastreador: um bloco de texto por veículo, com
 * sub-blocos "Dia: DD/MM/YYYY" e uma tabela de paradas por baixo (coluna "Nome" traz endereço ou
 * nome do ponto/cliente cadastrado, "Tempo Parada" traz a duração daquela parada). Layout
 * confirmado em set/2026.
 */
export async function parseParadasXls(arquivo: File): Promise<ParadasPorVeiculo> {
  const buffer = await arquivo.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const nomeAba = wb.SheetNames.find((n) => n.trim().toUpperCase() === 'PARADAS')
  if (!nomeAba) throw new Error('Aba "Paradas" não encontrada no arquivo. Confira se é o relatório de Paradas exportado do rastreador.')

  const linhas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nomeAba], { header: 1, defval: '' })
  const resultado: ParadasPorVeiculo = new Map()

  let placaAtual: string | null = null
  let diaAtual: ParadaDia | null = null
  let temposPorLocal: Map<string, { label: string; minutos: number }> | null = null
  let iNome = 7
  let iTempoParada = 3

  function fecharDia() {
    if (diaAtual && temposPorLocal) {
      diaAtual.locais = [...temposPorLocal.values()]
        .map(({ label, minutos }) => ({ nome: label, minutos }))
        .sort((a, b) => b.minutos - a.minutos)
    }
  }

  for (const row of linhas) {
    const c0 = String(row[0] ?? '').trim()
    if (!c0) continue

    if (c0.includes('Motorista')) {
      fecharDia()
      const m = c0.match(REGEX_PLACA)
      if (m) {
        placaAtual = m[0].replace(/-/g, '').toUpperCase()
        diaAtual = null
      }
      continue
    }

    if (c0.startsWith('Dia:')) {
      fecharDia()
      const m = c0.match(/Dia:\s*(\d{2}\/\d{2}\/\d{4})/)
      if (m && placaAtual) {
        diaAtual = { data: dataBRparaISO(m[1]), locais: [] }
        temposPorLocal = new Map()
        if (!resultado.has(placaAtual)) resultado.set(placaAtual, [])
        resultado.get(placaAtual)!.push(diaAtual)
      }
      continue
    }

    if (c0 === 'Nº') {
      const idxNome = row.findIndex((v) => String(v).trim() === 'Nome')
      const idxTempo = row.findIndex((v) => String(v).trim() === 'Tempo Parada')
      if (idxNome !== -1) iNome = idxNome
      if (idxTempo !== -1) iTempoParada = idxTempo
      continue
    }

    if (/^\d+°$/.test(c0) && diaAtual && temposPorLocal) {
      const local = extrairLocal(String(row[iNome] ?? ''))
      if (local) {
        const minutos = tempoParaMinutos(row[iTempoParada])
        const existente = temposPorLocal.get(local.chave)
        // Prefere o rótulo com UF (mais informativo) quando aparecer em alguma das paradas do dia.
        const label = existente && existente.label.includes(' - ') ? existente.label : local.label
        temposPorLocal.set(local.chave, { label, minutos: (existente?.minutos ?? 0) + minutos })
      }
    }
  }
  fecharDia()

  return resultado
}
