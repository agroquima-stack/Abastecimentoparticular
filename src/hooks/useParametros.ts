import { useEffect, useState } from 'react'
import { gravarDoc, observarColecao } from '../lib/store'
import type { ComId, Parametros, ParametroHistorico } from '../types/models'

const PATH = 'parametros'
const PATH_HIST = 'parametros_historico'
const ID_ATUAL = 'atual'

const PADRAO: Parametros = { precoDiesel: 0, kmLExigido: 10, atualizadoEm: '' }

export function useParametros() {
  const [itens, setItens] = useState<ComId<Parametros>[] | null>(null)
  const [historico, setHistorico] = useState<ComId<ParametroHistorico>[]>([])

  useEffect(() => observarColecao<Parametros>(PATH, (r) => setItens(r)), [])
  useEffect(
    () =>
      observarColecao<ParametroHistorico>(PATH_HIST, (r) =>
        setHistorico(r.slice().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))),
      ),
    [],
  )

  const atual = itens?.find((i) => i.id === ID_ATUAL) ?? { id: ID_ATUAL, ...PADRAO }

  async function atualizar(precoDiesel: number, kmLExigido: number) {
    const agora = new Date().toISOString()
    await gravarDoc(PATH, ID_ATUAL, { precoDiesel, kmLExigido, atualizadoEm: agora })
    await gravarDoc(PATH_HIST, agora, { precoDiesel, kmLExigido, criadoEm: agora })
  }

  return { parametros: atual, historico, carregando: itens === null, atualizar }
}
