/**
 * Disponibilidad escrita como texto → horario estructurado { days, start, end } (A2).
 * Sin dependencias de servicios para poder usarse desde TherapistService sin importaciones circulares.
 */
const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DAY_ALIASES = [
  ['monday', ['lunes', 'lun', 'monday', 'mon']],
  ['tuesday', ['martes', 'mar', 'tuesday', 'tue']],
  ['wednesday', ['miercoles', 'mie', 'wednesday', 'wed']],
  ['thursday', ['jueves', 'jue', 'thursday', 'thu']],
  ['friday', ['viernes', 'vie', 'friday', 'fri']],
  ['saturday', ['sabado', 'sab', 'saturday', 'sat']],
  ['sunday', ['domingo', 'dom', 'sunday', 'sun']]
]

function dayFromToken(token) {
  const found = DAY_ALIASES.find(([, names]) => names.includes(token))
  return found ? found[0] : null
}

function to24h(hour, minutes, meridiem) {
  let h = Number(hour)
  if (meridiem === 'pm' && h < 12) h += 12
  if (meridiem === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(minutes || '00').padStart(2, '0')}`
}

/**
 * Interpreta la disponibilidad en TEXTO que tienen algunos perfiles (el propio frontend la guarda como
 * «Lun, Mié · 09:00 - 13:00»; perfiles antiguos usan «Lunes a Viernes, 9 AM - 6 PM» o «Lun-Vie: 9:00-17:00»).
 * Devuelve { days, start, end } o null si el texto no es interpretable con seguridad (no se adivina).
 */
export function parseAvailabilityText(text) {
  if (!text || typeof text !== 'string') return null
  // Espacios colapsados a uno solo y sin espacios alrededor de los guiones: así la expresión siguiente no tiene
  // cuantificadores contiguos (sin retroceso super-lineal)
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').replace(/ ?[-–] ?/g, '-')
  const tm = /(\d{1,2})(?::(\d{2}))? ?(am|pm)?(?:-| a | to )(\d{1,2})(?::(\d{2}))? ?(am|pm)?/.exec(t)
  if (!tm) return null
  const start = to24h(tm[1], tm[2], tm[3])
  const end = to24h(tm[4], tm[5], tm[6])
  if (end <= start) return null
  const dayPart = t.slice(0, tm.index)
  const tokens = dayPart.split(/[^a-z]+/).filter(Boolean)
  const days = new Set()
  for (let i = 0; i < tokens.length; i++) {
    const day = dayFromToken(tokens[i])
    if (!day) continue
    const isRange = ['a', 'to'].includes(tokens[i + 1]) && dayFromToken(tokens[i + 2])
    // Los guiones ya vienen sin espacios ("lun-vie"): basta una comparación de texto (sin RegExp dinámica)
    const dashRange = !!tokens[i + 1] && dayPart.includes(`${tokens[i]}-${tokens[i + 1]}`) && dayFromToken(tokens[i + 1])
    if (isRange || dashRange) {
      const endDay = isRange ? dayFromToken(tokens[i + 2]) : dayFromToken(tokens[i + 1])
      const a = WEEK_DAYS.indexOf(day)
      const b = WEEK_DAYS.indexOf(endDay)
      if (a <= b) WEEK_DAYS.slice(a, b + 1).forEach((d) => days.add(d))
      i += isRange ? 2 : 1
    } else {
      days.add(day)
    }
  }
  if (!days.size) return null
  return { days: WEEK_DAYS.filter((d) => days.has(d)), start, end }
}
