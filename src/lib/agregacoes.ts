import type { ComId, DiaResumo, Lancamento, LocalComTempo, Semana } from '../types/models'

/** Junta os locais dos dois dias do fim de semana num só ranking por tempo parado — soma o
 * mesmo local citado nos dois dias (normalizando maiúsculas/UF pra não duplicar). */
export function mesclarLocaisDoFimDeSemana(dias: DiaResumo[] | undefined): LocalComTempo[] {
  const porChave = new Map<string, LocalComTempo>()
  for (const dia of dias ?? []) {
    for (const l of dia.locais) {
      const chave = l.nome.toLowerCase().replace(/ - [a-zà-ú]{2}$/i, '')
      const existente = porChave.get(chave)
      const nome = existente && existente.nome.includes(' - ') ? existente.nome : l.nome
      porChave.set(chave, { nome, minutos: (existente?.minutos ?? 0) + l.minutos })
    }
  }
  return [...porChave.values()].sort((a, b) => b.minutos - a.minutos)
}

export interface LinhaContaCorrente {
  gerente: string
  placa: string // placa mais recente usada por ele
  placas: string[] // todas as placas já usadas (troca de veículo não perde histórico)
  filial: string
  totalKm: number
  kmParticular: number // totalKm excluindo semanas marcadas "uso empresa"
  totalDevido: number
  totalPago: number
  saldo: number // devido - pago: positivo = empresa ainda deve ao gerente
  semanasComUso: number
  semanasNaoRespondeu: number
  prejuizoNaoRespondeu: number // valor devido (ainda não pago) travado em semanas marcadas "não respondeu"
}

/**
 * Agrega todos os lançamentos (de todas as semanas carregadas) por GERENTE — não por placa — é a
 * "conta corrente": quanto já foi calculado como devido vs. quanto já foi efetivamente pago a
 * ele. Agrupar por gerente (não por placa) é o que garante que o histórico continua junto mesmo
 * quando ele troca de camionete — percorre as semanas em ordem cronológica pra manter sempre a
 * placa/filial mais recente na linha.
 */
export function agregarPorGerente(semanas: ComId<Semana>[], porSemana: Record<string, ComId<Lancamento>[]>): LinhaContaCorrente[] {
  const semanasOrdenadas = semanas.slice().sort((a, b) => a.id.localeCompare(b.id))
  const mapa = new Map<string, LinhaContaCorrente & { placasSet: Set<string> }>()
  for (const s of semanasOrdenadas) {
    for (const l of porSemana[s.id] ?? []) {
      const linha = mapa.get(l.gerente) ?? {
        gerente: l.gerente,
        placa: l.placa,
        placas: [],
        placasSet: new Set<string>(),
        filial: l.filial,
        totalKm: 0,
        kmParticular: 0,
        totalDevido: 0,
        totalPago: 0,
        saldo: 0,
        semanasComUso: 0,
        semanasNaoRespondeu: 0,
        prejuizoNaoRespondeu: 0,
      }
      linha.placa = l.placa
      linha.filial = l.filial
      linha.placasSet.add(l.placa)
      linha.totalKm += l.kmRodado || 0
      if (!l.usoEmpresa) linha.kmParticular += l.kmRodado || 0
      linha.totalDevido += l.valorDevidoCalc || 0
      linha.totalPago += l.valorPago || 0
      if (!l.usoEmpresa && l.kmRodado > 0) linha.semanasComUso += 1
      if (l.naoRespondeu) {
        linha.semanasNaoRespondeu += 1
        linha.prejuizoNaoRespondeu += Math.max((l.valorDevidoCalc || 0) - (l.valorPago || 0), 0)
      }
      mapa.set(l.gerente, linha)
    }
  }
  const linhas = [...mapa.values()].map(({ placasSet, ...l }) => ({ ...l, placas: [...placasSet].sort() }))
  for (const l of linhas) l.saldo = Math.round((l.totalDevido - l.totalPago) * 100) / 100
  return linhas.sort((a, b) => b.saldo - a.saldo)
}

/** true quando existe algum km/registro real pra esse lançamento (sábado ou domingo) — usado pra
 * jogar quem não tem nenhum dado pro fim da lista, em vez de misturar com quem respondeu. */
export function temDadosNoFimDeSemana(l: Lancamento): boolean {
  if (l.kmRodado > 0) return true
  return (l.dias ?? []).some((d) => d.kmPercorrido > 0)
}

export interface PontoSemana {
  semanaId: string
  label: string
  totalKm: number
  totalDevido: number
  totalPago: number
}

export function agregarPorSemana(semanas: ComId<Semana>[], porSemana: Record<string, ComId<Lancamento>[]>): PontoSemana[] {
  return semanas
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => {
      const lancamentos = porSemana[s.id] ?? []
      return {
        semanaId: s.id,
        label: s.dataInicio.slice(5).split('-').reverse().join('/'),
        totalKm: lancamentos.reduce((acc, l) => acc + (l.kmRodado || 0), 0),
        totalDevido: lancamentos.reduce((acc, l) => acc + (l.valorDevidoCalc || 0), 0),
        totalPago: lancamentos.reduce((acc, l) => acc + (l.valorPago || 0), 0),
      }
    })
}
