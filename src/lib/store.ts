import {
  collection,
  deleteDoc as fsDeleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc as fsSetDoc,
  updateDoc as fsUpdateDoc,
} from 'firebase/firestore'
import { FIREBASE_CONFIGURADO, firestore } from './firebase'

/**
 * Camada de dados única (Firestore em produção, localStorage em modo local sem Firebase
 * configurado) para não duplicar lógica de tela. Toda coleção/subcoleção é endereçada por um
 * `path` tipo "veiculos" ou "semanas/2026-09-05/lancamentos".
 */

type Ouvinte = (itens: Record<string, unknown>[]) => void

const CHAVE_LOCAL = 'abastecimento-gerentes-db-v1'
let memoria: Record<string, Record<string, Record<string, unknown>>> = carregarLocal()
const ouvintesPorPath = new Map<string, Set<Ouvinte>>()

function carregarLocal(): Record<string, Record<string, Record<string, unknown>>> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '{}')
  } catch {
    return {}
  }
}

function persistirLocal() {
  localStorage.setItem(CHAVE_LOCAL, JSON.stringify(memoria))
}

function notificarLocal(path: string) {
  const registros = memoria[path] || {}
  const itens = Object.entries(registros).map(([id, dados]) => ({ id, ...dados }))
  ouvintesPorPath.get(path)?.forEach((cb) => cb(itens))
}

export function observarColecao<T extends object>(
  path: string,
  cb: (itens: (T & { id: string })[]) => void,
): () => void {
  if (FIREBASE_CONFIGURADO && firestore) {
    const db = firestore
    return onSnapshot(collection(db, path), (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) })))
    })
  }
  if (!ouvintesPorPath.has(path)) ouvintesPorPath.set(path, new Set())
  const set = ouvintesPorPath.get(path)!
  const listener = cb as Ouvinte
  set.add(listener)
  // dispara valor inicial de forma assíncrona pra imitar comportamento do onSnapshot
  queueMicrotask(() => notificarLocal(path))
  return () => set.delete(listener)
}

/** Firestore recusa campos com valor `undefined` — o JSON round-trip remove essas chaves (mesmo
 * efeito que `JSON.stringify` já teria no localStorage, então o comportamento fica igual nos
 * dois modos). */
function semUndefined<T>(dados: T): T {
  return JSON.parse(JSON.stringify(dados))
}

export async function gravarDoc<T extends object>(path: string, id: string, dados: T): Promise<void> {
  if (FIREBASE_CONFIGURADO && firestore) {
    await fsSetDoc(doc(firestore, path, id), semUndefined(dados) as Record<string, unknown>)
    return
  }
  memoria[path] = memoria[path] || {}
  memoria[path][id] = dados as Record<string, unknown>
  persistirLocal()
  notificarLocal(path)
}

export async function atualizarDoc(path: string, id: string, patch: Record<string, unknown>): Promise<void> {
  if (FIREBASE_CONFIGURADO && firestore) {
    await fsUpdateDoc(doc(firestore, path, id), semUndefined(patch))
    return
  }
  memoria[path] = memoria[path] || {}
  memoria[path][id] = { ...(memoria[path][id] || {}), ...patch }
  persistirLocal()
  notificarLocal(path)
}

export async function removerDoc(path: string, id: string): Promise<void> {
  if (FIREBASE_CONFIGURADO && firestore) {
    await fsDeleteDoc(doc(firestore, path, id))
    return
  }
  delete memoria[path]?.[id]
  persistirLocal()
  notificarLocal(path)
}

/** Apaga todos os docs de uma coleção/subcoleção (Firestore não apaga subcoleção sozinho ao
 * apagar o doc pai). */
export async function removerColecao(path: string): Promise<void> {
  if (FIREBASE_CONFIGURADO && firestore) {
    const db = firestore
    const snap = await getDocs(collection(db, path))
    await Promise.all(snap.docs.map((d) => fsDeleteDoc(d.ref)))
    return
  }
  delete memoria[path]
  persistirLocal()
  notificarLocal(path)
}

/** Grava vários docs da mesma coleção de uma vez (usado na importação semanal). */
export async function gravarLote<T extends object>(path: string, itens: Record<string, T>): Promise<void> {
  if (FIREBASE_CONFIGURADO && firestore) {
    const db = firestore
    await Promise.all(Object.entries(itens).map(([id, dados]) => fsSetDoc(doc(db, path, id), semUndefined(dados) as Record<string, unknown>)))
    return
  }
  memoria[path] = { ...(memoria[path] || {}), ...(itens as Record<string, Record<string, unknown>>) }
  persistirLocal()
  notificarLocal(path)
}
