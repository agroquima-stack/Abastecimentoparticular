import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSemanas } from '../hooks/useSemanas'
import { useLancamentos } from '../hooks/useLancamentos'
import { mesclarLocaisDoFimDeSemana } from '../lib/agregacoes'
import { formatDataBR, formatKm, formatMinutos, formatMoeda, diaSemanaCurto } from '../lib/format'
import { PlacaMercosul } from '../components/PlacaMercosul'
import type { DiaResumo, Lancamento } from '../types/models'

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

      <div className="flex flex-col gap-2">
        {lancamentos.map((l) => (
          <CardLancamento
            key={l.placa}
            lancamento={l}
            onSalvar={(patch) => salvarLancamento(semanaId!, l.placa, patch, semana!.kmLExigidoUsado, semana!.precoDieselUsado, l)}
          />
        ))}
      </div>
    </div>
  )
}

function statusDoLancamento(l: Lancamento): { label: string; tom: 'bom' | 'atencao' | 'neutro' } {
  if (l.usoEmpresa) return { label: 'Uso empresa', tom: 'neutro' }
  if (l.valorDevidoCalc === 0) return { label: '—', tom: 'neutro' }
  if ((l.valorPago ?? 0) >= l.valorDevidoCalc) return { label: 'Pago', tom: 'bom' }
  return { label: 'Débito', tom: 'atencao' }
}

const TOM_BADGE: Record<'bom' | 'atencao' | 'neutro', string> = {
  bom: 'border-good-600/40 bg-good-bg text-good-400',
  atencao: 'border-warn-600/40 bg-warn-bg text-warn-300',
  neutro: 'border-base-700 bg-base-850 text-base-400',
}

