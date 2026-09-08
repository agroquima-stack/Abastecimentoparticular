import { useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useSemanas } from '../hooks/useSemanas'
import { useTodosLancamentos } from '../hooks/useLancamentos'
import { agregarPorGerente } from '../lib/agregacoes'
import { formatDataBR, formatMoeda, formatKm } from '../lib/format'

export function ContaCorrente() {
  const { semanas } = useSemanas()
  const semanaIds = useMemo(() => semanas.map((s) => s.id), [semanas])
  const porSemana = useTodosLancamentos(semanaIds)
  const contaCorrente = useMemo(() => agregarPorGerente(semanas, porSemana), [semanas, porSemana])

  const [gerenteSelecionado, setGerenteSelecionado] = useState<string | null>(null)
  const linha = contaCorrente.find((l) => l.gerente === gerenteSelecionado) ?? contaCorrente[0]

  const semanasOrdenadas = semanas.slice().sort((a, b) => a.id.localeCompare(b.id))
  const historicoDoGerente = linha
    ? semanasOrdenadas.map((s) => {
        // Busca por gerente (não por placa) — se ele trocou de camionete numa semana, o
        // lançamento daquela semana ainda aparece aqui, só que com outra placa. Soma tudo caso
        // existam dois lançamentos do mesmo gerente na mesma semana (cadastro com duas
        // camionetes ativas pra ele, por exemplo).
        const ls = (porSemana[s.id] ?? []).filter((x) => x.gerente === linha.gerente)
        return {
          semanaId: s.id,
          label: formatDataBR(s.dataInicio),
          placas: ls.map((l) => l.placa).join(', ') || null,
          km: ls.reduce((acc, l) => acc + (l.kmRodado || 0), 0),
          usoEmpresa: ls.length > 0 && ls.every((l) => l.usoEmpresa),
          devido: ls.reduce((acc, l) => acc + (l.valorDevidoCalc || 0), 0),
          pago: ls.some((l) => l.valorPago != null) ? ls.reduce((acc, l) => acc + (l.valorPago || 0), 0) : null,
        }
      })
    : []

  let acumulado = 0
  const serieAcumulada = historicoDoGerente.map((h) => {
    acumulado += (h.devido || 0) - (h.pago || 0)
    return { label: h.label, saldo: Math.round(acumulado * 100) / 100 }
  })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-base-50">Conta corrente por gerente</h1>

      {contaCorrente.length === 0 ? (
        <p className="text-sm text-base-400">Nenhum lançamento registrado ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-base-800/60 bg-base-900/60">
            {contaCorrente.map((l) => (
              <button
                key={l.gerente}
                onClick={() => setGerenteSelecionado(l.gerente)}
                className={`flex w-full flex-col gap-0.5 border-b border-base-800/60 px-3 py-2 text-left text-sm last:border-0 hover:bg-base-800/40 ${
                  linha?.gerente === l.gerente ? 'bg-brand-700/20' : ''
                }`}
              >
                <span className="text-base-100">{l.gerente}</span>
                <span className="flex justify-between text-xs text-base-500">
                  <span>{l.placa}</span>
                  <span className={l.saldo > 0 ? 'text-warn-400' : 'text-good-400'}>{formatMoeda(l.saldo)}</span>
                </span>
              </button>
            ))}
          </div>

          {linha && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-base-800/60 bg-base-900/60 p-4 sm:grid-cols-4">
                <Resumo label="Km total" valor={formatKm(linha.totalKm)} />
                <Resumo label="Total devido" valor={formatMoeda(linha.totalDevido)} />
                <Resumo label="Total pago" valor={formatMoeda(linha.totalPago)} />
                <Resumo label="Saldo" valor={formatMoeda(linha.saldo)} destaque={linha.saldo > 0 ? 'atencao' : 'bom'} />
              </div>

              {linha.placas.length > 1 && (
                <p className="text-xs text-base-500">
                  Já usou mais de uma camionete: <span className="font-mono">{linha.placas.join(', ')}</span> — o saldo acima soma
                  todas.
                </p>
              )}

              <div className="rounded-xl border border-base-800/60 bg-base-900/60 p-4">
                <h2 className="mb-3 text-sm font-semibold text-base-200">Saldo acumulado ao longo do tempo</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={serieAcumulada}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-800)" />
                    <XAxis dataKey="label" stroke="var(--color-base-400)" fontSize={11} />
                    <YAxis stroke="var(--color-base-400)" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'var(--color-base-850)', border: '1px solid var(--color-base-700)', fontSize: 12 }} formatter={((v: number) => formatMoeda(v)) as never} />
                    <Line type="stepAfter" dataKey="saldo" stroke="var(--color-brand-400)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto rounded-xl border border-base-800/60 bg-base-900/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-base-800 text-left text-xs uppercase tracking-wide text-base-500">
                      <th className="px-3 py-2">Semana</th>
                      <th className="px-3 py-2">Placa</th>
                      <th className="px-3 py-2 text-right">Km</th>
                      <th className="px-3 py-2 text-center">Uso empresa</th>
                      <th className="px-3 py-2 text-right">Devido</th>
                      <th className="px-3 py-2 text-right">Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoDoGerente
                      .slice()
                      .reverse()
                      .map((h) => (
                        <tr key={h.semanaId} className="border-b border-base-800/60 last:border-0">
                          <td className="px-3 py-1.5">{h.label}</td>
                          <td className="px-3 py-1.5 font-mono text-xs">{h.placas ?? '—'}</td>
                          <td className="px-3 py-1.5 text-right">{formatKm(h.km)}</td>
                          <td className="px-3 py-1.5 text-center">{h.usoEmpresa ? '✓' : ''}</td>
                          <td className="px-3 py-1.5 text-right">{formatMoeda(h.devido)}</td>
                          <td className="px-3 py-1.5 text-right">{formatMoeda(h.pago)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Resumo({ label, valor, destaque }: { label: string; valor: string; destaque?: 'bom' | 'atencao' }) {
  const cor = destaque === 'atencao' ? 'text-warn-400' : destaque === 'bom' ? 'text-good-400' : 'text-base-50'
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-base-500">{label}</span>
      <span className={`text-lg font-semibold ${cor}`}>{valor}</span>
    </div>
  )
}
