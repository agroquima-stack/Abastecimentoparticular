export interface Veiculo {
  placa: string
  gerente: string
  filial: string
  modelo: string
  tipo: string
  ativo: boolean
}

export interface Parametros {
  precoDiesel: number
  kmLExigido: number
  atualizadoEm: string
}

export interface ParametroHistorico {
  precoDiesel: number
  kmLExigido: number
  criadoEm: string
}

export interface Semana {
  dataInicio: string // YYYY-MM-DD
  dataFim: string
  precoDieselUsado: number
  kmLExigidoUsado: number
  importadoEm: string
  origemArquivo: string
}

export interface LocalComTempo {
  nome: string
  minutos: number
}

/** Detalhe de um dia do fim de semana: estatísticas do relatório de Rota (por veículo) + locais
 * visitados vindos do relatório de Paradas (ambos opcionais/parciais — nem toda semana tem os
 * dois arquivos importados). */
export interface DiaResumo {
  data: string // ISO
  odometro?: number
  kmPercorrido: number
  paradas?: number
  velMedia?: string
  velMaxima?: string
  horaSaida?: string
  horaChegada?: string
  tempoTrabalho?: string
  tempoDentroCerca?: string
  tempoAcimaVel?: string
  tempoMovimento?: string
  tempoParado?: string
  locais: LocalComTempo[]
}

export interface Lancamento {
  placa: string
  gerente: string
  filial: string
  kmRodado: number
  usoEmpresa: boolean
  valorPago: number | null
  dataPagamento: string | null
  observacao: string
  valorDevidoCalc: number
  dias?: DiaResumo[]
}

export type ComId<T> = T & { id: string }
