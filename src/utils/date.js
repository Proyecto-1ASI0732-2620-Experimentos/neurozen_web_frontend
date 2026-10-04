/**
 * Utilidades de fecha/hora en zona horaria LOCAL.
 * Corrigen el uso de toISOString().split('T')[0], que devolvía la fecha UTC
 * (en Lima, después de las 19:00 aparecía el día siguiente) y de
 * `${fecha}T${hora}:00Z`, que enviaba la hora local marcada como UTC.
 */

const pad = (n) => String(n).padStart(2, '0')

/** Date -> 'YYYY-MM-DD' en hora local */
export function toLocalISODate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Date -> 'HH:mm' en hora local */
export function toLocalTime(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 'YYYY-MM-DD' -> Date a medianoche local (new Date('YYYY-MM-DD') sería UTC) */
export function parseLocalDate(isoDate) {
  if (!isoDate) return null
  const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/** Fecha y hora locales -> ISO 8601 en UTC correcto para la API */
export function toApiDateTime(isoDate, time = '00:00') {
  const base = parseLocalDate(isoDate)
  if (!base) return new Date().toISOString()
  const [h, min] = String(time).split(':').map(Number)
  base.setHours(h || 0, min || 0, 0, 0)
  return base.toISOString()
}

/** Valor ISO/Date -> Date válido o null */
export function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return isNaN(value) ? null : value
  // 'YYYY-MM-DD' sin hora se interpreta como fecha local
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return parseLocalDate(value)
  const d = new Date(value)
  return isNaN(d) ? null : d
}

export function formatLongDate(value, locale = 'es') {
  const d = toDate(value)
  if (!d) return ''
  const text = d.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatShortDate(value, locale = 'es') {
  const d = toDate(value)
  if (!d) return ''
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

/** 'HH:mm' -> '9:00 AM' (o '09:00' en español) */
export function formatClock(time, locale = 'es') {
  if (!time || !String(time).includes(':')) return time || ''
  const [h, m] = String(time).split(':').map(Number)
  const d = new Date()
  d.setHours(h || 0, m || 0, 0, 0)
  return d.toLocaleTimeString(locale === 'en' ? 'en-US' : 'es-ES', { hour: 'numeric', minute: '2-digit' })
}

/** Segundos -> 'm:ss' */
export function formatTimer(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0))
  return `${Math.floor(s / 60)}:${pad(s % 60)}`
}

/** Minutos -> '1 h 05 min' / '15 min' */
export function formatMinutes(minutes) {
  const m = Math.max(0, Math.round(minutes || 0))
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${pad(m % 60)} min`
}

/** Tiempo relativo simple ('hace 3 días') */
export function formatRelative(value, locale = 'es') {
  const d = toDate(value)
  if (!d) return ''
  const rtf = new Intl.RelativeTimeFormat(locale === 'en' ? 'en' : 'es', { numeric: 'auto' })
  const diffDays = Math.round((d - new Date()) / 86400000)
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day')
  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month')
  return rtf.format(Math.round(diffDays / 365), 'year')
}
