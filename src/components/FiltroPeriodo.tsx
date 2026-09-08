import { useState } from 'react'
import { formatDataBR } from '../lib/format'
import type { ComId, Semana } from '../types/models'

interface FiltroPeriodoProps {
  semanas: ComId<Semana>[]
  /** vazio = "todas as semanas" (sem filtro aplicado) */
  selecionadas: string[]
  onChange: (ids: string[]) => void
}

/** Filtro de período reutilizável (Dashboard, Conta corrente, Lançamentos): permite escolher uma
 * ou várias semanas importadas. Lista vazia sempre significa "todas". */
export function FiltroPeriodo({ semanas, selecionadas, onChange }: FiltroPeriodoProps) {
  const [aberto, setAberto] = useState(false)
  const ordenadas = semanas.slice().sort((a, b) => b.id.localeCompare(a.id))

  const label =
    selecionadas.length === 0
      ? 'Todas as semanas'
      : selecionadas.length === 1
        ? (() => {
            const s = semanas.find((x) => x.id === selecionadas[0])
            return s ? `${formatDataBR(s.dataInicio)} a ${formatDataBR(s.dataFim)}` : '1 semana'
          })()
        : `${selecionadas.length} semanas selecionadas`

  function alternar(id: string) {
    onChange(selecionadas.includes(id) ? selecionadas.filter((x) => x !== id) : [...selecionadas, id])
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAberto((a) => !a)}
        className="flex items-center gap-2 rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 hover:border-brand-400"
      >
        📅 {label} <span className="text-base-500">▾</span>
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-base-700 bg-base-900 p-3 shadow-xl">
            <div className="mb-2 flex flex-wrap gap-1.5 text-xs">
              <button onClick={() => onChange(ordenadas.slice(0, 1).map((s) => s.id))} className="rounded-md border border-base-700 px-2 py-1 hover:bg-base-800">
                Última semana
              </button>
              <button onClick={() => onChange(ordenadas.slice(0, 4).map((s) => s.id))} className="rounded-md border border-base-700 px-2 py-1 hover:bg-base-800">
                Últimas 4
              </button>
              <button onClick={() => onChange([])} className="rounded-md border border-base-700 px-2 py-1 hover:bg-base-800">
                Todas
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border border-base-800">
              {ordenadas.map((s) => (
                <label key={s.id} className="flex items-center gap-2 border-b border-base-800/60 px-2 py-1.5 text-sm last:border-0 hover:bg-base-850">
                  <input type="checkbox" checked={selecionadas.includes(s.id)} onChange={() => alternar(s.id)} />
                  {formatDataBR(s.dataInicio)} a {formatDataBR(s.dataFim)}
                </label>
              ))}
            </div>
            <button
              onClick={() => setAberto(false)}
              className="mt-2 w-full rounded-md border border-brand-500/40 bg-brand-700/20 px-3 py-1.5 text-xs font-medium text-brand-200 hover:bg-brand-700/30"
            >
              Aplicar
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** vazio = todas. Aplica o filtro em cima de uma lista de semanas já carregada. */
export function filtrarSemanas<T extends { id: string }>(semanas: T[], selecionadas: string[]): T[] {
  return selecionadas.length === 0 ? semanas : semanas.filter((s) => selecionadas.includes(s.id))
}
