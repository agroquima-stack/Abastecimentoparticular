import type { ComId, Veiculo } from '../types/models'

export type TipoMudanca = 'troca' | 'novo' | 'dados' | 'saiu'

export interface Mudanca {
  tipo: TipoMudanca
  placa: string
  antes?: Veiculo
  depois?: Veiculo
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()

/**
 * Compara o cadastro atual com a Base de Placas importada:
 * - troca: mesma placa, condutor (gerente) diferente — o alerta principal
 * - novo: placa que ainda não está no cadastro (ou estava desativada)
 * - dados: mesmo condutor, mas filial/modelo mudou
 * - saiu: placa ativa no cadastro que não tem mais condutor gerente ativo na base
 */
export function compararCadastro(atual: ComId<Veiculo>[], base: Veiculo[]): Mudanca[] {
  const mudancas: Mudanca[] = []
  const porPlacaAtual = new Map(atual.map((v) => [v.placa, v]))
  const placasBase = new Set(base.map((b) => b.placa))

  for (const b of base) {
    const a = porPlacaAtual.get(b.placa)
    if (!a || !a.ativo) {
      mudancas.push({ tipo: 'novo', placa: b.placa, antes: a, depois: b })
    } else if (norm(a.gerente) !== norm(b.gerente)) {
      mudancas.push({ tipo: 'troca', placa: b.placa, antes: a, depois: b })
    } else if (norm(a.filial) !== norm(b.filial) || norm(a.modelo) !== norm(b.modelo)) {
      mudancas.push({ tipo: 'dados', placa: b.placa, antes: a, depois: b })
    }
  }
  for (const a of atual) {
    if (a.ativo && !placasBase.has(a.placa)) mudancas.push({ tipo: 'saiu', placa: a.placa, antes: a })
  }

  const ordem: Record<TipoMudanca, number> = { troca: 0, novo: 1, saiu: 2, dados: 3 }
  return mudancas.sort((x, y) => ordem[x.tipo] - ordem[y.tipo] || x.placa.localeCompare(y.placa))
}
