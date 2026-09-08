import logoCompletoUrl from '../assets/agroquima-logo.png'
import logoIconeUrl from '../assets/agroquima-icon.png'

interface LogoProps {
  className?: string
  monograma?: boolean
}

export function Logo({ className, monograma = false }: LogoProps) {
  return (
    <img
      src={monograma ? logoIconeUrl : logoCompletoUrl}
      alt="Agroquima"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  )
}
