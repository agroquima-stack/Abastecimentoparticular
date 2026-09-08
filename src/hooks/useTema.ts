import { useEffect, useState } from 'react'

type Tema = 'dark' | 'light'
const CHAVE_STORAGE = 'agq_tema'

function aplicarTema(tema: Tema) {
  if (tema === 'light') document.documentElement.setAttribute('data-theme', 'light')
  else document.documentElement.removeAttribute('data-theme')
}

export function useTema() {
  const [tema, setTemaState] = useState<Tema>(() => {
    const salvo = localStorage.getItem(CHAVE_STORAGE)
    return salvo === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    aplicarTema(tema)
  }, [tema])

  function alternarTema() {
    setTemaState((atual) => {
      const proximo = atual === 'dark' ? 'light' : 'dark'
      localStorage.setItem(CHAVE_STORAGE, proximo)
      return proximo
    })
  }

  return { tema, alternarTema }
}
