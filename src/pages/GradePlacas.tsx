import { useState } from 'react'
import { useVeiculos } from '../hooks/useVeiculos'
import { PlacaMercosul } from '../components/PlacaMercosul'
import { Logo } from '../components/Logo'

export function GradePlacas() {
  const { veiculos } = useVeiculos()
  const [busca, setBusca] = useState('')
  const ativos = veiculos
    .filter((v) => v.ativo)
    .filter((v) => (busca ? v.gerente.toLowerCase().includes(busca.toLowerCase()) || v.filial.toLowerCase().includes(busca.toLowerCase()) : true))
    .sort((a, b) => a.gerente.localeCompare(b.gerente))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-base-50">Grade de placas — envio semanal</h1>
          <p className="text-sm text-base-400">Imprima ou salve como PDF (Ctrl+P) e envie no grupo de gerentes.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Filtrar por gerente ou filial…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-brand-500/40 bg-brand-700/20 px-4 py-2 text-sm font-medium text-brand-200 hover:bg-brand-700/30"
          >
            Imprimir / salvar PDF
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 print:rounded-none print:p-2">
        <div className="mb-4 flex items-center justify-between border-b border-neutral-200 pb-3 print:mb-2">
          <Logo className="h-8" />
          <span className="text-xs font-medium text-neutral-500">
            Camionetes dos gerentes — atualizado {new Date().toLocaleDateString('pt-BR')}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-3">
          {ativos.map((v) => (
            <div key={v.placa} className="flex flex-col items-center gap-1.5 rounded-lg border border-neutral-200 p-3 print:break-inside-avoid">
              <PlacaMercosul placa={v.placa} className="w-full max-w-[220px]" />
              <span className="text-center text-sm font-semibold text-neutral-800">{v.gerente}</span>
              <span className="text-center text-xs text-neutral-500">
                {v.filial} · {v.modelo}
              </span>
            </div>
          ))}
        </div>
        {ativos.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">Nenhum veículo ativo encontrado.</p>}
      </div>
    </div>
  )
}
