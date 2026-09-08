import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { auth, FIREBASE_CONFIGURADO } from '../lib/firebase'

interface AuthState {
  usuario: User | null
  carregando: boolean
  modoLocal: boolean // true = Firebase não configurado (.env.local vazio) — login pulado, uso local/dev
  entrarComEmailSenha: (email: string, senha: string) => Promise<void>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [carregando, setCarregando] = useState(FIREBASE_CONFIGURADO)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (u) => {
      setUsuario(u)
      setCarregando(false)
    })
  }, [])

  // Só login por e-mail/senha, sem cadastro pelo app — a conta precisa ser criada manualmente pelo
  // administrador em Firebase Console > Authentication > Users.
  async function entrarComEmailSenha(email: string, senha: string) {
    if (!auth) return
    await signInWithEmailAndPassword(auth, email, senha)
  }

  async function sair() {
    if (!auth) return
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, modoLocal: !FIREBASE_CONFIGURADO, entrarComEmailSenha, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
