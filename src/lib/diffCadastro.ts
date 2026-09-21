import type { ComId, Veiculo } from '../types/models'
import type { ResultadoBase } from './parseBasePlacas'

export type TipoMudanca = 'troca' | 'novo' | 'dados' | 'saiu'

export interface Mudanca {
  tipo: TipoMudanca
  placa: string
  antes?: Veiculo
  depois?: Veiculo
  /** explicação curta mostrada na tela (ex.: função do condutor na base) */
  motivo?: string
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()

const textoFuncao = (f: string) => (f ? `função na base: ${f}` : 'função do condutor em branco na base')

/**
 * Compara o cadastro atual com a Base de Placas importada:
 * - troca: mesma placa, condutor diferente — o alerta principal. Vale também quando o novo
 *   condutor não tem função GERENTE (ou está em branco) na base: a troca é acusada e o motivo
 *   mostra a função, pra você decidir se aplica.
 * - novo: placa com condutor gerente que ainda não está no cadastro (ou estava desativada)
 * - dados: mesmo condutor, mas filial/modelo mudou
 * - saiu: placa ativa no cadastro cujo condutor continua o mesmo mas deixou de ser gerente, ou
 *   que não está mais ativa na base
 */
export function compararCadastro(atual: ComId<Veiculo>[], base: ResultadoBase): Mudanca[] {
  const mudancas: Mudanca[] = []
  const porPlacaAtual = new Map(atual.map((v) => [v.placa, v]))
  const placasGerentes = new Set(base.gerentes.map((b) => b.placa))

  for (const b of base.gerentes) {
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
    if (placasGerentes.has(a.placa)) continue
    const o = base.outros.get(a.placa)
    if (!a.ativo) {
      // Placa desativada no cadastro mas ativa na base com condutor: oferece reativar (foi o caso
      // da placa que trocou de condutor e ficou parada como inativa).
      if (o) {
        mudancas.push({
          tipo: 'novo',
          placa: a.placa,
          antes: a,
          depois: { placa: a.placa, gerente: o.condutor, filial: o.filial || a.filial, modelo: o.modelo || a.modelo, tipo: o.tipo || a.tipo, ativo: true },
          motivo: `estava inativa no cadastro; ${textoFuncao(o.funcao)}`,
        })
      }
      continue
    }
    if (o && norm(o.condutor) !== norm(a.gerente)) {
      mudancas.push({
        tipo: 'troca',
        placa: a.placa,
        antes: a,
        depois: { placa: a.placa, gerente: o.condutor, filial: o.filial || a.filial, modelo: o.modelo || a.modelo, tipo: o.tipo || a.tipo, ativo: true },
        motivo: textoFuncao(o.funcao),
      })
    } else {
      mudancas.push({
        tipo: 'saiu',
        placa: a.placa,
        antes: a,
        motivo: o ? textoFuncao(o.funcao) : 'placa não está ativa na base',
      })
    }
  }

  const ordem: Record<TipoMudanca, number> = { troca: 0, novo: 1, saiu: 2, dados: 3 }
  return mudancas.sort((x, y) => ordem[x.tipo] - ordem[y.tipo] || x.placa.localeCompare(y.placa))
}
