import { ArrowUpDown, Check, Clock } from 'lucide-react'
import { Chip } from './ui'

const ICONOS = { pendiente: Clock, retirado: Check, reembolsado: ArrowUpDown }
const TONOS = { pendiente: 'terracota', retirado: 'verde', reembolsado: 'beige' }

/** Fila de movimiento u orden: ícono de estado, textos, monto y chip. Entra escalonada con `i`. */
export default function Fila({ estado, titulo, detalle, monto, chip, onClick, i = 0 }) {
  const Icon = ICONOS[estado]
  const tono = TONOS[estado]
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} className={`fila entra ${onClick ? 'fila--link' : ''}`} style={{ '--i': i }} onClick={onClick}>
      <span className={`fila__icono tono-${tono}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="fila__texto">
        <strong>{titulo}</strong>
        <span>{detalle}</span>
      </span>
      <span className="fila__monto">
        <strong>{monto}</strong>
        <Chip tone={tono}>{chip}</Chip>
      </span>
    </Tag>
  )
}
