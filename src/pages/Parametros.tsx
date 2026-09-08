import { useState } from 'react'
import { useParametros } from '../hooks/useParametros'
import { formatMoeda } from '../lib/format'

export function Parametros() {
  const { parametros, historico, atualizar } = useParametros()
  const [preco, setPreco] = useState(parametros.precoDiesel ? String(parametros.precoDiesel) : '')
  const [kmL, setKmL] = useState(String(parametros.kmLExigido))
  const [salvando, setSalvando] = useState(false)
  const [ok, setOk] = useState(false)

  async function onSalvar() {
    setSalvando(true)
    setOk(false)
    try {
      await atualizar(Number(preco) || 0, Number(kmL) || 10)
      setOk(true)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-base-50">Parâmetros do reembolso</h1>
        <p className="text-sm text-base-400">
          Fórmula usada: <b>valor devido = (km rodado ÷ km/l exigido) × preço do diesel</b>. Mudar aqui só afeta
          semanas importadas <i>depois</i> — semanas já importadas mantêm o valor calculado na época (histórico
          não é recalculado retroativamente).
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-base-800/60 bg-base-900/60 p-5">
        <label className="flex flex-col gap-1 text-sm text-base-300">
          Preço médio do diesel (R$/L) — atualize manualmente
          <input
            type="number"
            step="0.01"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            className="rounded-md border border-base-700 bg-base-900 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-base-300">
          Km/l exigido (consumo de referência da camionete)
          <input
            type="number"
            step="0.1"
            value={kmL}
            onChange={(e) => setKmL(e.target.value)}
            className="rounded-md border border-base-700 bg-base-900 px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <button
          onClick={onSalvar}
          disabled={salvando}
          className="mt-1 rounded-lg border border-brand-500/40 bg-brand-700/20 px-4 py-2.5 text-sm font-medium text-brand-200 hover:bg-brand-700/30 disabled:opacity-60"
        >
          {salvando ? 'Salvando…' : 'Salvar novo valor'}
        </button>
        {ok && <p className="text-xs text-good-400">Salvo. Válido para as próximas importações.</p>}
      </div>

      {historico.length > 0 && (
        <div className="rounded-xl border border-base-800/60 bg-base-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-base-200">Histórico de alterações</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-800 text-left text-xs uppercase tracking-wide text-base-500">
                <th className="py-1.5 pr-3">Data</th>
                <th className="py-1.5 pr-3 text-right">Diesel</th>
                <th className="py-1.5 pr-3 text-right">Km/L exigido</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.id} className="border-b border-base-800/60 last:border-0">
                  <td className="py-1.5 pr-3">{new Date(h.criadoEm).toLocaleString('pt-BR')}</td>
                  <td className="py-1.5 pr-3 text-right">{formatMoeda(h.precoDiesel)}</td>
                  <td className="py-1.5 pr-3 text-right">{h.kmLExigido}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
