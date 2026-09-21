import * as XLSX from 'xlsx'
import type { Veiculo } from '../types/models'

const limpar = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()

export interface OutroCondutor {
  placa: string
  condutor: string
  funcao: string
  filial: string
  modelo: string
  tipo: string
}

export interface ResultadoBase {
  /** veículos ativos cujo condutor tem função GERENTE — o critério do cadastro */
  gerentes: Veiculo[]
  /** demais veículos ativos da base (condutor sem função GERENTE ou sem função preenchida),
   * indexados por placa — usado pra acusar troca de condutor mesmo quando a função não vem. */
  outros: Map<string, OutroCondutor>
}

/**
 * Lê a planilha "Base de Placas" do ERP (aba cadastroVeiculoXls). Separa os veículos ativos cujo
 * condutor é GERENTE (base do cadastro) dos demais, que só servem pra detectar troca de condutor.
 */
export async function parseBasePlacasXls(arquivo: File): Promise<ResultadoBase> {
  const buffer = await arquivo.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const nomeAba = wb.SheetNames.find((n) => n.toLowerCase().includes('cadastroveiculo')) ?? wb.SheetNames[0]
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nomeAba], { header: 1, defval: '' })
  const header = (linhas[0] ?? []).map((c) => limpar(c).toUpperCase())
  const col = (nome: string) => header.indexOf(nome)
  const iPlaca = col('PLACA')
  const iCondutor = col('CONDUTOR')
  const iFuncao = col('FUNCAO CONDUTOR')
  const iModelo = col('MODELO')
  const iSigla = col('SIGLA')
  const iStatus = col('STATUS')
  const iTipo = col('TIPO')
  if (iPlaca === -1 || iCondutor === -1 || iFuncao === -1) {
    throw new Error('Colunas PLACA, CONDUTOR e FUNCAO CONDUTOR não encontradas — confira se é a planilha "Base de Placas".')
  }

  const gerentes: Veiculo[] = []
  const outros = new Map<string, OutroCondutor>()
  for (let i = 1; i < linhas.length; i++) {
    const r = linhas[i]
    if (iStatus !== -1 && limpar(r[iStatus]) !== 'Ativo') continue
    const placa = limpar(r[iPlaca]).replace(/\s+/g, '').toUpperCase()
    const condutor = limpar(r[iCondutor])
    if (!placa || !condutor || condutor === 'APOIO FROTAS') continue
    const funcao = limpar(r[iFuncao])
    const filial = iSigla !== -1 ? limpar(r[iSigla]) : ''
    const modelo = iModelo !== -1 ? limpar(r[iModelo]) : ''
    const tipo = iTipo !== -1 ? limpar(r[iTipo]) : ''
    if (funcao.toUpperCase().includes('GEREN')) {
      gerentes.push({ placa, gerente: condutor, filial, modelo, tipo, ativo: true })
    } else {
      outros.set(placa, { placa, condutor, funcao, filial, modelo, tipo })
    }
  }
  if (gerentes.length === 0 && outros.size === 0) throw new Error('Nenhum veículo ativo com condutor encontrado na planilha.')
  return { gerentes, outros }
}
