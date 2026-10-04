/** Validaciones de formulario reutilizables (solo UX; el backend valida de nuevo). */

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim())

/** Teléfono: 7-15 dígitos, admite +, espacios, guiones y paréntesis */
export const isPhone = (v) => {
  const digits = String(v || '').replace(/\D/g, '')
  return /^[+\d\s()-]+$/.test(String(v || '').trim()) && digits.length >= 7 && digits.length <= 15
}

/** Algoritmo de Luhn para números de tarjeta */
export function isCardNumber(v) {
  const digits = String(v || '').replace(/\s/g, '')
  if (!/^\d{13,19}$/.test(digits)) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i])
    if (double) { n *= 2; if (n > 9) n -= 9 }
    sum += n
    double = !double
  }
  return sum % 10 === 0
}

/** Vencimiento MM/AA no caducado */
export function isFutureExpiry(v) {
  const m = /^(\d{2})\/(\d{2})$/.exec(String(v || ''))
  if (!m) return false
  const month = Number(m[1])
  const year = 2000 + Number(m[2])
  if (month < 1 || month > 12) return false
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)
  return endOfMonth >= new Date()
}

export const isCvv = (v) => /^\d{3,4}$/.test(String(v || ''))

export const minLength = (v, n) => String(v || '').trim().length >= n
