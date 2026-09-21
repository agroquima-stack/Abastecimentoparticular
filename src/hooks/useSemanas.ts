import { useEffect, useState } from 'react'
import { calcularValorDevido, kmEfetivo } from '../lib/calculo'
import type { ParadasPorVeiculo } from '../lib/parseParadas'
import type { ResultadoParseRota } from '../lib/parseRota'
import { atualizarDoc, gravarDoc, gravarLote, observarColecao, removerColecao, removerDoc } from '../lib/store'
import type { ComId, DiaResumo, Lancamento, Semana, Veiculo } from '../types/models'

const PATH = 'semanas'

/** Junta o detalhe dia a dia do Rota (odômetro, velocidades, horários) com os locais do
 * relatório de Paradas do mesmo veículo, casando por data. Qualquer um dos dois pode faltar. */
function montarDias(placa: string, resultado: ResultadoParseRota, paradas?: ParadasPorVeiculo): DiaResumo[] | undefined {
  const detalhe = resultado.detalhePorPlaca.get(placa)
  const paradasDias = paradas?.get(placa)
  if (!detalhe && !paradasDias) return undefined
  const datas = new Set([...(detalhe?.map((d) => d.data) ?? []), ...(paradasDias?.map((d) => d.data) ?? [])])
  return [...datas].sort().map((data) => {
    const d = detalhe?.find((x) => x.data === data)
    const p = paradasDias?.find((x) => x.data === data)
    return {
      data,
      odometro: d?.odometro,
      kmPercorrido: d?.kmPercorrido ?? 0,
      paradas: d?.paradas,
      velMedia: d?.velMedia,
      velMaxima: d?.velMaxima,
      horaSaida: d?.horaSaida,
      horaChegada: d?.horaChegada,
      tempoTrabalho: d?.tempoTrabalho,
      tempoDentroCerca: d?.tempoDentroCerca,
      tempoAcimaVel: d?.tempoAcimaVel,
      tempoMovimento: d?.tempoMovimento,
      tempoParado: d?.tempoParado,
      locais: p?.locais ?? [],
    }
  })
}

export function useSemanas() {
  const [semanas, setSemanas] = useState<ComId<Semana>[] | null>(null)

  useEffect(() => observarColecao<Semana>(PATH, (r) => setSemanas(r.slice().sort((a, b) => b.id.localeCompare(a.id)))), [])

  /**
   * Cria (ou substitui) a semana a partir do relatório de Rota: um lançamento por veículo
   * cadastrado, com o km do período já calculado e valor devido calculado com os parâmetros
   * vigentes no momento da importação (fica "congelado" na semana, não muda se o preço do
   * diesel mudar depois — histórico não pode ser retroativamente alterado).
   */
  async function importarDeRota(
    resultado: ResultadoParseRota,
    veiculos: ComId<Veiculo>[],
    precoDiesel: number,
    kmLExigido: number,
    nomeArquivo: string,
    existentes: Record<string, ComId<Lancamento>> = {},
    paradas?: ParadasPorVeiculo,
  ) {
    const semanaId = resultado.dataInicio
    const porPlaca = new Map(resultado.linhas.map((l) => [l.placa, l]))

    const lote: Record<string, Lancamento> = {}
    for (const v of veiculos) {
      if (!v.ativo) continue
      const linha = porPlaca.get(v.placa)
      const kmRodado = linha?.kmPercorrido ?? 0
      const existente = existentes[v.placa]
      const usoEmpresa = existente?.usoEmpresa ?? false
      const diasUsoEmpresa = existente?.diasUsoEmpresa
      const dias = montarDias(v.placa, resultado, paradas) ?? existente?.dias
      const kmParaCalculo = kmEfetivo({ kmRodado, usoEmpresa, diasUsoEmpresa, dias })
      lote[v.placa] = {
        placa: v.placa,
        // Semana já importada mantém o condutor/filial da época (reimportar depois de uma troca de
        // condutor no cadastro não pode reescrever o histórico).
        gerente: existente?.gerente ?? v.gerente,
        filial: existente?.filial ?? v.filial,
        kmRodado,
        usoEmpresa,
        diasUsoEmpresa,
        naoRespondeu: existente?.naoRespondeu ?? false,
        valorPago: existente?.valorPago ?? null,
        dataPagamento: existente?.dataPagamento ?? null,
        observacao: existente?.observacao ?? '',
        valorDevidoCalc: calcularValorDevido(kmParaCalculo, kmLExigido, precoDiesel),
        dias,
      }
    }

    await gravarDoc(PATH, semanaId, {
      dataInicio: resultado.dataInicio,
      dataFim: resultado.dataFim,
      precoDieselUsado: precoDiesel,
      kmLExigidoUsado: kmLExigido,
      importadoEm: new Date().toISOString(),
      origemArquivo: nomeArquivo,
    } satisfies Semana)
    await gravarLote(`${PATH}/${semanaId}/lancamentos`, lote)
    return semanaId
  }

  async function atualizarParametrosDaSemana(semanaId: string, patch: Partial<Semana>) {
    await atualizarDoc(PATH, semanaId, patch)
  }

  /** Apaga a semana e todos os lançamentos dela (irreversível). */
  async function excluirSemana(semanaId: string) {
    await removerColecao(`${PATH}/${semanaId}/lancamentos`)
    await removerDoc(PATH, semanaId)
  }

  return { semanas: semanas ?? [], carregando: semanas === null, importarDeRota, atualizarParametrosDaSemana, excluirSemana }
}
