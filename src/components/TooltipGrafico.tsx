import type { ReactNode } from 'react'

export interface LinhaTooltip {
  rotulo: string
  valor: ReactNode
  tom?: 'bom' | 'atencao' | 'critico'
  /** linha separadora antes (agrupa blocos de informação) */
  separador?: boolean
}

const COR_TOM = { bom: 'text-good-400', atencao: 'text-warn-300', critico: 'text-crit-400' }

/** Cartão de tooltip padrão dos gráficos: título + subtítulo + linhas rótulo/valor. */
export function CartaoTooltip({ titulo, subtitulo, linhas, nota }: { titulo: string; subtitulo?: string; linhas: LinhaTooltip[]; nota?: string }) {
  return (
    <div className="min-w-[240px] max-w-[320px] rounded-lg border border-base-700 bg-base-850 p-3 text-xs shadow-xl">
      <div className="font-semibold text-base-50">{titulo}</div>
      {subtitulo && <div className="mb-2 text-base-400">{subtitulo}</div>}
      <div className="flex flex-col gap-1">
        {linhas.map((l, i) => (
          <div key={i} className={`flex items-baseline justify-between gap-4 ${l.separador ? 'mt-1 border-t border-base-700 pt-1.5' : ''}`}>
            <span className="text-base-400">{l.rotulo}</span>
            <span className={`text-right font-medium ${l.tom ? COR_TOM[l.tom] : 'text-base-100'}`}>{l.valor}</span>
          </div>
        ))}
      </div>
      {nota && <div className="mt-2 border-t border-base-700 pt-1.5 text-[11px] leading-snug text-base-500">{nota}</div>}
    </div>
  )
}

interface PropsRecharts<T> {
  active?: boolean
  payload?: readonly { payload: T }[]
}

/** Adapta uma função (linha de dados -> cartão) para o `content` do Tooltip do Recharts. */
export function conteudoTooltip<T>(montar: (linha: T) => ReactNode) {
  const Conteudo = ({ active, payload }: PropsRecharts<T>) => {
    if (!active || !payload || payload.length === 0) return null
    return <>{montar(payload[0].payload)}</>
  }
  return Conteudo as never
}

/** Destaque suave da linha/barra sob o mouse (em vez do bloco cinza chapado padrão). */
export const CURSOR_SUAVE = { fill: 'var(--color-base-700)', opacity: 0.25 }
