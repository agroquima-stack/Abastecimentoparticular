import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Config pública do projeto Firebase — não é segredo (fica exposta no bundle de qualquer app
// Firebase, isso é esperado). A proteção real dos dados vem das regras do Firestore (exigem
// `request.auth != null`), não do sigilo dessas chaves. Valores vêm de variáveis de ambiente
// (.env.local, fora do Git) pra não hardcodar o projeto de produção no código-fonte.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** true quando o .env.local foi preenchido com um projeto Firebase real. Sem isso configurado,
 * o app roda em "modo local" (sem login, dados salvos só no navegador via localStorage). */
export const FIREBASE_CONFIGURADO = Boolean(firebaseConfig.apiKey)

export const firebaseApp = FIREBASE_CONFIGURADO ? initializeApp(firebaseConfig) : null
export const auth = firebaseApp ? getAuth(firebaseApp) : null
export const firestore = firebaseApp ? getFirestore(firebaseApp) : null
