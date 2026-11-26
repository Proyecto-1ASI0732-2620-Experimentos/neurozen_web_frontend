/**
 * Textos seguros para la interfaz (A4).
 * Evita que valores técnicos como `null`, `undefined`, `NaN` o `[object Object]` lleguen a la pantalla
 * (por ejemplo, un `message: null` del backend convertido en texto, o un Error sin mensaje).
 */
const TECHNICAL = /^\s*(null|undefined|nan|\[object \w+\]|true|false)\s*$/i

/** Devuelve el texto si es legible; si no, '' */
export function cleanText(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value !== 'string') return ''
  const text = value.trim()
  if (!text || TECHNICAL.test(text)) return ''
  // Mensajes compuestos como "null: null" o "undefined undefined"
  if (text.split(/[\s:,.;-]+/).filter(Boolean).every((part) => TECHNICAL.test(part))) return ''
  return text
}

/** Mensaje legible de un error con un texto de respaldo (ya traducido) */
export function safeMessage(errorOrText, fallback = '') {
  const raw = errorOrText && typeof errorOrText === 'object' ? errorOrText.message : errorOrText
  return cleanText(raw) || fallback
}
