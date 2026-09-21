import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { KpiCard } from '../components/KpiCard'
import { FiltroPeriodo, filtrarSemanas } from '../components/FiltroPeriodo'
import { useSemanas } from '../hooks/useSemanas'
import { useTodosLancamentos } from '../hooks/useLancamentos'
import { agregarJustificativasUsoEmpresa, agregarPorGerente, agregarPorSemana } from '../lib/agregacoes'
import { TOLERANCIA_REEMBOLSO, percentualApurado } from '../lib/calculo'
import { CartaoTooltip, conteudoTooltip, CURSOR_SUAVE } from '../components/TooltipGrafico'
import { formatMoeda, formatKm, formatDataBR, nomeCurto } from '../lib/format'
import type { PontoSemana } from '../lib/agregacoes'

const LIMITE_TOLERANCIA_PCT = (1 - TOLERANCIA_REEMBOLSO) * 100 // 90%

export function Dashboard() {
  const { semanas: todasSemanas, carregando } = useSemanas()
  const semanaIds = useMemo(() => todasSemanas.map((s) => s.id), [todasSemanas])
  const porSemanaTodas = useTodosLancamentos(semanaIds)

  const [periodoSelecionado, setPeriodoSelecionado] = useState<string[]>([])
  const semanas = useMemo(() => filtrarSemanas(todasSemanas, periodoSelecionado), [todasSemanas, periodoSelecionado])
  const porSemana = useMemo(
    () => Object.fromEntries(semanas.map((s) => [s.id, porSemanaTodas[s.id] ?? []])),
    [semanas, porSemanaTodas],
  )

  const contaCorrente = useMemo(() => agregarPorGerente(semanas, porSemana), [semanas, porSemana])
  const serieSemanal = useMemo(() => agregarPorSemana(semanas, porSemana), [semanas, porSemana])

  const kmParticularPorGerente = useMemo(
    () =>
      contaCorrente
        .filter((l) => l.kmParticular > 0)
        .slice()
        .sort((a, b) => b.kmParticular - a.kmParticular)
        .slice(0, 15)
        .map((l) => ({
          gerente: l.gerente,
          km: Math.round(l.kmParticular * 10) / 10,
          kmTotal: l.totalKm,
          kmEmpresa: l.kmUsoEmpresa,
          placas: l.placas.join(', '),
          filial: l.filial,
          semanas: l.semanasComUso,
          devido: l.totalDevido,
        })),
    [contaCorrente],
  )
  const rankingNaoResponderam = useMemo(
    () =>
      contaCorrente
        .filter((l) => l.semanasNaoRespondeu > 0)
        .slice()
        .sort((a, b) => b.prejuizoNaoRespondeu - a.prejuizoNaoRespondeu)
        .slice(0, 15)
        .map((l) => ({
          gerente: l.gerente,
          prejuizo: Math.round(l.prejuizoNaoRespondeu * 100) / 100,
          semanas: l.semanasNaoRespondeu,
          filial: l.filial,
          placas: l.placas.join(', '),
          devidoTotal: l.totalDevido,
          pagoTotal: l.totalPago,
          km: l.totalKm,
        })),
    [contaCorrente],
  )
  const prejuizoTotalNaoResponderam = contaCorrente.reduce((acc, l) => acc + l.prejuizoNaoRespondeu, 0)

  // Só entra aqui quem já registrou algum valor no lançamento (totalPago > 0) e mesmo assim não
  // bateu o valor apurado — quem ainda nem lançou nada não é "abaixo do valor", é só pendente de
  // preencher (isso já aparece no ranking de saldo em aberto, não precisa duplicar aqui).
  const percentualApuradoPorGerente = useMemo(
    () =>
      contaCorrente
        .filter((l) => l.totalDevido > 0 && l.totalPago > 0 && l.totalPago < l.totalDevido)
        .map((l) => ({
          gerente: l.gerente,
          percentual: percentualApurado(l.totalPago, l.totalDevido) ?? 0,
          pendente: Math.max(l.totalDevido - l.totalPago, 0),
          apurado: l.totalDevido,
          lancado: l.totalPago,
          filial: l.filial,
          placas: l.placas.join(', '),
          semanasParciais: l.semanasParciais,
          faltaParaTolerancia: Math.max(l.totalDevido * (1 - TOLERANCIA_REEMBOLSO) - l.totalPago, 0),
        }))
        .sort((a, b) => a.percentual - b.percentual)
        .slice(0, 15),
    [contaCorrente],
  )

  const justificativasUsoEmpresa = useMemo(() => agregarJustificativasUsoEmpresa(porSemana), [porSemana])

  const periodoDa = (semanaId: string) => {
    const s = semanas.find((x) => x.id === semanaId)
    return s ? `${formatDataBR(s.dataInicio)} a ${formatDataBR(s.dataFim)}` : semanaId
  }
  const tooltipKmSemana = conteudoTooltip<PontoSemana>((d) => (
    <CartaoTooltip
      titulo="Km rodado no fim de semana"
      subtitulo={periodoDa(d.semanaId)}
      linhas={[
        { rotulo: 'Km total rodado', valor: formatKm(d.totalKm) },
        { rotulo: 'Km particular (reembolsável)', valor: formatKm(d.kmParticular), tom: 'atencao' },
        { rotulo: 'Km uso empresa (zerado)', valor: formatKm(d.kmUsoEmpresa) },
        { rotulo: 'Gerentes que rodaram', valor: d.gerentesComKm, separador: true },
        { rotulo: 'Média por gerente', valor: formatKm(d.gerentesComKm ? d.totalKm / d.gerentesComKm : 0) },
      ]}
    />
  ))
  const tooltipDevidoPago = conteudoTooltip<PontoSemana>((d) => (
    <CartaoTooltip
      titulo="Devido x Pago"
      subtitulo={periodoDa(d.semanaId)}
      linhas={[
        { rotulo: 'Devido (apurado)', valor: formatMoeda(d.totalDevido) },
        { rotulo: 'Pago / reembolsado', valor: formatMoeda(d.totalPago), tom: 'bom' },
        { rotulo: 'Pendente', valor: formatMoeda(d.totalPendente), tom: d.totalPendente > 0 ? 'atencao' : 'bom' },
        { rotulo: '% do apurado pago', valor: `${d.totalDevido ? Math.round((d.totalPago / d.totalDevido) * 1000) / 10 : 0}%`, separador: true },
        { rotulo: 'Gerentes em dia', valor: d.gerentesEmDia, tom: 'bom' },
        { rotulo: 'Gerentes pendentes', valor: d.gerentesPendentes, tom: d.gerentesPendentes > 0 ? 'atencao' : undefined },
      ]}
      nota="Em dia = pagou pelo menos 90% do apurado (tolerância de 10%)."
    />
  ))
  type LinhaKm = (typeof kmParticularPorGerente)[number]
  const tooltipKmGerente = conteudoTooltip<LinhaKm>((d) => (
    <CartaoTooltip
      titulo={d.gerente}
      subtitulo={`${d.filial} · ${d.placas}`}
      linhas={[
        { rotulo: 'Km particular', valor: formatKm(d.km), tom: 'atencao' },
        { rotulo: 'Km total rodado', valor: formatKm(d.kmTotal) },
        { rotulo: 'Km uso empresa (zerado)', valor: formatKm(d.kmEmpresa) },
        { rotulo: '% particular do total', valor: `${d.kmTotal ? Math.round((d.km / d.kmTotal) * 100) : 0}%`, separador: true },
        { rotulo: 'Semanas com uso particular', valor: d.semanas },
        { rotulo: 'Valor devido no período', valor: formatMoeda(d.devido) },
      ]}
    />
  ))
  type LinhaPrejuizo = (typeof rankingNaoResponderam)[number]
  const tooltipPrejuizo = conteudoTooltip<LinhaPrejuizo>((d) => (
    <CartaoTooltip
      titulo={d.gerente}
      subtitulo={`${d.filial} · ${d.placas}`}
      linhas={[
        { rotulo: 'Prejuízo (devido não resolvido)', valor: formatMoeda(d.prejuizo), tom: 'critico' },
        { rotulo: 'Semanas sem responder', valor: d.semanas, tom: 'atencao' },
        { rotulo: 'Devido total no período', valor: formatMoeda(d.devidoTotal), separador: true },
        { rotulo: 'Pago no período', valor: formatMoeda(d.pagoTotal) },
        { rotulo: 'Km rodado no período', valor: formatKm(d.km) },
      ]}
      nota="Prejuízo = valor devido (menos o que já foi pago) nas semanas marcadas como não respondeu."
    />
  ))
  type LinhaAbaixo = (typeof percentualApuradoPorGerente)[number]
  const tooltipAbaixo = conteudoTooltip<LinhaAbaixo>((d) => (
    <CartaoTooltip
      titulo={d.gerente}
      subtitulo={`${d.filial} · ${d.placas}`}
      linhas={[
        { rotulo: 'Valor apurado', valor: formatMoeda(d.apurado) },
        { rotulo: 'Valor lançado', valor: formatMoeda(d.lancado), tom: 'bom' },
        { rotulo: 'Pendente', valor: formatMoeda(d.pendente), tom: 'atencao' },
        { rotulo: '% do apurado abastecido', valor: `${d.percentual}%`, tom: d.percentual >= LIMITE_TOLERANCIA_PCT ? 'bom' : 'atencao', separador: true },
        {
          rotulo: d.percentual >= LIMITE_TOLERANCIA_PCT ? 'Situação' : `Faltou p/ ${LIMITE_TOLERANCIA_PCT}%`,
          valor: d.percentual >= LIMITE_TOLERANCIA_PCT ? 'Dentro da tolerância' : formatMoeda(d.faltaParaTolerancia),
          tom: d.percentual >= LIMITE_TOLERANCIA_PCT ? 'bom' : 'critico',
        },
        { rotulo: 'Semanas abaixo da tolerância', valor: d.semanasParciais },
      ]}
    />
  ))

  const ultimaSemana = semanas[0]
  const lancamentosUltimaSemana = ultimaSemana ? (porSemana[ultimaSemana.id] ?? []) : []
  const kmUltimaSemana = lancamentosUltimaSemana.reduce((acc, l) => acc + (l.kmRodado || 0), 0)

  const saldoAberto = contaCorrente.reduce((acc, l) => acc + Math.max(l.saldo, 0), 0)
  const totalPagoGeral = contaCorrente.reduce((acc, l) => acc + l.totalPago, 0)
  const gerentesComSaldo = contaCorrente.filter((l) => l.saldo > 0).length

  if (carregando) return <p className="text-sm text-base-400">Carregando…</p>

  if (todasSemanas.length === 0) {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-base-50">Dashboard</h1>
          <p className="text-sm text-base-400">
            {semanas.length} semana(s) no período · última importada:{' '}
            {todasSemanas[0] ? `${formatDataBR(todasSemanas[0].dataInicio)} a ${formatDataBR(todasSemanas[0].dataFim)}` : '—'}
          </p>
        </div>
        <FiltroPeriodo semanas={todasSemanas} selecionadas={periodoSelecionado} onChange={setPeriodoSelecionado} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Km rodado (última semana do período)" valor={formatKm(kmUltimaSemana)} tom="neutro" />
        <KpiCard
          label="Saldo em aberto (a reembolsar)"
          valor={formatMoeda(saldoAberto)}
          tom={saldoAberto > 0 ? 'atencao' : 'bom'}
          detalhe={`${gerentesComSaldo} gerente(s) com saldo pendente`}
        />
        <KpiCard label="Total já reembolsado" valor={formatMoeda(totalPagoGeral)} tom="bom" />
        <KpiCard label="Semanas no período" valor={String(semanas.length)} tom="neutro" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-base-800/60 bg-base-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-base-200">Km rodado por semana</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={serieSemanal}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-800)" />
              <XAxis dataKey="label" stroke="var(--color-base-400)" fontSize={11} />
              <YAxis stroke="var(--color-base-400)" fontSize={11} />
              <Tooltip cursor={CURSOR_SUAVE} content={tooltipKmSemana} />
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
              <Tooltip content={tooltipDevidoPago} />
              <Line type="monotone" dataKey="totalDevido" name="Devido" stroke="var(--color-warn-500)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="totalPago" name="Pago" stroke="var(--color-good-500)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-base-800/60 bg-base-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-base-200">Km particular por gerente</h2>
          {kmParticularPorGerente.length === 0 ? (
            <p className="text-sm text-base-500">Nenhum km particular registrado no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, kmParticularPorGerente.length * 28)}>
              <BarChart data={kmParticularPorGerente} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-800)" />
                <XAxis type="number" stroke="var(--color-base-400)" fontSize={11} />
                <YAxis type="category" dataKey="gerente" tickFormatter={nomeCurto} stroke="var(--color-base-400)" fontSize={11} width={120} />
                <Tooltip cursor={CURSOR_SUAVE} content={tooltipKmGerente} />
                <Bar dataKey="km" fill="var(--color-brand-500)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rounded-xl border border-base-800/60 bg-base-900/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-base-200">Prejuízo financeiro — gerentes que não responderam</h2>
            {prejuizoTotalNaoResponderam > 0 && <span className="text-xs font-semibold text-warn-300">{formatMoeda(prejuizoTotalNaoResponderam)} no total</span>}
          </div>
          {rankingNaoResponderam.length === 0 ? (
            <p className="text-sm text-base-500">Ninguém marcado como "não respondeu" no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, rankingNaoResponderam.length * 28)}>
              <BarChart data={rankingNaoResponderam} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-800)" />
                <XAxis type="number" stroke="var(--color-base-400)" fontSize={11} />
                <YAxis type="category" dataKey="gerente" tickFormatter={nomeCurto} stroke="var(--color-base-400)" fontSize={11} width={120} />
                <Tooltip cursor={CURSOR_SUAVE} content={tooltipPrejuizo} />
                <Bar dataKey="prejuizo" name="Prejuízo" fill="var(--color-warn-500)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-base-800/60 bg-base-900/60 p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-base-200">Lançaram valor abaixo do apurado</h2>
          <span className="text-xs text-base-500">Tolerância: {LIMITE_TOLERANCIA_PCT}% ou mais conta como em dia</span>
        </div>
        {percentualApuradoPorGerente.length === 0 ? (
          <p className="text-sm text-base-500">Ninguém lançou valor abaixo do apurado no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, percentualApuradoPorGerente.length * 28)}>
            <BarChart data={percentualApuradoPorGerente} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-800)" />
              <XAxis type="number" domain={[0, (max: number) => Math.max(100, max)]} unit="%" stroke="var(--color-base-400)" fontSize={11} />
              <YAxis type="category" dataKey="gerente" tickFormatter={nomeCurto} stroke="var(--color-base-400)" fontSize={11} width={120} />
              <Tooltip cursor={CURSOR_SUAVE} content={tooltipAbaixo} />
              <ReferenceLine x={LIMITE_TOLERANCIA_PCT} stroke="var(--color-base-400)" strokeDasharray="4 4" label={{ value: `${LIMITE_TOLERANCIA_PCT}%`, position: 'insideTopRight', fill: 'var(--color-base-400)', fontSize: 10 }} />
              <Bar dataKey="percentual" radius={[0, 4, 4, 0]}>
                {percentualApuradoPorGerente.map((d) => (
                  <Cell key={d.gerente} fill={d.percentual >= LIMITE_TOLERANCIA_PCT ? 'var(--color-good-500)' : 'var(--color-warn-500)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl border border-base-800/60 bg-base-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold text-base-200">Uso empresa — por justificativa</h2>
        {justificativasUsoEmpresa.length === 0 ? (
          <p className="text-sm text-base-500">Nenhum "uso empresa" marcado no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-base-800 text-left text-xs uppercase tracking-wide text-base-500">
                  <th className="py-2 pr-3">Justificativa</th>
                  <th className="py-2 pr-3 text-right">Ocorrências</th>
                  <th className="py-2 pr-3 text-right">Km total</th>
                </tr>
              </thead>
              <tbody>
                {justificativasUsoEmpresa.map((j) => (
                  <tr key={j.observacao} className="border-b border-base-800/60 last:border-0">
                    <td className={`py-2 pr-3 ${j.semJustificativa ? 'text-warn-300 italic' : 'text-base-100'}`}>{j.observacao}</td>
                    <td className="py-2 pr-3 text-right">{j.ocorrencias}</td>
                    <td className="py-2 pr-3 text-right">{formatKm(j.km)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                <tr key={l.gerente} className="border-b border-base-800/60 last:border-0">
                  <td className="py-2 pr-3">{l.gerente}</td>
                  <td className="py-2 pr-3 font-mono text-xs" title={l.placas.length > 1 ? `Já usou: ${l.placas.join(', ')}` : undefined}>
                    {l.placa}
                    {l.placas.length > 1 && <span className="ml-1 text-base-500">*</span>}
                  </td>
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
