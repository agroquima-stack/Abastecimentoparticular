import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVeiculos } from '../hooks/useVeiculos'
import { useParametros } from '../hooks/useParametros'
import { useSemanas } from '../hooks/useSemanas'
import { useLancamentos } from '../hooks/useLancamentos'
import { parseRotaXls, type ResultadoParseRota } from '../lib/parseRota'
import { parseParadasXls, type ParadasPorVeiculo } from '../lib/parseParadas'
import { formatDataBR, formatKm } from '../lib/format'

export function ImportarSemana() {
  const navigate = useNavigate()
  const { veiculos } = useVeiculos()
  const { parametros } = useParametros()
  const { semanas, importarDeRota, excluirSemana } = useSemanas()
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  async function onExcluirSemana(id: string, periodo: string) {
    const ok = confirm(
      `Excluir a semana ${periodo}?\n\nIsso apaga TODOS os lançamentos dela (km, valores pagos, observações, "uso empresa", "não respondeu") e não dá pra desfazer.`,
    )
    if (!ok) return
    setExcluindoId(id)
    try {
      await excluirSemana(id)
    } finally {
      setExcluindoId(null)
    }
  }
  const inputRef = useRef<HTMLInputElement>(null)
  const inputParadasRef = useRef<HTMLInputElement>(null)

  const [nomeArquivo, setNomeArquivo] = useState('')
  const [resultado, setResultado] = useState<ResultadoParseRota | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)

  const [nomeArquivoParadas, setNomeArquivoParadas] = useState('')
  const [paradas, setParadas] = useState<ParadasPorVeiculo | null>(null)
  const [erroParadas, setErroParadas] = useState<string | null>(null)

  const semanaJaExiste = resultado ? semanas.some((s) => s.id === resultado.dataInicio) : false

  async function onArquivoSelecionado(file: File) {
    setErro(null)
    setResultado(null)
    setNomeArquivo(file.name)
    try {
      const r = await parseRotaXls(file)
      setResultado(r)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao ler o arquivo.')
    }
  }

  async function onArquivoParadasSelecionado(file: File) {
    setErroParadas(null)
    setParadas(null)
    setNomeArquivoParadas(file.name)
    try {
      const r = await parseParadasXls(file)
      setParadas(r)
    } catch (e) {
      setErroParadas(e instanceof Error ? e.message : 'Erro ao ler o arquivo.')
    }
  }

  const { lancamentos: existentesLista } = useLancamentos(resultado && semanaJaExiste ? resultado.dataInicio : null)

  async function confirmar() {
    if (!resultado) return
    setImportando(true)
    try {
      const existentes = Object.fromEntries(existentesLista.map((l) => [l.placa, l]))
      const semanaId = await importarDeRota(
        resultado,
        veiculos,
        parametros.precoDiesel,
        parametros.kmLExigido,
        nomeArquivo,
        existentes,
        paradas ?? undefined,
      )
      navigate(`/lancamentos?semana=${semanaId}`)
    } finally {
      setImportando(false)
    }
  }

  const placasCadastradas = new Set(veiculos.map((v) => v.placa))
  const linhasReconhecidas = resultado?.linhas.filter((l) => placasCadastradas.has(l.placa)) ?? []
  const linhasNaoReconhecidas = resultado?.linhas.filter((l) => !placasCadastradas.has(l.placa) && l.kmPercorrido > 0) ?? []
  const parametrosOk = parametros.precoDiesel > 0 && parametros.kmLExigido > 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-base-50">Importar semana</h1>
        <p className="text-sm text-base-400">
          Todo início de semana, exporte o relatório de <b>Rota</b> do rastreador (aba RESUMO) referente ao fim de
          semana anterior e importe aqui. O km percorrido de cada placa é lido automaticamente.
        </p>
      </div>

      {!parametrosOk && (
        <div className="rounded-lg border border-warn-600/40 bg-warn-bg px-4 py-3 text-sm text-warn-300">
          Preço do diesel ou km/l exigido ainda não configurados. Configure em <b>Parâmetros</b> antes de importar,
          senão o valor devido sairá zerado.
        </div>
      )}

      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-base-700 bg-base-900/40 p-10 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) onArquivoSelecionado(file)
        }}
      >
        <span className="text-3xl">⬆️</span>
        <p className="text-sm text-base-300">Arraste o arquivo .xls de Rota aqui, ou</p>
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-brand-500/40 bg-brand-700/20 px-4 py-2 text-sm font-medium text-brand-200 hover:bg-brand-700/30"
        >
          Selecionar arquivo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onArquivoSelecionado(file)
          }}
        />
        {nomeArquivo && <p className="mt-2 text-xs text-base-500">{nomeArquivo}</p>}
      </div>

      {erro && <div className="rounded-lg border border-crit-600/40 bg-crit-bg px-4 py-3 text-sm text-crit-400">{erro}</div>}

      {resultado && (
        <div className="rounded-xl border border-base-800/60 bg-base-900/60 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-base-200">
              Período: {formatDataBR(resultado.dataInicio)} a {formatDataBR(resultado.dataFim)}
            </h2>
            {semanaJaExiste && (
              <span className="rounded-full bg-warn-bg px-2 py-1 text-xs text-warn-300">
                Já existe uma semana importada nesse período — importar de novo atualiza o km e mantém os lançamentos já preenchidos.
              </span>
            )}
          </div>
          <p className="mb-2 text-xs text-base-500">
            {linhasReconhecidas.length} de {veiculos.length} veículos cadastrados encontrados no arquivo.
          </p>
          <div className="max-h-80 overflow-y-auto rounded-lg border border-base-800">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-base-900">
                <tr className="border-b border-base-800 text-left text-xs uppercase tracking-wide text-base-500">
                  <th className="px-3 py-2">Placa</th>
                  <th className="px-3 py-2">Gerente</th>
                  <th className="px-3 py-2 text-right">Km percorrido</th>
                </tr>
              </thead>
              <tbody>
                {veiculos.map((v) => {
                  const linha = resultado.linhas.find((l) => l.placa === v.placa)
                  return (
                    <tr key={v.placa} className="border-b border-base-800/60 last:border-0">
                      <td className="px-3 py-1.5 font-mono text-xs">{v.placa}</td>
                      <td className="px-3 py-1.5">{v.gerente}</td>
                      <td className="px-3 py-1.5 text-right">{linha ? formatKm(linha.kmPercorrido) : <span className="text-base-600">não encontrado</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {linhasNaoReconhecidas.length > 0 && (
            <p className="mt-2 text-xs text-base-500">
              Placas no arquivo sem cadastro: {linhasNaoReconhecidas.map((l) => l.placa).join(', ')}
            </p>
          )}

          <div className="mt-5 border-t border-base-800 pt-4">
            <h3 className="mb-1 text-sm font-semibold text-base-200">Relatório de Paradas (opcional)</h3>
            <p className="mb-2 text-xs text-base-500">
              Envie também o relatório de Paradas do mesmo período pra registrar as cidades/locais visitados por
              cada gerente no sábado e no domingo — ajuda a conferir se o uso foi mesmo particular.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => inputParadasRef.current?.click()}
                className="rounded-lg border border-base-700 bg-base-900 px-3 py-1.5 text-xs font-medium text-base-200 hover:bg-base-800"
              >
                Selecionar arquivo de Paradas
              </button>
              <input
                ref={inputParadasRef}
                type="file"
                accept=".xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onArquivoParadasSelecionado(file)
                }}
              />
              {nomeArquivoParadas && <span className="text-xs text-base-500">{nomeArquivoParadas}</span>}
            </div>
            {erroParadas && <p className="mt-2 text-xs text-crit-400">{erroParadas}</p>}
            {paradas && (
              <p className="mt-2 text-xs text-good-400">
                {paradas.size} veículo(s) com locais reconhecidos — serão salvos junto com esta semana.
              </p>
            )}
          </div>

          <button
            onClick={confirmar}
            disabled={importando}
            className="mt-4 w-full rounded-lg border border-brand-500/40 bg-brand-700/20 px-4 py-2.5 text-sm font-medium text-brand-200 hover:bg-brand-700/30 disabled:opacity-60"
          >
            {importando ? 'Importando…' : 'Confirmar importação'}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-base-800/60 bg-base-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold text-base-200">Semanas já importadas</h2>
        {semanas.length === 0 ? (
          <p className="text-sm text-base-500">Nenhuma semana importada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-800 text-left text-xs uppercase tracking-wide text-base-500">
                <th className="py-2 pr-3">Período</th>
                <th className="py-2 pr-3">Arquivo</th>
                <th className="py-2 pr-3">Importada em</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {semanas.map((s) => {
                const periodo = `${formatDataBR(s.dataInicio)} a ${formatDataBR(s.dataFim)}`
                return (
                  <tr key={s.id} className="border-b border-base-800/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">{periodo}</td>
                    <td className="py-2 pr-3 text-base-400">{s.origemArquivo}</td>
                    <td className="py-2 pr-3 text-base-400">{new Date(s.importadoEm).toLocaleString('pt-BR')}</td>
                    <td className="py-2 pr-3 text-right">
                      <button
                        onClick={() => onExcluirSemana(s.id, periodo)}
                        disabled={excluindoId === s.id}
                        className="text-xs text-crit-400 hover:underline disabled:opacity-50"
                      >
                        {excluindoId === s.id ? 'excluindo…' : 'excluir'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
