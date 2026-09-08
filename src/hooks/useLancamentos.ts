import { useEffect, useState } from 'react'
import { calcularValorDevido } from '../lib/calculo'
import type { ParadasPorVeiculo } from '../lib/parseParadas'
import { atualizarDoc, observarColecao } from '../lib/store'
import type { ComId, Lancamento } from '../types/models'

export function useLancamentos(semanaId: string | null) {
  const [lancamentos, setLancamentos] = useState<ComId<Lancamento>[] | null>(null)

  useEffect(() => {
    if (!semanaId) {
      setLancamentos(null)
      return
    }
    return observarColecao<Lancamento>(`semanas/${semanaId}/lancamentos`, (r) =>
      setLancamentos(r.slice().sort((a, b) => a.gerente.localeCompare(b.gerente))),
    )
  }, [semanaId])

  async function salvarLancamento(
    semanaIdAlvo: string,
    placa: string,
    patch: Partial<Lancamento>,
    kmLExigido: number,
    precoDiesel: number,
    atual: Lancamento,
  ) {
    const mesclado = { ...atual, ...patch }
    const valorDevidoCalc = calcularValorDevido(mesclado.kmRodado, mesclado.usoEmpresa, kmLExigido, precoDiesel)
    await atualizarDoc(`semanas/${semanaIdAlvo}/lancamentos`, placa, { ...patch, valorDevidoCalc })
  }

  /** Mescla os locais (cidades/pontos) extraídos do relatório de Paradas nos lançamentos já
   * existentes da semana, casando por placa — não mexe em km/valores. */
  async function mesclarParadas(semanaIdAlvo: string, paradas: ParadasPorVeiculo, atuais: ComId<Lancamento>[]) {
    await Promise.all(
      atuais
        .filter((l) => paradas.has(l.placa))
        .map((l) => atualizarDoc(`semanas/${semanaIdAlvo}/lancamentos`, l.placa, { locaisPorDia: paradas.get(l.placa) })),
    )
  }

  return { lancamentos: lancamentos ?? [], carregando: lancamentos === null, salvarLancamento, mesclarParadas }
}

/** Todas as semanas x lançamentos, usado no dashboard e na conta corrente (poucas linhas, tudo em memória). */
export function useTodosLancamentos(semanaIds: string[]) {
  const [porSemana, setPorSemana] = useState<Record<string, ComId<Lancamento>[]>>({})

  useEffect(() => {
    const unsubs = semanaIds.map((id) =>
      observarColecao<Lancamento>(`semanas/${id}/lancamentos`, (itens) =>
        setPorSemana((prev) => ({ ...prev, [id]: itens })),
      ),
    )
    return () => unsubs.forEach((u) => u())
  }, [semanaIds.join(',')])

  return porSemana
}
