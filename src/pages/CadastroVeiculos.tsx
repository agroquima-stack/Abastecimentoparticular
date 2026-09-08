import { useState } from 'react'
import { useVeiculos } from '../hooks/useVeiculos'
import type { Veiculo } from '../types/models'

const VAZIO: Veiculo = { placa: '', gerente: '', filial: '', modelo: '', tipo: '', ativo: true }

export function CadastroVeiculos() {
  const { veiculos, carregando, precisaSemear, semear, salvar, remover } = useVeiculos()
  const [editando, setEditando] = useState<Veiculo | null>(null)
  const [semeando, setSemeando] = useState(false)

  async function onSemear() {
    setSemeando(true)
    try {
      await semear()
    } finally {
      setSemeando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-base-50">Cadastro de gerentes / camionetes</h1>
          <p className="text-sm text-base-400">{veiculos.length} veículo(s) cadastrado(s).</p>
        </div>
        <button
          onClick={() => setEditando(VAZIO)}
          className="rounded-lg border border-brand-500/40 bg-brand-700/20 px-4 py-2 text-sm font-medium text-brand-200 hover:bg-brand-700/30"
        >
          + Novo veículo
        </button>
      </div>

      {precisaSemear && !carregando && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-600/40 bg-brand-700/10 px-4 py-3 text-sm text-brand-200">
          <span>Cadastro vazio. Carregar a lista inicial de 39 gerentes/camionetes extraída da Base de Placas?</span>
          <button
            onClick={onSemear}
            disabled={semeando}
            className="rounded-md border border-brand-500/40 bg-brand-700/20 px-3 py-1.5 text-xs font-medium hover:bg-brand-700/30 disabled:opacity-60"
          >
            {semeando ? 'Carregando…' : 'Carregar lista inicial'}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-base-800/60 bg-base-900/60">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-base-800 text-left text-xs uppercase tracking-wide text-base-500">
              <th className="px-3 py-2">Gerente</th>
              <th className="px-3 py-2">Placa</th>
              <th className="px-3 py-2">Filial</th>
              <th className="px-3 py-2">Modelo</th>
              <th className="px-3 py-2 text-center">Ativo</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {veiculos
              .slice()
              .sort((a, b) => a.gerente.localeCompare(b.gerente))
              .map((v) => (
                <tr key={v.placa} className={`border-b border-base-800/60 last:border-0 ${!v.ativo ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-1.5">{v.gerente}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{v.placa}</td>
                  <td className="px-3 py-1.5">{v.filial}</td>
                  <td className="px-3 py-1.5">{v.modelo}</td>
                  <td className="px-3 py-1.5 text-center">{v.ativo ? '✓' : '—'}</td>
                  <td className="px-3 py-1.5 text-right">
                    <button onClick={() => setEditando(v)} className="mr-2 text-xs text-brand-300 hover:underline">
                      editar
                    </button>
                    <button
                      onClick={() => confirm(`Remover ${v.gerente} (${v.placa})?`) && remover(v.placa)}
                      className="text-xs text-crit-400 hover:underline"
                    >
                      remover
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <ModalVeiculo
          veiculo={editando}
          onCancelar={() => setEditando(null)}
          onSalvar={async (v) => {
            await salvar(v)
            setEditando(null)
          }}
        />
      )}
    </div>
  )
}

function ModalVeiculo({
  veiculo,
  onSalvar,
  onCancelar,
}: {
  veiculo: Veiculo
  onSalvar: (v: Veiculo) => void
  onCancelar: () => void
}) {
  const [form, setForm] = useState(veiculo)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-base-700 bg-base-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-base-100">{veiculo.placa ? 'Editar veículo' : 'Novo veículo'}</h2>
        <div className="flex flex-col gap-3">
          <Campo label="Placa (ABC1D23)">
            <input
              value={form.placa}
              disabled={!!veiculo.placa}
              onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase().replace(/\s+/g, '') })}
              className="w-full rounded-md border border-base-700 bg-base-900 px-2 py-1.5 text-sm outline-none focus:border-brand-400 disabled:opacity-50"
            />
          </Campo>
          <Campo label="Gerente">
            <input value={form.gerente} onChange={(e) => setForm({ ...form, gerente: e.target.value })} className="w-full rounded-md border border-base-700 bg-base-900 px-2 py-1.5 text-sm outline-none focus:border-brand-400" />
          </Campo>
          <Campo label="Filial (sigla)">
            <input value={form.filial} onChange={(e) => setForm({ ...form, filial: e.target.value.toUpperCase() })} className="w-full rounded-md border border-base-700 bg-base-900 px-2 py-1.5 text-sm outline-none focus:border-brand-400" />
          </Campo>
          <Campo label="Modelo">
            <input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className="w-full rounded-md border border-base-700 bg-base-900 px-2 py-1.5 text-sm outline-none focus:border-brand-400" />
          </Campo>
          <label className="flex items-center gap-2 text-sm text-base-300">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
            Ativo (entra nas próximas importações)
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancelar} className="rounded-md border border-base-700 px-3 py-1.5 text-sm text-base-300 hover:bg-base-800">
            Cancelar
          </button>
          <button
            onClick={() => form.placa && form.gerente && onSalvar(form)}
            className="rounded-md border border-brand-500/40 bg-brand-700/20 px-3 py-1.5 text-sm font-medium text-brand-200 hover:bg-brand-700/30"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-base-400">
      {label}
      {children}
    </label>
  )
}
