import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Logo } from './Logo'

export function AuthGate({ children }: { children: ReactNode }) {
  const { usuario, carregando, modoLocal, entrarComEmailSenha } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  if (modoLocal) return <>{children}</>

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-950 text-sm text-base-400">
        Carregando…
      </div>
    )
  }

  if (!usuario) {
    async function onSubmit(e: FormEvent) {
      e.preventDefault()
      setErro(null)
      setEntrando(true)
      try {
        await entrarComEmailSenha(email, senha)
      } catch {
        setErro('E-mail ou senha incorretos.')
      } finally {
        setEntrando(false)
      }
    }

    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-base-950 px-4">
        <div className="relative flex flex-col items-center gap-6">
          <Logo className="agq-logo-adaptive h-20 w-auto" />
          <div className="w-full max-w-sm rounded-xl border border-base-700 bg-base-900/85 p-6 text-center shadow-2xl">
            <h1 className="text-lg font-semibold text-base-50">Abastecimento Particular — Gerentes</h1>
            <p className="mt-1 text-sm text-base-400">Este sistema contém dados internos da empresa. Faça login pra continuar.</p>
            <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 text-left">
              <div>
                <label className="mb-1 block text-xs text-base-400">E-mail</label>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-base-400">Senha</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 outline-none focus:border-brand-400"
                />
              </div>
              <button
                type="submit"
                disabled={entrando}
                className="mt-1 w-full rounded-lg border border-brand-500/40 bg-brand-700/20 px-4 py-2.5 text-sm font-medium text-brand-200 hover:bg-brand-700/30 disabled:opacity-60"
              >
                {entrando ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
            {erro && <p className="mt-3 text-xs text-crit-400">{erro}</p>}
            <p className="mt-4 text-[11px] text-base-500">Acesso só por convite — fale com o administrador pra ter sua conta criada.</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
