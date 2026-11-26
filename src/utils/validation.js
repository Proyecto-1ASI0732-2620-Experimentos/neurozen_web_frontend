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

/** Longitud mínima de la contraseña (PasswordPolicy del backend) */
export const PASSWORD_MIN_LENGTH = 8

/** Máximo de bytes UTF-8 (límite de BCrypt en PasswordPolicy del backend) */
export const PASSWORD_MAX_BYTES = 72

const utf8Length = (value) => new TextEncoder().encode(value).length

/**
 * Requisitos de la contraseña, uno por uno (checklist del registro, M6). Copia exacta de
 * PasswordPolicy.cs del backend: longitud ≥ 8 en unidades UTF-16 (string.Length), al menos una letra Unicode
 * (char.IsLetter → \p{L}), al menos un dígito decimal Unicode (char.IsDigit → \p{Nd}) y como máximo 72 bytes UTF-8.
 */
export function passwordChecks(v) {
  const value = String(v || '')
  return {
    length: value.length >= PASSWORD_MIN_LENGTH,
    letter: /\p{L}/u.test(value),
    number: /\p{Nd}/u.test(value),
    maxBytes: utf8Length(value) <= PASSWORD_MAX_BYTES
  }
}

/** Contraseña válida según la política del backend */
export const isStrongPassword = (v) => Object.values(passwordChecks(v)).every(Boolean)

/**
 * Número de colegiatura del CPsP. Acepta solo dígitos (3 a 6) o con el prefijo
 * habitual: "C.Ps.P. 12345", "CPsP 12345", "CN.PsP. 12345".
 */
export const isLicenseNumber = (v) =>
  /^(?:C\.?\s?N?\.?\s?Ps\.?\s?P\.?\s*)?\d{3,6}$/i.test(String(v || '').trim())

/** Deja solo el número de la colegiatura (para guardarlo y buscarlo en el CPsP) */
export const normalizeLicenseNumber = (v) => (String(v || '').match(/\d{3,6}$/) || [''])[0]

/* ------------------------------------------------------------------------------------------
 * Reglas del registro alineadas con el backend (SignUpResource / PersonName / Dni).
 * El backend es la autoridad final; aquí solo se adelanta el error al usuario.
 * ---------------------------------------------------------------------------------------- */

/** Máximo de caracteres del nombre completo (User.FullNameMaxLength en el backend) */
export const FULL_NAME_MAX_LENGTH = 120

/** Recorta y deja espacios simples: "  Ana   Torres " → "Ana Torres" (igual que el backend) */
export const normalizeFullName = (v) => String(v ?? '').trim().split(/\s+/).filter(Boolean).join(' ')

// Letras de cualquier alfabeto (tildes, ñ, ü...), marcas combinantes, espacio, ' ’ - .
const FULL_NAME_CHARS = /^[\p{L}\p{M} '’.-]+$/u

/**
 * Valida el nombre completo con las reglas del backend. Devuelve la clave del error
 * ('required' | 'fullName' | 'fullNameChars' | 'fullNameLength') o '' si es válido.
 */
export function fullNameError(v) {
  const name = normalizeFullName(v)
  if (!name) return 'required'
  if (name.length > FULL_NAME_MAX_LENGTH) return 'fullNameLength'
  if (!FULL_NAME_CHARS.test(name)) return 'fullNameChars'
  if (name.split(' ').length < 2 || !/\p{L}/u.test(name)) return 'fullName'
  return ''
}

/** Deja solo los dígitos ASCII 0-9 (también al pegar) y limita la longitud */
export const onlyDigits = (v, max = Infinity) => String(v ?? '').replace(/\D/g, '').slice(0, max)

export const DNI_LENGTH = 8

/** DNI peruano: exactamente 8 dígitos 0-9 (solo formato; no se consulta RENIEC) */
// En JavaScript \d equivale a [0-9] (sin la bandera u no incluye dígitos de otros alfabetos)
export const isDni = (v) => /^\d{8}$/.test(String(v ?? '').trim())

/** Clave del error del DNI ('dniRequired' | 'dniFormat') o '' si es válido */
export function dniError(v) {
  const dni = String(v ?? '').trim()
  if (!dni) return 'dniRequired'
  return isDni(dni) ? '' : 'dniFormat'
}

/** Colegiatura tal como la espera el backend: de 3 a 6 dígitos 0-9 */
export const isLicenseDigits = (v) => /^\d{3,6}$/.test(String(v ?? '').trim())

/** DNI enmascarado para mostrarlo en pantalla: "12345678" → "****5678" */
export const maskDni = (v) => {
  const dni = String(v ?? '').trim()
  return dni.length > 4 ? `${'*'.repeat(dni.length - 4)}${dni.slice(-4)}` : dni
}
