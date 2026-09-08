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

export interface Lancamento {
  placa: string
  gerente: string
  filial: string
  kmRodado: number
  usoEmpresa: boolean
  valorComprovante: number | null
  valorPago: number | null
  dataPagamento: string | null
  observacao: string
  valorDevidoCalc: number
}

export type ComId<T> = T & { id: string }
