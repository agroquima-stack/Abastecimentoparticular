import type { ComId, Lancamento, Semana } from '../types/models'

export interface LinhaContaCorrente {
  placa: string
  gerente: string
  filial: string
  totalKm: number
  totalDevido: number
  totalComprovante: number
  totalPago: number
  saldo: number // devido - pago: positivo = empresa ainda deve ao gerente
  semanasComUso: number
}

/** Agrega todos os lançamentos (de todas as semanas carregadas) por veículo/gerente — é a "conta
 * corrente": quanto já foi calculado como devido vs. quanto já foi efetivamente pago a ele. */
export function agregarPorGerente(porSemana: Record<string, ComId<Lancamento>[]>): LinhaContaCorrente[] {
  const mapa = new Map<string, LinhaContaCorrente>()
  for (const lancamentos of Object.values(porSemana)) {
    for (const l of lancamentos) {
      const linha = mapa.get(l.placa) ?? {
        placa: l.placa,
        gerente: l.gerente,
        filial: l.filial,
        totalKm: 0,
        totalDevido: 0,
        totalComprovante: 0,
        totalPago: 0,
        saldo: 0,
        semanasComUso: 0,
      }
      linha.totalKm += l.kmRodado || 0
      linha.totalDevido += l.valorDevidoCalc || 0
      linha.totalComprovante += l.valorComprovante || 0
      linha.totalPago += l.valorPago || 0
      if (!l.usoEmpresa && l.kmRodado > 0) linha.semanasComUso += 1
      mapa.set(l.placa, linha)
    }
  }
  const linhas = [...mapa.values()]
  for (const l of linhas) l.saldo = Math.round((l.totalDevido - l.totalPago) * 100) / 100
  return linhas.sort((a, b) => b.saldo - a.saldo)
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
