import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { AuthGate } from './components/AuthGate'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { ImportarSemana } from './pages/ImportarSemana'
import { LancamentosSemana } from './pages/LancamentosSemana'
import { ContaCorrente } from './pages/ContaCorrente'
import { CadastroVeiculos } from './pages/CadastroVeiculos'
import { Parametros } from './pages/Parametros'
import { GradePlacas } from './pages/GradePlacas'

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/importar" element={<ImportarSemana />} />
              <Route path="/lancamentos" element={<LancamentosSemana />} />
              <Route path="/conta-corrente" element={<ContaCorrente />} />
              <Route path="/grade-placas" element={<GradePlacas />} />
              <Route path="/cadastro" element={<CadastroVeiculos />} />
              <Route path="/parametros" element={<Parametros />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthGate>
    </AuthProvider>
  )
}