function CardLancamento({ lancamento, onSalvar }: { lancamento: Lancamento; onSalvar: (patch: Partial<Lancamento>) => void }) {
  const [aberto, setAberto] = useState(false)
  const [valorPago, setValorPago] = useState(lancamento.valorPago?.toString() ?? '')
  const [dataPagamento, setDataPagamento] = useState(lancamento.dataPagamento ?? '')
  const [observacao, setObservacao] = useState(lancamento.observacao ?? '')

  const dias = lancamento.dias ?? []
  const sab = dias.find((d) => diaSemanaCurto(d.data) === 'Sáb')
  const dom = dias.find((d) => diaSemanaCurto(d.data) === 'Dom')
  const velMax = Math.max(0, ...[sab, dom].map((d) => (d?.velMaxima ? parseInt(d.velMaxima, 10) || 0 : 0)))
  const cidades = mesclarLocaisDoFimDeSemana(dias)
  const top = cidades[0]
  const outras = Math.max(cidades.length - 1, 0)
  const status = statusDoLancamento(lancamento)

  return (
    <div className={`overflow-hidden rounded-xl border bg-base-900/60 ${lancamento.usoEmpresa ? 'border-base-800/40 opacity-70' : 'border-base-800/60'}`}>
      <button onClick={() => setAberto((a) => !a)} className="flex w-full flex-wrap items-center gap-4 p-3 text-left hover:bg-base-850/60">
        <PlacaMercosul placa={lancamento.placa} className="h-10 w-20 shrink-0" />
        <div className="min-w-[170px]">
          <div className="text-sm font-medium text-base-100">{lancamento.gerente}</div>
          <div className="text-xs text-base-500">{lancamento.filial}</div>
        </div>
        <ColunaDia rotulo="Sábado" dia={sab} />
        <ColunaDia rotulo="Domingo" dia={dom} />
        <div className="w-20 text-xs">
          <div className="text-[10px] uppercase tracking-wide text-base-500">Vel. máx.</div>
          <div className="text-base-100">{velMax ? `${velMax} km/h` : '—'}</div>
        </div>
        <div className="min-w-[190px] flex-1 text-xs">
          <div className="text-[10px] uppercase tracking-wide text-base-500">Cidade (mais tempo)</div>
          {top ? (
            <div className="text-base-100">
              📍 {top.nome} <span className="text-base-400">· {formatMinutos(top.minutos)}</span>
              {outras > 0 && <span className="text-base-500"> +{outras} outras</span>}
            </div>
          ) : (
            <span className="text-base-600">—</span>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-base-500">Devido</div>
          <div className="text-sm font-semibold text-base-100">{formatMoeda(lancamento.valorDevidoCalc)}</div>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${TOM_BADGE[status.tom]}`}>{status.label}</span>
        <span className="ml-auto shrink-0 text-base-500">{aberto ? '▲' : '▼'}</span>
      </button>

      {aberto && (
        <div className="flex flex-col gap-4 border-t border-base-800/60 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <DetalheDia titulo="Sábado" dia={sab} />
            <DetalheDia titulo="Domingo" dia={dom} />
          </div>

          {cidades.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-wide text-base-500">Cidades/locais percorridos no fim de semana</div>
              <div className="flex flex-wrap gap-1.5">
                {cidades.map((c) => (
                  <span key={c.nome} className="rounded-full border border-base-700 bg-base-850 px-2 py-1 text-xs text-base-300">
                    📍 {c.nome} {c.minutos > 0 && <b className="text-base-100">{formatMinutos(c.minutos)}</b>}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 border-t border-base-800/60 pt-4 sm:grid-cols-4">
            <label className="flex items-center gap-2 text-sm text-base-300">
              <input
                type="checkbox"
                checked={lancamento.usoEmpresa}
                onChange={(e) => onSalvar({ usoEmpresa: e.target.checked })}
                title="Marcar se o gerente estava a trabalho — não gera reembolso"
              />
              Uso empresa
            </label>
            <label className="flex flex-col gap-1 text-xs text-base-400">
              Valor reembolsado (R$)
              <input
                type="number"
                step="0.01"
                value={valorPago}
                onChange={(e) => setValorPago(e.target.value)}
                onBlur={() => onSalvar({ valorPago: valorPago ? Number(valorPago) : null })}
                className="rounded-md border border-base-700 bg-base-900 px-2 py-1 text-sm text-base-100 outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-base-400">
              Data pagamento
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                onBlur={() => onSalvar({ dataPagamento: dataPagamento || null })}
                className="rounded-md border border-base-700 bg-base-900 px-2 py-1 text-sm text-base-100 outline-none focus:border-brand-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-base-400">
              Observação
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                onBlur={() => onSalvar({ observacao })}
                placeholder="opcional"
                className="rounded-md border border-base-700 bg-base-900 px-2 py-1 text-sm text-base-100 outline-none focus:border-brand-400"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

function ColunaDia({ rotulo, dia }: { rotulo: string; dia?: DiaResumo }) {
  return (
    <div className="min-w-[120px] text-xs">
      <div className="text-[10px] uppercase tracking-wide text-base-500">{rotulo}</div>
      <div className="font-medium text-base-100">{dia ? formatKm(dia.kmPercorrido) : '—'}</div>
      {dia?.horaSaida && (
        <div className="text-base-500">
          {dia.horaSaida} → {dia.horaChegada || '—'}
        </div>
      )}
    </div>
  )
}

function DetalheDia({ titulo, dia }: { titulo: string; dia?: DiaResumo }) {
  if (!dia) {
    return (
      <div className="rounded-lg border border-base-800/60 p-3 text-xs text-base-500">
        {titulo}: sem detalhe do relatório de Rota pra esse dia.
      </div>
    )
  }
  const campos: [string, string][] = [
    ['Odômetro', dia.odometro ? formatKm(dia.odometro) : '—'],
    ['Paradas', dia.paradas != null ? String(dia.paradas) : '—'],
    ['Vel. média', dia.velMedia || '—'],
    ['Vel. máxima', dia.velMaxima || '—'],
    ['Hora saída', dia.horaSaida || '—'],
    ['Hora chegada', dia.horaChegada || '—'],
    ['Tempo trabalho', dia.tempoTrabalho || '—'],
    ['Tempo dentro cerca', dia.tempoDentroCerca || '—'],
    ['Tempo acima vel.', dia.tempoAcimaVel || '—'],
    ['Tempo movimento', dia.tempoMovimento || '—'],
    ['Tempo parado', dia.tempoParado || '—'],
  ]
  return (
    <div className="rounded-lg border border-base-800/60 p-3">
      <div className="mb-2 text-xs font-semibold text-base-200">
        {titulo} — {formatDataBR(dia.data)}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        {campos.map(([label, val]) => (
          <div key={label}>
            <div className="text-base-500">{label}</div>
            <div className="text-base-100">{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
