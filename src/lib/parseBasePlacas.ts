import * as XLSX from 'xlsx'
import type { Veiculo } from '../types/models'

const limpar = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()

/**
 * Lê a planilha "Base de Placas" do ERP (aba cadastroVeiculoXls) e devolve só os veículos ativos
 * cujo condutor tem função GERENTE — mesmo critério usado na carga inicial do cadastro.
 */
export async function parseBasePlacasXls(arquivo: File): Promise<Veiculo[]> {
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

  const resultado: Veiculo[] = []
  for (let i = 1; i < linhas.length; i++) {
    const r = linhas[i]
    if (!limpar(r[iFuncao]).toUpperCase().includes('GEREN')) continue
    if (iStatus !== -1 && limpar(r[iStatus]) !== 'Ativo') continue
    const placa = limpar(r[iPlaca]).replace(/\s+/g, '').toUpperCase()
    const gerente = limpar(r[iCondutor])
    if (!placa || !gerente || gerente === 'APOIO FROTAS') continue
    resultado.push({
      placa,
      gerente,
      filial: iSigla !== -1 ? limpar(r[iSigla]) : '',
      modelo: iModelo !== -1 ? limpar(r[iModelo]) : '',
      tipo: iTipo !== -1 ? limpar(r[iTipo]) : '',
      ativo: true,
    })
  }
  if (resultado.length === 0) throw new Error('Nenhum veículo com condutor GERENTE ativo encontrado na planilha.')
  return resultado
}
