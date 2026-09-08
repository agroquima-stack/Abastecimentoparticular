import { useEffect, useState } from 'react'
import veiculosSeed from '../data/veiculosSeed.json'
import { gravarDoc, gravarLote, observarColecao, removerDoc } from '../lib/store'
import type { ComId, Veiculo } from '../types/models'

const PATH = 'veiculos'

export function useVeiculos() {
  const [veiculos, setVeiculos] = useState<ComId<Veiculo>[] | null>(null)

  useEffect(() => observarColecao<Veiculo>(PATH, (itens) => setVeiculos(itens)), [])

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

  return {
    veiculos: veiculos ?? [],
    carregando: veiculos === null,
    precisaSemear: veiculos !== null && veiculos.length === 0,
    semear,
    salvar,
    remover,
  }
}
