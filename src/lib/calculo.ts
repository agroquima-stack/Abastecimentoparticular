/**
 * Regra de reembolso definida com o usuário (set/2026): valor devido = (km rodado no fim de
 * semana / km por litro exigido do veículo) * preço médio do diesel vigente. Quando o gerente
 * marca "uso empresa" (estava a trabalho, não abastecimento particular), o km fica registrado
 * mas não gera valor devido nem entra na conta corrente.
 */
export function calcularValorDevido(kmRodado: number, usoEmpresa: boolean, kmLExigido: number, precoDiesel: number): number {
  if (usoEmpresa || !kmRodado || kmLExigido <= 0) return 0
  const litros = kmRodado / kmLExigido
  return Math.round(litros * precoDiesel * 100) / 100
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
