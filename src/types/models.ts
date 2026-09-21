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
  /** true = todos os dias do fim de semana são uso empresa (mantido por compatibilidade e pra
   * filtro rápido de status — sempre recalculado a partir de `diasUsoEmpresa` ao salvar). Pra
   * zerar só um dia específico (ex.: sábado uso empresa, domingo particular), use
   * `diasUsoEmpresa`. */
  usoEmpresa: boolean
  /** Datas (ISO, batendo com `dias[].data`) marcadas como uso empresa — só o km desses dias sai
   * do cálculo. Registros antigos (de antes desse campo existir) não têm isso preenchido; nesse
   * caso o dia inteiro segue a flag legada `usoEmpresa`. */
  diasUsoEmpresa?: string[]
  naoRespondeu: boolean
  valorPago: number | null
  dataPagamento: string | null
  observacao: string
  valorDevidoCalc: number
  dias?: DiaResumo[]
}

export type ComId<T> = T & { id: string }

/** Registro de mudança no cadastro vindo da importação da Base de Placas (troca de condutor etc.). */
export interface HistoricoVeiculo {
  placa: string
  tipo: 'troca' | 'novo' | 'dados' | 'saiu'
  gerenteAntes: string | null
  gerenteDepois: string | null
  data: string // ISO datetime
}
