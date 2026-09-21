import clsx from 'clsx'

interface KpiCardProps {
  label: string
  valor: string
  tom?: 'neutro' | 'bom' | 'atencao' | 'critico'
  detalhe?: string
  /** comparativo com outra referência (ex.: semana anterior). bom=true verde, false vermelho, null neutro. */
  variacao?: { texto: string; sentido: 'subiu' | 'desceu' | 'igual'; bom?: boolean | null }
  /** barra de progresso 0–100 (ex.: % já reembolsado do total a reembolsar) */
  progresso?: number
}

const TOM_DOT: Record<NonNullable<KpiCardProps['tom']>, string> = {
  neutro: 'bg-brand-400',
  bom: 'bg-good-400',
  atencao: 'bg-warn-400',
  critico: 'bg-crit-400',
}

export function KpiCard({ label, valor, tom = 'neutro', detalhe, variacao, progresso }: KpiCardProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-base-800/60 bg-base-900/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase leading-tight tracking-wide text-base-400">{label}</span>
        <span className={clsx('h-2 w-2 shrink-0 rounded-full', TOM_DOT[tom])} />
      </div>
      <span className="min-w-0 break-words text-2xl font-semibold text-base-50">{valor}</span>
      {progresso !== undefined && (
        <div className="h-1.5 overflow-hidden rounded-full bg-base-800">
          <div className={clsx('h-full rounded-full', TOM_DOT[tom])} style={{ width: `${Math.min(Math.max(progresso, 0), 100)}%` }} />
        </div>
      )}
      {variacao && (
        <span className={clsx('text-xs font-medium', variacao.bom === true ? 'text-good-400' : variacao.bom === false ? 'text-crit-400' : 'text-base-400')}>
          {variacao.sentido === 'subiu' ? '▲' : variacao.sentido === 'desceu' ? '▼' : '='} {variacao.texto}
        </span>
      )}
      {detalhe && <span className="text-xs text-base-500">{detalhe}</span>}
    </div>
  )
}
