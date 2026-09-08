import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { Logo } from './Logo'
import { useAuth } from '../hooks/useAuth'
import { useTema } from '../hooks/useTema'

const ITENS_NAV = [
  { to: '/', label: 'Dashboard', icone: '📊' },
  { to: '/lancamentos', label: 'Lançamentos', icone: '📝' },
  { to: '/conta-corrente', label: 'Conta corrente', icone: '💰' },
  { to: '/grade-placas', label: 'Grade de placas', icone: '🚙' },
  { to: '/cadastro', label: 'Cadastro', icone: '👥' },
  { to: '/importar', label: 'Importar semana', icone: '⬆️' },
  { to: '/parametros', label: 'Parâmetros', icone: '⚙️' },
]

export function Layout({ children }: { children: ReactNode }) {
  const { usuario, modoLocal, sair } = useAuth()
  const { tema, alternarTema } = useTema()
  return (
    <div className="flex min-h-screen bg-base-950 text-base-100">
      <aside className="flex w-60 shrink-0 flex-col border-r border-base-800/60 bg-base-900/40">
        <div className="flex flex-col items-center gap-2 border-b border-base-800/60 px-5 py-5">
          <Logo className="agq-logo-adaptive h-16 w-auto" />
          <div className="text-[11px] text-base-400">Abastecimento particular</div>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {ITENS_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-brand-700/30 text-brand-300' : 'text-base-300 hover:bg-base-800/60 hover:text-base-100',
                )
              }
            >
              <span className="text-base">{item.icone}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-base-800/60 p-3 text-xs text-base-500">
          <button
            onClick={alternarTema}
            className="mb-1 flex w-full items-center justify-between rounded-md border border-base-700 px-2.5 py-1.5 text-[11px] text-base-300 hover:bg-base-800 hover:text-base-100"
          >
            <span>Tema {tema === 'dark' ? 'escuro' : 'claro'}</span>
            <span>{tema === 'dark' ? '🌙' : '☀️'}</span>
          </button>
          {modoLocal ? (
            <span className="rounded-md bg-warn-bg px-2 py-1 text-warn-300">Modo local (sem Firebase)</span>
          ) : (
            <>
              <span className="truncate px-1">{usuario?.email}</span>
              <button onClick={() => sair()} className="rounded-md px-2 py-1 text-left hover:bg-base-800/60">
                Sair
              </button>
            </>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden p-6">{children}</main>
    </div>
  )
}
