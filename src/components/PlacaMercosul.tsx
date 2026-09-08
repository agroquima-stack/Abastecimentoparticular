/** Réplica simplificada da placa padrão Mercosul (fundo branco, faixa azul superior com
 * bandeira do Mercosul + "BRASIL", faixa azul lateral com "BR", texto preto Mercosul-like). */
export function PlacaMercosul({ placa, className }: { placa: string; className?: string }) {
  const limpa = placa.replace(/\s+/g, '').toUpperCase()
  const letras = limpa.slice(0, 3)
  const resto = limpa.slice(3)

  return (
    <svg viewBox="0 0 400 130" className={className} role="img" aria-label={`Placa ${limpa}`}>
      <rect x="1" y="1" width="398" height="128" rx="14" fill="#ffffff" stroke="#1a1a1a" strokeWidth="3" />
      <rect x="1" y="1" width="398" height="30" rx="14" fill="#0033a0" />
      <rect x="1" y="18" width="398" height="13" fill="#0033a0" />
      {[...Array(12)].map((_, i) => (
        <circle key={i} cx={130 + i * 8} cy={10} r="1.6" fill="#ffd400" />
      ))}
      <text x="200" y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff" fontFamily="Arial, sans-serif" letterSpacing="1">
        BRASIL
      </text>
      <rect x="1" y="31" width="34" height="98" rx="0" fill="#0033a0" />
      <text x="18" y="70" textAnchor="middle" fontSize="14" fontWeight="700" fill="#ffd400" fontFamily="Arial, sans-serif">
        BR
      </text>
      <text
        x="215"
        y="98"
        textAnchor="middle"
        fontSize="58"
        fontWeight="700"
        fill="#111111"
        fontFamily="'Arial Narrow', Arial, sans-serif"
        letterSpacing="4"
      >
        {letras}
        {resto}
      </text>
    </svg>
  )
}
