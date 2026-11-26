/**
 * Presentación de datos de profesionales (M1/M2). Solo formatea datos reales: nunca rellena.
 */

/** Tarifa por sesión (USD, como se configura en el perfil del psicólogo) o null si no está definida */
export function formatFee(price, locale = 'es') {
  if (price == null || !(Number(price) > 0)) return null
  const n = Number(price)
  return `$${n.toLocaleString(locale === 'en' ? 'en-US' : 'es-PE', { maximumFractionDigits: 2 })}`
}

/** Especialidad traducida si es una de las claves del backend (clinical, organizational…); si no, el texto tal cual */
export function specialtyLabel(t, value) {
  if (!value) return ''
  const key = `specialties.${value}`
  const text = t(key)
  return text && text !== key ? text : value
}

/**
 * Filtro por rango de tarifa. Con un límite activo, los profesionales SIN tarifa definida no se incluyen
 * (null no equivale a 0). Límites vacíos o no numéricos no filtran.
 */
export function matchesFeeRange(price, min, max) {
  const toLimit = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v))
  const lo = toLimit(min)
  const hi = toLimit(max)
  if (lo == null && hi == null) return true
  if (price == null || !(Number(price) > 0)) return false
  return (lo == null || price >= lo) && (hi == null || price <= hi)
}
