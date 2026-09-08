import { useEffect, useMemo, useState } from 'react'
import { useSemanas } from '../hooks/useSemanas'
import { useTodosLancamentos } from '../hooks/useLancamentos'
import { atualizarDoc } from '../lib/store'
import { mesclarLocaisDoFimDeSemana, temDadosNoFimDeSemana } from '../lib/agregacoes'
import { calcularValorDevido, dentroDaTolerancia } from '../lib/calculo'
import { formatDataBR, formatKm, formatMinutos, formatMoeda, diaSemanaCurto } from '../lib/format'
import { PlacaMercosul } from '../components/PlacaMercosul'
import { FiltroPeriodo, filtrarSemanas } from '../components/FiltroPeriodo'
import type { ComId, DiaResumo, Lancamento, Semana } from '../types/models'

/** Não respondeu / não tem dado primeiro vai pro fim; entre os que têm dado, mantém alfabético. */
function ordenarLancamentos(lancamentos: ComId<Lancamento>[]): ComId<Lancamento>[] {
  return lancamentos.slice().sort((a, b) => {
    const da = temDadosNoFimDeSemana(a)
    const db = temDadosNoFimDeSemana(b)
    if (da !== db) return da ? -1 : 1
    return a.gerente.localeCompare(b.gerente)
  })
}

type StatusKey = 'debito' | 'parcial' | 'pago' | 'uso_empresa' | 'nao_respondeu' | 'sem_valor'

const STATUS_OPCOES: { key: StatusKey; label: string }[] = [
  { key: 'debito', label: 'Débito' },
  { key: 'parcial', label: 'Parcial' },
  { key: 'pago', label: 'Pago' },
  { key: 'uso_empresa', label: 'Uso empresa' },
  { key: 'nao_respondeu', label: 'Não respondeu' },
  { key: 'sem_valor', label: 'Sem valor' },
]

const CHAVE_FILTRO_STATUS = 'abastecimento-gerentes-filtro-status'
const TODOS_STATUS = STATUS_OPCOES.map((o) => o.key)

function carregarFiltroStatus(): StatusKey[] {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_FILTRO_STATUS) || 'null')
    if (!Array.isArray(salvo) || salvo.length === 0) return TODOS_STATUS
    // "parcial" é status novo — some filtro salvo antes dele existir não pode escondê-lo sem querer.
    return salvo.includes('parcial') ? salvo : [...salvo, 'parcial']
  } catch {
    return TODOS_STATUS
  }
}

