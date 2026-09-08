import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { Logo } from './Logo'
import { useAuth } from '../hooks/useAuth'

const ITENS_NAV = [
  { to: '/', label: 'Dashboard', icone: '📊' },
  { to: '/importar', label: 'Importar semana', icone: '⬆️' },
  { to: '/lancamentos', label: 'Lançamentos', icone: '📝' },
  { to: '/conta-corrente', label: 'Conta corrente', icone: '💰' },
  { to: '/grade-placas', label: 'Grade de placas', icone: '🚙' },
  { to: '/cadastro', label: 'Cadastro', icone: '👥' },
  { to: '/parametros', label: 'Parâmetros', icone: '⚙️' },
]

export function Layout({ children }: { children: ReactNode }) {
  const { usuario, modoLocal, sair } = useAuth()
  return (
    <div className="flex min-h-screen bg-base-950 text-base-100">
      <aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-base-800/60 bg-base-900/40 p-4">
        <div className="mb-4 flex items-center gap-2 px-1">
          <Logo className="agq-logo-adaptive h-8" />
        </div>
        <span className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-base-500">
          Abastecimento particular
        </span>
        <nav className="flex flex-col gap-0.5">
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
        <div className="mt-auto flex flex-col gap-1 border-t border-base-800/60 pt-3 text-xs text-base-500">
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
