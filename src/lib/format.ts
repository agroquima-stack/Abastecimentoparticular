export function formatMoeda(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatKm(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
}

export function formatDataBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/** "05/09/2026" -> "2026-09-05" */
export function dataBRparaISO(dataBR: string): string {
  const [dia, mes, ano] = dataBR.trim().split('/')
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
}

/** 117 -> "1h57", 12 -> "12min", 0 -> "0min" */
export function formatMinutos(min: number): string {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const resto = min % 60
  return resto === 0 ? `${h}h` : `${h}h${String(resto).padStart(2, '0')}`
}

/** Nome do dia da semana curto a partir de uma data ISO, ex.: "Sáb" / "Dom". */
export function diaSemanaCurto(iso: string): string {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const [ano, mes, dia] = iso.split('-').map(Number)
  return dias[new Date(ano, mes - 1, dia).getDay()]
}

const PARTICULAS = new Set(['DA', 'DE', 'DO', 'DAS', 'DOS', 'E'])

/** "JOAO CLAUDIO BARROS DE PAIVA" -> "JOAO PAIVA" (primeiro nome + último sobrenome). Ignora
 * partículas soltas no fim (nomes vêm truncados do ERP, ex.: "ANDERSON LEONARDO PEREIRA DA"). */
export function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  while (partes.length > 2 && PARTICULAS.has(partes[partes.length - 1].toUpperCase())) partes.pop()
  return partes.length <= 2 ? partes.join(' ') : `${partes[0]} ${partes[partes.length - 1]}`
}
