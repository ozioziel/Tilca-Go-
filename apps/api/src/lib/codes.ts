import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto'

// Sin 0/O ni 1/I/L para que el código se pueda dictar y leer sin confusiones
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function randomChars(n: number): string {
  let s = ''
  for (let i = 0; i < n; i++) s += ALPHABET[randomInt(ALPHABET.length)]
  return s
}

/** Código de retiro legible: TG-7K4-92Q. */
export function withdrawalCode(): string {
  return `TG-${randomChars(3)}-${randomChars(3)}`
}

export function pin(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export function otpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export function sessionToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Hash con pepper del servidor: en la base nunca queda el código en claro. */
export function hashSecret(value: string, pepper: string): string {
  return createHmac('sha256', pepper).update(value.trim().toUpperCase()).digest('hex')
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** order_id del contrato: 32 bytes derivados del id de la orden en la base. */
export function contractOrderId(orderUuid: string): string {
  return sha256Hex(`tilcago:order:${orderUuid}`)
}
