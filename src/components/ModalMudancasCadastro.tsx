import { useState } from 'react'
import type { Mudanca, TipoMudanca } from '../lib/diffCadastro'

export const ROTULO_TIPO: Record<TipoMudanca, string> = {
  troca: 'Troca de condutor',
  novo: 'Novo / reativado',
  dados: 'Dados atualizados',
  saiu: 'Sem condutor gerente na base',
}

interface Props {
  mudancas: Mudanca[]
  onAplicar: (escolhidas: Mudanca[]) => Promise<void>
  onCancelar: () => void
}

export function ModalMudancasCadastro({ mudancas, onAplicar, onCancelar }: Props) {
  // "saiu" (desativar) começa desmarcado: a placa sumir da base nem sempre significa que deve sair.
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set(mudancas.filter((m) => m.tipo !== 'saiu').map((m) => m.placa)))
  const [aplicando, setAplicando] = useState(false)
  const trocas = mudancas.filter((m) => m.tipo === 'troca').length

  function alternar(placa: string) {
    setMarcadas((atual) => {
      const novo = new Set(atual)
      if (novo.has(placa)) novo.delete(placa)
      else novo.add(placa)
      return novo
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-base-700 bg-base-900 p-5">
        <h2 className="text-sm font-semibold text-base-100">Base de Placas — diferenças encontradas</h2>
        {mudancas.length === 0 ? (
          <p className="mt-4 text-sm text-good-400">Nenhuma mudança: o cadastro já está igual à base.</p>
        ) : (
          <>
            {trocas > 0 && (
              <p className="mt-2 rounded-md border border-warn-600/40 bg-warn-bg px-3 py-2 text-sm text-warn-300">
                ⚠ {trocas} troca(s) de condutor detectada(s). Semanas já importadas continuam com o condutor da época; só as
                próximas importações usam o novo.
              </p>
            )}
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-base-800">
              <table className="w-full text-sm">
                <tbody>
                  {mudancas.map((m) => (
                    <tr key={m.placa} className="border-b border-base-800/60 last:border-0">
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={marcadas.has(m.placa)} onChange={() => alternar(m.placa)} />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{m.placa}</td>
                      <td className="px-3 py-2 text-xs text-base-500">{ROTULO_TIPO[m.tipo]}</td>
                      <td className="px-3 py-2">
                        {m.tipo === 'saiu' ? (
                          <span>
                            {m.antes?.gerente} <span className="text-base-500">(será desativada{m.motivo ? ' — ' + m.motivo : ''})</span>
                          </span>
                        ) : m.tipo === 'novo' ? (
                          <span>
                            {m.depois?.gerente}{' '}
                            <span className="text-base-500">
                              · {m.depois?.filial} · {m.depois?.modelo}
                            </span>
                            {m.motivo && <span className="ml-2 text-xs text-warn-300">({m.motivo})</span>}
                          </span>
                        ) : m.tipo === 'troca' ? (
                          <span>
                            <span className="text-base-400 line-through">{m.antes?.gerente}</span> → <b>{m.depois?.gerente}</b>
                            {m.motivo && <span className="ml-2 text-xs text-warn-300">({m.motivo})</span>}
                          </span>
                        ) : (
                          <span>
                            {m.depois?.gerente}{' '}
                            <span className="text-base-500">
                              · {m.antes?.filial}/{m.antes?.modelo} → {m.depois?.filial}/{m.depois?.modelo}
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancelar} className="rounded-md border border-base-700 px-3 py-1.5 text-sm text-base-300 hover:bg-base-800">
            {mudancas.length === 0 ? 'Fechar' : 'Cancelar'}
          </button>
          {mudancas.length > 0 && (
            <button
              disabled={aplicando || marcadas.size === 0}
              onClick={async () => {
                setAplicando(true)
                await onAplicar(mudancas.filter((m) => marcadas.has(m.placa)))
              }}
              className="rounded-md border border-brand-500/40 bg-brand-700/20 px-3 py-1.5 text-sm font-medium text-brand-200 hover:bg-brand-700/30 disabled:opacity-60"
            >
              {aplicando ? 'Aplicando…' : `Aplicar ${marcadas.size} mudança(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
