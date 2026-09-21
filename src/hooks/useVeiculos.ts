import { useEffect, useState } from 'react'
import veiculosSeed from '../data/veiculosSeed.json'
import type { Mudanca } from '../lib/diffCadastro'
import { gravarDoc, gravarLote, observarColecao, removerDoc } from '../lib/store'
import type { ComId, HistoricoVeiculo, Veiculo } from '../types/models'

const PATH = 'veiculos'
const PATH_HIST = 'veiculos_historico'

export function useVeiculos() {
  const [veiculos, setVeiculos] = useState<ComId<Veiculo>[] | null>(null)
  const [historico, setHistorico] = useState<ComId<HistoricoVeiculo>[]>([])

  useEffect(() => observarColecao<Veiculo>(PATH, (itens) => setVeiculos(itens)), [])
  useEffect(
    () => observarColecao<HistoricoVeiculo>(PATH_HIST, (r) => setHistorico(r.slice().sort((a, b) => b.data.localeCompare(a.data)))),
    [],
  )

  async function semear() {
    const lote: Record<string, Veiculo> = {}
    for (const v of veiculosSeed as Veiculo[]) lote[v.placa] = v
    await gravarLote(PATH, lote)
  }

  async function salvar(veiculo: Veiculo) {
    await gravarDoc(PATH, veiculo.placa, veiculo)
  }

  async function remover(placa: string) {
    await removerDoc(PATH, placa)
  }

  /** Aplica as mudanças escolhidas na importação da Base de Placas e registra cada uma no
   * histórico. Lançamentos de semanas anteriores não são tocados — guardam o condutor da época. */
  async function aplicarMudancas(mudancas: Mudanca[]) {
    const agora = new Date().toISOString()
    for (const m of mudancas) {
      // "id" vem do doc lido do banco; não deve voltar como campo do documento.
      const { id: _id, ...antes } = (m.antes ?? {}) as Partial<ComId<Veiculo>>
      if (m.tipo === 'saiu' && m.antes) {
        await gravarDoc(PATH, m.placa, { ...antes, ativo: false })
      } else if (m.depois) {
        await gravarDoc(PATH, m.placa, { ...antes, ...m.depois, ativo: true })
      }
      await gravarDoc<HistoricoVeiculo>(PATH_HIST, `${m.placa}_${agora}`, {
        placa: m.placa,
        tipo: m.tipo,
        gerenteAntes: m.antes?.gerente ?? null,
        gerenteDepois: m.tipo === 'saiu' ? null : (m.depois?.gerente ?? null),
        data: agora,
      })
    }
  }

  return {
    veiculos: veiculos ?? [],
    historico,
    carregando: veiculos === null,
    precisaSemear: veiculos !== null && veiculos.length === 0,
    semear,
    salvar,
    remover,
    aplicarMudancas,
  }
}
