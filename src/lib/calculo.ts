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
