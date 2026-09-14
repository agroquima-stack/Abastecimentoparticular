import type { Lancamento } from '../types/models'

/**
 * Regra de reembolso definida com o usuário (set/2026): valor devido = (km rodado no fim de
 * semana / km por litro exigido do veículo) * preço médio do diesel vigente. Km de dias
 * marcados como "uso empresa" não entra nessa conta — ver `kmEfetivo`.
 */
export function calcularValorDevido(kmRodado: number, kmLExigido: number, precoDiesel: number): number {
  if (!kmRodado || kmLExigido <= 0) return 0
  const litros = kmRodado / kmLExigido
  return Math.round(litros * precoDiesel * 100) / 100
}

/** Datas (ISO) do fim de semana marcadas como uso empresa — dá suporte a zerar só um dia
 * específico (ex.: sábado uso empresa, domingo particular). Registros antigos (de antes desse
 * controle por dia existir) só tinham a flag `usoEmpresa` pra semana inteira; nesse caso, se
 * ainda não foi editado no controle por dia, todos os dias contam como uso empresa. */
export function diasUsoEmpresaEfetivos(l: Pick<Lancamento, 'usoEmpresa' | 'diasUsoEmpresa' | 'dias'>): Set<string> {
  if (l.diasUsoEmpresa) return new Set(l.diasUsoEmpresa)
  if (l.usoEmpresa) return new Set((l.dias ?? []).map((d) => d.data))
  return new Set()
}

/** Km que efetivamente conta pro reembolso: soma o km de cada dia do fim de semana, exceto os
 * marcados como uso empresa. Sem detalhe por dia (semana antiga sem `dias`), cai no
 * comportamento antigo — tudo ou nada pela flag `usoEmpresa`. */
export function kmEfetivo(l: Pick<Lancamento, 'kmRodado' | 'usoEmpresa' | 'diasUsoEmpresa' | 'dias'>): number {
  if (!l.dias || l.dias.length === 0) return l.usoEmpresa ? 0 : l.kmRodado
  const excluidos = diasUsoEmpresaEfetivos(l)
  return l.dias.reduce((acc, d) => acc + (excluidos.has(d.data) ? 0 : d.kmPercorrido), 0)
}

/** Tolerância combinada com o usuário (set/2026): gerente que abastece um pouco menos que o
 * valor apurado (até 10% a menos) ainda é considerado "em dia" — não precisa bater 100% pra
 * fechar a semana. */
export const TOLERANCIA_REEMBOLSO = 0.1

export function dentroDaTolerancia(valorPago: number, valorDevido: number): boolean {
  if (valorDevido <= 0) return true
  return valorPago >= valorDevido * (1 - TOLERANCIA_REEMBOLSO)
}

/** % do valor apurado que o gerente efetivamente abasteceu/reembolsou. null quando não há valor
 * devido pra comparar (sem base). */
export function percentualApurado(valorPago: number, valorDevido: number): number | null {
  if (valorDevido <= 0) return null
  return Math.round((valorPago / valorDevido) * 1000) / 10
}
