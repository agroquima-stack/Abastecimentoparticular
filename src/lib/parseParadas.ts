import * as XLSX from 'xlsx'
import { dataBRparaISO } from './format'

export interface ParadaDia {
  data: string // ISO
  locais: string[] // locais visitados no dia, deduplicados, na ordem da primeira parada
}

/** placa (sem hífen/espaço) -> lista de dias com locais visitados naquele dia */
export type ParadasPorVeiculo = Map<string, ParadaDia[]>

const REGEX_PLACA = /([A-Z]{3}-?\d[A-Z]\d{2}|[A-Z]{3}-?\d{4})/

/**
 * "Rua X, 0, Bairro Y - Araguaína - TO" -> "Araguaína - TO"
 * "Rua X, 0,  - Marabá - " -> "Marabá"
 * Nomes de ponto cadastrado (sem " - ", ex.: "BOI FORTE AGROPECUARIA LTDA") voltam como estão —
 * são o próprio local da parada, só não têm cidade explícita no texto.
 */
function extrairLocal(texto: string): string | null {
  // Remove um "-" solto sobrando no fim (endereço sem UF: "... - Araguaína -") antes de dividir,
  // sem mexer em hifens colados a uma palavra (ex.: "Avenida T-9").
  const t = texto.trim().replace(/\s-\s*$/, '')
  if (!t || t === '-') return null
  if (!t.includes(' - ')) return t
  const partes = t.split(' - ').map((p) => p.trim()).filter(Boolean)
  if (partes.length === 0) return null
  const ultima = partes[partes.length - 1]
  if (/^[A-ZÀ-Ú]{2}$/.test(ultima) && partes.length >= 2) {
    const cidade = partes[partes.length - 2]
    return cidade ? `${cidade} - ${ultima}` : ultima
  }
  return ultima || null
}

/**
 * Lê a aba "Paradas" do relatório exportado do rastreador: um bloco de texto por veículo, com
 * sub-blocos "Dia: DD/MM/YYYY" e uma tabela de paradas por baixo (coluna "Nome" traz endereço ou
 * nome do ponto/cliente cadastrado). Layout confirmado em set/2026.
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
  let iNome = 7

  for (const row of linhas) {
    const c0 = String(row[0] ?? '').trim()
    if (!c0) continue

    if (c0.includes('Motorista')) {
      const m = c0.match(REGEX_PLACA)
      if (m) {
        placaAtual = m[0].replace(/-/g, '').toUpperCase()
        diaAtual = null
      }
      continue
    }

    if (c0.startsWith('Dia:')) {
      const m = c0.match(/Dia:\s*(\d{2}\/\d{2}\/\d{4})/)
      if (m && placaAtual) {
        diaAtual = { data: dataBRparaISO(m[1]), locais: [] }
        if (!resultado.has(placaAtual)) resultado.set(placaAtual, [])
        resultado.get(placaAtual)!.push(diaAtual)
      }
      continue
    }

    if (c0 === 'Nº') {
      const idx = row.findIndex((v) => String(v).trim() === 'Nome')
      if (idx !== -1) iNome = idx
      continue
    }

    if (/^\d+°$/.test(c0) && diaAtual) {
      const local = extrairLocal(String(row[iNome] ?? ''))
      if (local && !diaAtual.locais.includes(local)) diaAtual.locais.push(local)
    }
  }

  return resultado
}
