import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { KpiCard } from '../components/KpiCard'
import { useSemanas } from '../hooks/useSemanas'
import { useTodosLancamentos } from '../hooks/useLancamentos'
import { agregarPorGerente, agregarPorSemana } from '../lib/agregacoes'
import { formatMoeda, formatKm, formatDataBR } from '../lib/format'

export function Dashboard() {
  const { semanas, carregando } = useSemanas()
  const semanaIds = useMemo(() => semanas.map((s) => s.id), [semanas])
  const porSemana = useTodosLancamentos(semanaIds)

  const contaCorrente = useMemo(() => agregarPorGerente(porSemana), [porSemana])
  const serieSemanal = useMemo(() => agregarPorSemana(semanas, porSemana), [semanas, porSemana])

  const ultimaSemana = semanas[0]
  const lancamentosUltimaSemana = ultimaSemana ? (porSemana[ultimaSemana.id] ?? []) : []
  const kmUltimaSemana = lancamentosUltimaSemana.reduce((acc, l) => acc + (l.kmRodado || 0), 0)

  const saldoAberto = contaCorrente.reduce((acc, l) => acc + Math.max(l.saldo, 0), 0)
  const totalPagoGeral = contaCorrente.reduce((acc, l) => acc + l.totalPago, 0)
  const gerentesComSaldo = contaCorrente.filter((l) => l.saldo > 0).length

  if (carregando) return <p className="text-sm text-base-400">Carregando…</p>

  if (semanas.length === 0) {
    return (
      <div className="rounded-xl border border-base-800 bg-base-900/60 p-8 text-center">
        <h2 className="text-lg font-semibold text-base-50">Nenhuma semana importada ainda</h2>
        <p className="mt-2 text-sm text-base-400">
          Comece importando o relatório de Rota do fim de semana em <b>Importar semana</b>.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-base-50">Dashboard</h1>
        <p className="text-sm text-base-400">
          Última semana importada: {ultimaSemana ? `${formatDataBR(ultimaSemana.dataInicio)} a ${formatDataBR(ultimaSemana.dataFim)}` : '—'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Km rodado (última semana)" valor={formatKm(kmUltimaSemana)} tom="neutro" />
        <KpiCard
          label="Saldo em aberto (a reembolsar)"
          valor={formatMoeda(saldoAberto)}
          tom={saldoAberto > 0 ? 'atencao' : 'bom'}
          detalhe={`${gerentesComSaldo} gerente(s) com saldo pendente`}
        />
        <KpiCard label="Total já reembolsado" valor={formatMoeda(totalPagoGeral)} tom="bom" />
        <KpiCard label="Semanas registradas" valor={String(semanas.length)} tom="neutro" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-base-800/60 bg-base-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-base-200">Km rodado por semana</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={serieSemanal}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-800)" />
              <XAxis dataKey="label" stroke="var(--color-base-400)" fontSize={11} />
              <YAxis stroke="var(--color-base-400)" fontSize={11} />
              <Tooltip contentStyle={{ background: 'var(--color-base-850)', border: '1px solid var(--color-base-700)', fontSize: 12 }} formatter={((v: number) => formatKm(v)) as never} />
              <Bar dataKey="totalKm" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-base-800/60 bg-base-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-base-200">Devido x Pago por semana</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={serieSemanal}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-800)" />
              <XAxis dataKey="label" stroke="var(--color-base-400)" fontSize={11} />
              <YAxis stroke="var(--color-base-400)" fontSize={11} />
              <Tooltip contentStyle={{ background: 'var(--color-base-850)', border: '1px solid var(--color-base-700)', fontSize: 12 }} formatter={((v: number) => formatMoeda(v)) as never} />
              <Line type="monotone" dataKey="totalDevido" name="Devido" stroke="var(--color-warn-500)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="totalPago" name="Pago" stroke="var(--color-good-500)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-base-800/60 bg-base-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold text-base-200">Ranking — saldo em aberto por gerente</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-base-800 text-left text-xs uppercase tracking-wide text-base-500">
                <th className="py-2 pr-3">Gerente</th>
                <th className="py-2 pr-3">Placa</th>
                <th className="py-2 pr-3">Filial</th>
                <th className="py-2 pr-3 text-right">Km total</th>
                <th className="py-2 pr-3 text-right">Devido</th>
                <th className="py-2 pr-3 text-right">Pago</th>
                <th className="py-2 pr-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {contaCorrente.map((l) => (
                <tr key={l.placa} className="border-b border-base-800/60 last:border-0">
                  <td className="py-2 pr-3">{l.gerente}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{l.placa}</td>
                  <td className="py-2 pr-3">{l.filial}</td>
                  <td className="py-2 pr-3 text-right">{formatKm(l.totalKm)}</td>
                  <td className="py-2 pr-3 text-right">{formatMoeda(l.totalDevido)}</td>
                  <td className="py-2 pr-3 text-right">{formatMoeda(l.totalPago)}</td>
                  <td className={`py-2 pr-3 text-right font-semibold ${l.saldo > 0 ? 'text-warn-400' : 'text-good-400'}`}>{formatMoeda(l.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
