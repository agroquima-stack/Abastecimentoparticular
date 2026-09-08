import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSemanas } from '../hooks/useSemanas'
import { useLancamentos } from '../hooks/useLancamentos'
import { formatDataBR, formatMoeda, formatKm } from '../lib/format'
import type { Lancamento } from '../types/models'

export function LancamentosSemana() {
  const { semanas } = useSemanas()
  const [params, setParams] = useSearchParams()
  const semanaId = params.get('semana') ?? semanas[0]?.id ?? null

  useEffect(() => {
    if (!params.get('semana') && semanas[0]) setParams({ semana: semanas[0].id }, { replace: true })
  }, [semanas, params, setParams])

  const semana = semanas.find((s) => s.id === semanaId)
  const { lancamentos, salvarLancamento } = useLancamentos(semanaId)

  if (semanas.length === 0) {
    return <p className="text-sm text-base-400">Nenhuma semana importada ainda. Vá em "Importar semana" primeiro.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-base-50">Lançamentos da semana</h1>
          {semana && (
            <p className="text-sm text-base-400">
              {formatDataBR(semana.dataInicio)} a {formatDataBR(semana.dataFim)} · diesel {formatMoeda(semana.precoDieselUsado)}/L ·{' '}
              {semana.kmLExigidoUsado} km/L exigido
            </p>
          )}
        </div>
        <select
          value={semanaId ?? ''}
          onChange={(e) => setParams({ semana: e.target.value })}
          className="rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 outline-none focus:border-brand-400"
        >
          {semanas.map((s) => (
            <option key={s.id} value={s.id}>
              {formatDataBR(s.dataInicio)} a {formatDataBR(s.dataFim)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-base-800/60 bg-base-900/60">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-base-800 text-left text-xs uppercase tracking-wide text-base-500">
              <th className="px-3 py-2">Gerente</th>
              <th className="px-3 py-2">Placa</th>
              <th className="px-3 py-2 text-right">Km fds</th>
              <th className="px-3 py-2 text-center">Uso empresa</th>
              <th className="px-3 py-2 text-right">Devido (calc.)</th>
              <th className="px-3 py-2 text-right">Comprovante (R$)</th>
              <th className="px-3 py-2 text-right">Pago (R$)</th>
              <th className="px-3 py-2">Data pgto.</th>
              <th className="px-3 py-2">Obs.</th>
              <th className="px-3 py-2">Locais (Paradas)</th>
            </tr>
          </thead>
          <tbody>
            {lancamentos.map((l) => (
              <LinhaLancamento
                key={l.placa}
                lancamento={l}
                onSalvar={(patch) => salvarLancamento(semanaId!, l.placa, patch, semana!.kmLExigidoUsado, semana!.precoDieselUsado, l)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LinhaLancamento({ lancamento, onSalvar }: { lancamento: Lancamento; onSalvar: (patch: Partial<Lancamento>) => void }) {
  const [comprovante, setComprovante] = useState(lancamento.valorComprovante?.toString() ?? '')
  const [pago, setPago] = useState(lancamento.valorPago?.toString() ?? '')
  const [dataPagamento, setDataPagamento] = useState(lancamento.dataPagamento ?? '')
  const [observacao, setObservacao] = useState(lancamento.observacao ?? '')

  return (
    <tr className={`border-b border-base-800/60 last:border-0 ${lancamento.usoEmpresa ? 'opacity-60' : ''}`}>
      <td className="px-3 py-1.5">{lancamento.gerente}</td>
      <td className="px-3 py-1.5 font-mono text-xs">{lancamento.placa}</td>
      <td className="px-3 py-1.5 text-right">{formatKm(lancamento.kmRodado)}</td>
      <td className="px-3 py-1.5 text-center">
        <input
          type="checkbox"
          checked={lancamento.usoEmpresa}
          onChange={(e) => onSalvar({ usoEmpresa: e.target.checked })}
          title="Marcar se o gerente estava a trabalho (uso empresa) — não gera reembolso"
        />
      </td>
      <td className="px-3 py-1.5 text-right font-semibold text-base-100">{formatMoeda(lancamento.valorDevidoCalc)}</td>
      <td className="px-3 py-1.5 text-right">
        <input
          type="number"
          step="0.01"
          value={comprovante}
          onChange={(e) => setComprovante(e.target.value)}
          onBlur={() => onSalvar({ valorComprovante: comprovante ? Number(comprovante) : null })}
          className="w-24 rounded-md border border-base-700 bg-base-900 px-2 py-1 text-right text-sm outline-none focus:border-brand-400"
        />
      </td>
      <td className="px-3 py-1.5 text-right">
        <input
          type="number"
          step="0.01"
          value={pago}
          onChange={(e) => setPago(e.target.value)}
          onBlur={() => onSalvar({ valorPago: pago ? Number(pago) : null })}
          className="w-24 rounded-md border border-base-700 bg-base-900 px-2 py-1 text-right text-sm outline-none focus:border-brand-400"
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          type="date"
          value={dataPagamento}
          onChange={(e) => setDataPagamento(e.target.value)}
          onBlur={() => onSalvar({ dataPagamento: dataPagamento || null })}
          className="rounded-md border border-base-700 bg-base-900 px-2 py-1 text-sm outline-none focus:border-brand-400"
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          type="text"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          onBlur={() => onSalvar({ observacao })}
          placeholder="opcional"
          className="w-32 rounded-md border border-base-700 bg-base-900 px-2 py-1 text-sm outline-none focus:border-brand-400"
        />
      </td>
      <td className="max-w-[220px] px-3 py-1.5 text-xs text-base-400">
        {lancamento.locaisPorDia && lancamento.locaisPorDia.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {lancamento.locaisPorDia.map((d) => (
              <span key={d.data} title={d.locais.join(', ')} className="truncate">
                <b className="text-base-300">{formatDataBR(d.data)}:</b> {d.locais.length ? d.locais.join(', ') : '—'}
              </span>
            ))}
          </div>
        ) : (
          '—'
        )}
      </td>
    </tr>
  )
}