export function LancamentosSemana() {
  const { semanas: todasSemanas } = useSemanas()
  const semanaIds = useMemo(() => todasSemanas.map((s) => s.id), [todasSemanas])
  const porSemana = useTodosLancamentos(semanaIds)

  const [periodoSelecionado, setPeriodoSelecionado] = useState<string[]>([])
  useEffect(() => {
    if (periodoSelecionado.length === 0 && todasSemanas[0]) setPeriodoSelecionado([todasSemanas[0].id])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todasSemanas[0]?.id])

  const semanasFiltradas = useMemo(
    () => filtrarSemanas(todasSemanas, periodoSelecionado).slice().sort((a, b) => b.id.localeCompare(a.id)),
    [todasSemanas, periodoSelecionado],
  )

  const [statusVisiveis, setStatusVisiveis] = useState<StatusKey[]>(carregarFiltroStatus)
  useEffect(() => {
    localStorage.setItem(CHAVE_FILTRO_STATUS, JSON.stringify(statusVisiveis))
  }, [statusVisiveis])

  function alternarStatus(key: StatusKey) {
    setStatusVisiveis((atual) => (atual.includes(key) ? atual.filter((k) => k !== key) : [...atual, key]))
  }

  if (todasSemanas.length === 0) {
    return <p className="text-sm text-base-400">Nenhuma semana importada ainda. Vá em "Importar semana" primeiro.</p>
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-base-50">Lançamentos</h1>
            <p className="text-sm text-base-400">{semanasFiltradas.length} semana(s) selecionada(s).</p>
          </div>
          <FiltroPeriodo semanas={todasSemanas} selecionadas={periodoSelecionado} onChange={setPeriodoSelecionado} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-base-500">Status:</span>
          {STATUS_OPCOES.map((o) => (
            <button
              key={o.key}
              onClick={() => alternarStatus(o.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                statusVisiveis.includes(o.key)
                  ? 'border-brand-500/50 bg-brand-700/20 text-brand-200'
                  : 'border-base-700 bg-base-900 text-base-500 hover:text-base-300'
              }`}
            >
              {o.label}
            </button>
          ))}
          <button
            onClick={() => setStatusVisiveis((atual) => atual.filter((k) => k !== 'pago'))}
            className="ml-1 rounded-full border border-base-700 px-3 py-1 text-xs text-base-400 hover:bg-base-800 hover:text-base-200"
          >
            Ocultar pagos
          </button>
          {statusVisiveis.length < TODOS_STATUS.length && (
            <button onClick={() => setStatusVisiveis(TODOS_STATUS)} className="text-xs text-brand-300 hover:underline">
              Mostrar todos
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1">
        {semanasFiltradas.map((semana) => (
          <SecaoSemana
            key={semana.id}
            semana={semana}
            lancamentos={porSemana[semana.id] ?? []}
            mostrarTitulo={semanasFiltradas.length > 1}
            statusVisiveis={statusVisiveis}
          />
        ))}
      </div>
    </div>
  )
}

function SecaoSemana({
  semana,
  lancamentos,
  mostrarTitulo,
  statusVisiveis,
}: {
  semana: ComId<Semana>
  lancamentos: ComId<Lancamento>[]
  mostrarTitulo: boolean
  statusVisiveis: StatusKey[]
}) {
  const ordenados = useMemo(
    () => ordenarLancamentos(lancamentos.filter((l) => statusVisiveis.includes(statusDoLancamento(l).key))),
    [lancamentos, statusVisiveis],
  )

  async function salvar(placa: string, patch: Partial<Lancamento>, atual: Lancamento) {
    const mesclado = { ...atual, ...patch }
    const valorDevidoCalc = calcularValorDevido(mesclado.kmRodado, mesclado.usoEmpresa, semana.kmLExigidoUsado, semana.precoDieselUsado)
    await atualizarDoc(`semanas/${semana.id}/lancamentos`, placa, { ...patch, valorDevidoCalc })
  }

  return (
    <div className="flex flex-col gap-2">
      {mostrarTitulo && (
        <h2 className="text-sm font-semibold text-base-300">
          {formatDataBR(semana.dataInicio)} a {formatDataBR(semana.dataFim)}{' '}
          <span className="font-normal text-base-500">
            · diesel {formatMoeda(semana.precoDieselUsado)}/L · {semana.kmLExigidoUsado} km/L exigido
          </span>
        </h2>
      )}
      {ordenados.length === 0 ? (
        <p className="rounded-lg border border-base-800/60 bg-base-900/40 px-4 py-3 text-sm text-base-500">
          Nada pra mostrar com esse filtro de status nessa semana.
        </p>
      ) : (
        ordenados.map((l) => <CardLancamento key={l.placa} lancamento={l} onSalvar={(patch) => salvar(l.placa, patch, l)} />)
      )}
    </div>
  )
}

function statusDoLancamento(l: Lancamento): { key: StatusKey; label: string; tom: 'bom' | 'atencao' | 'neutro' } {
  if (l.usoEmpresa) return { key: 'uso_empresa', label: 'Uso empresa', tom: 'neutro' }
  if (l.naoRespondeu) return { key: 'nao_respondeu', label: 'Não respondeu', tom: 'atencao' }
  if (l.valorDevidoCalc === 0) return { key: 'sem_valor', label: '—', tom: 'neutro' }
  // Tolerância de 10%: não precisa bater 100% do valor apurado pra fechar como "Pago".
  if (dentroDaTolerancia(l.valorPago ?? 0, l.valorDevidoCalc)) return { key: 'pago', label: 'Pago', tom: 'bom' }
  // Já lançou algum valor, só não bateu a tolerância — respondeu, então não é mais "Débito" (que
  // fica reservado pra quem ainda não lançou nada).
  if ((l.valorPago ?? 0) > 0) return { key: 'parcial', label: 'Parcial', tom: 'atencao' }
  return { key: 'debito', label: 'Débito', tom: 'atencao' }
}

const TOM_BADGE: Record<'bom' | 'atencao' | 'neutro', string> = {
  bom: 'border-good-600/40 bg-good-bg text-good-400',
  atencao: 'border-warn-600/40 bg-warn-bg text-warn-300',
  neutro: 'border-base-700 bg-base-850 text-base-400',
}

/** Célula de coluna com separador vertical e conteúdo centralizado — o padrão visual repetido
 * em toda a linha colapsada, pra ficar fácil de ler em varredura horizontal. */
function Celula({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex min-w-0 flex-col items-center justify-center gap-0.5 border-r border-base-800/50 px-3 text-center last:border-r-0 ${className}`}>{children}</div>
}

function CardLancamento({ lancamento, onSalvar }: { lancamento: Lancamento; onSalvar: (patch: Partial<Lancamento>) => void }) {
  const [aberto, setAberto] = useState(false)
  const [valorPago, setValorPago] = useState(lancamento.valorPago?.toString() ?? '')
  const [dataPagamento, setDataPagamento] = useState(lancamento.dataPagamento ?? '')
  const [observacao, setObservacao] = useState(lancamento.observacao ?? '')

  const dias = lancamento.dias ?? []
  const sab = dias.find((d) => diaSemanaCurto(d.data) === 'Sáb')
  const dom = dias.find((d) => diaSemanaCurto(d.data) === 'Dom')
  const cidades = mesclarLocaisDoFimDeSemana(dias)
  const top = cidades[0]
  const outras = Math.max(cidades.length - 1, 0)
  const status = statusDoLancamento(lancamento)
  const semDados = !temDadosNoFimDeSemana(lancamento)

  return (
    <div className={`overflow-hidden rounded-lg border bg-base-900/60 ${semDados ? 'border-base-800/40 opacity-60' : 'border-base-800/60'}`}>
      <button
        onClick={() => setAberto((a) => !a)}
        className="grid w-full items-stretch gap-0 py-1.5 text-left hover:bg-base-850/60"
        style={{ gridTemplateColumns: 'minmax(220px,1.4fr) 100px 100px minmax(200px,1fr) 100px 120px 24px' }}
      >
        <Celula className="flex-row items-center justify-start gap-2 border-r-0 text-left">
          <PlacaMercosul placa={lancamento.placa} className="h-8 w-16 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm leading-tight font-medium text-base-100">{lancamento.gerente}</div>
            <div className="text-xs text-base-500">{lancamento.filial}</div>
          </div>
        </Celula>
        <Celula>
          <span className="text-[10px] uppercase tracking-wide text-base-500">Sábado</span>
          <span className="font-medium text-base-100">{sab ? formatKm(sab.kmPercorrido) : '—'}</span>
        </Celula>
        <Celula>
          <span className="text-[10px] uppercase tracking-wide text-base-500">Domingo</span>
          <span className="font-medium text-base-100">{dom ? formatKm(dom.kmPercorrido) : '—'}</span>
        </Celula>
        <Celula className="items-center">
          <span className="text-[10px] uppercase tracking-wide text-base-500">Cidade (mais tempo)</span>
          {top ? (
            <span className="truncate text-base-100">
              📍 {top.nome} <span className="text-base-400">· {formatMinutos(top.minutos)}</span>
              {outras > 0 && <span className="text-base-500"> +{outras}</span>}
            </span>
          ) : (
            <span className="text-base-600">—</span>
          )}
        </Celula>
        <Celula>
          <span className="text-[10px] uppercase tracking-wide text-base-500">Devido</span>
          <span className="font-semibold text-base-100">{formatMoeda(lancamento.valorDevidoCalc)}</span>
        </Celula>
        <Celula className="border-r-0">
          <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${TOM_BADGE[status.tom]}`}>{status.label}</span>
        </Celula>
        <Celula className="border-r-0 text-base-500">{aberto ? '▲' : '▼'}</Celula>
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

          <div className="grid grid-cols-2 gap-3 border-t border-base-800/60 pt-4 sm:grid-cols-5">
            <label className="flex items-center gap-2 text-sm text-base-300">
              <input
                type="checkbox"
                checked={lancamento.usoEmpresa}
                onChange={(e) => onSalvar({ usoEmpresa: e.target.checked })}
                title="Marcar se o gerente estava a trabalho — não gera reembolso"
              />
              Uso empresa
            </label>
            <label className="flex items-center gap-2 text-sm text-base-300">
              <input
                type="checkbox"
                checked={lancamento.naoRespondeu}
                onChange={(e) => onSalvar({ naoRespondeu: e.target.checked })}
                title="Marcar se o gerente ainda não respondeu/enviou informação"
              />
              Não respondeu
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
