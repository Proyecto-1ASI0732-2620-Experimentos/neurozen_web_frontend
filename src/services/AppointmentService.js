/**
 * AppointmentService - Citas con profesionales.
 *
 * Contrato del backend (POST /api/v1/appointments):
 *   { patientId, professionalId, appointmentDateTime (ISO UTC), appointmentType (1|2|3), notasAdicionales }
 * Ahora TODAS las pantallas de reserva usan buildPayload() (antes BookAppointment
 * enviaba otro formato con userId fijo en 1).
 *
 * @version 2.0.0
 */
import { HttpClient } from './HttpClient.js'
import { toApiDateTime, toDate, toLocalISODate, toLocalTime, parseLocalDate } from '../utils/date.js'

/*
 * Disponibilidad (A2)
 * -------------------
 * Fuentes REALES que usa el frontend:
 *  1. `availabilitySchedule` { days: ['monday', …], start: 'HH:mm', end: 'HH:mm' } del perfil del profesional
 *     (GET /api/v1/professionals y /professionals/{id}). El backend lo exige al guardar el perfil.
 *     Con él se sabe qué DÍAS de la semana atiende.
 *  2. GET /api/v1/professionals/{id}/available-slots?date=YYYY-MM-DD → horas libres de un día concreto
 *     (si el backend lo expone, descuenta las citas ya tomadas).
 * Si (2) no responde, las horas se derivan del horario publicado (1) y la interfaz lo indica: el profesional
 * confirma la cita (estado pendiente → confirmada) y el backend rechaza una hora ocupada.
 * Ya NO se inventan horarios fijos (antes DEFAULT_SLOTS 09:00-17:00 para cualquier profesional y día).
 *  3. GET /api/v1/appointments/availability?professionalId=&startDate=&endDate= (backend revisado, máx. 92 días):
 *     horas libres de todos los días del mes visible + nextAvailableDate. Si no responde (backend anterior o
 *     modo demo), el calendario usa (1) y (2).
 */

/** Ventana de reserva que ofrece la interfaz (días desde hoy). Regla de UX, ajustable. */
export const BOOKING_WINDOW_DAYS = 90

/** Claves de día en el orden de Date#getDay() */
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ''))
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}
const fromMinutes = (total) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

/** true si el horario tiene días y horas válidos */
export function hasSchedule(schedule) {
  const start = toMinutes(schedule?.start)
  const end = toMinutes(schedule?.end)
  return Array.isArray(schedule?.days) && schedule.days.length > 0 && start != null && end != null && end > start
}

/** ¿El profesional atiende ese día de la semana según su horario publicado? */
export function isScheduledDay(isoDate, schedule) {
  if (!hasSchedule(schedule)) return false
  const date = parseLocalDate(isoDate)
  return !!date && schedule.days.map((d) => String(d).toLowerCase()).includes(DAY_KEYS[date.getDay()])
}

/** Rango permitido para reservar: hoy … hoy + BOOKING_WINDOW_DAYS */
export function bookingRange(today = new Date()) {
  const max = new Date(today.getFullYear(), today.getMonth(), today.getDate() + BOOKING_WINDOW_DAYS)
  return { min: toLocalISODate(today), max: toLocalISODate(max) }
}

/** Horas de inicio cada `duration` minutos dentro del horario publicado (la última termina antes del cierre) */
export function slotsFromSchedule(schedule, duration = 60) {
  if (!hasSchedule(schedule)) return []
  const step = Math.max(15, Number(duration) || 60)
  const slots = []
  for (let t = toMinutes(schedule.start); t + step <= toMinutes(schedule.end); t += step) slots.push(fromMinutes(t))
  return slots
}

/**
 * Próxima fecha (posterior a `fromIso`) en la que el profesional atiende, dentro del rango permitido.
 * `unavailable`: días ya consultados que no tienen horas libres. Devuelve 'YYYY-MM-DD' o null.
 */
export function nextAvailableDate(fromIso, schedule, { range = bookingRange(), unavailable = new Set() } = {}) {
  if (!hasSchedule(schedule)) return null
  let cursor
  if (fromIso) {
    const from = parseLocalDate(fromIso)
    if (!from) return null
    cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1)
  }
  const min = parseLocalDate(range.min)
  if (!cursor || cursor < min) cursor = min
  for (let i = 0; i <= BOOKING_WINDOW_DAYS + 1; i++) {
    const iso = toLocalISODate(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i))
    if (iso > range.max) return null
    if (isScheduledDay(iso, schedule) && !unavailable.has(iso)) return iso
  }
  return null
}

/** Quita las horas que ya pasaron cuando la fecha es hoy */
function dropPastSlots(slots, date) {
  if (date !== toLocalISODate()) return slots
  const now = toLocalTime()
  return slots.filter((s) => s > now)
}

/** Tipos por defecto con los mismos valores numéricos que espera el backend */
export const DEFAULT_APPOINTMENT_TYPES = [
  { id: 1, key: 'therapy', name: 'Terapia Individual', duration: 60, icon: 'fas fa-user' },
  { id: 2, key: 'consultation', name: 'Consulta Inicial', duration: 45, icon: 'fas fa-clipboard-list' },
  { id: 3, key: 'followUp', name: 'Seguimiento', duration: 30, icon: 'fas fa-chart-line' }
]

const TYPE_ICONS = { 1: 'fas fa-user', 2: 'fas fa-clipboard-list', 3: 'fas fa-chart-line' }

export function normalizeAppointmentType(raw = {}) {
  const id = Number(raw.value ?? raw.id)
  const fallback = DEFAULT_APPOINTMENT_TYPES.find((t) => t.id === id)
  return {
    id: Number.isNaN(id) ? raw.value ?? raw.id : id,
    key: fallback?.key,
    name: raw.displayName || raw.name || fallback?.name || '',
    description: raw.description || '',
    duration: Number(raw.estimatedDurationMinutes ?? raw.duration) || fallback?.duration || 60,
    icon: TYPE_ICONS[id] || 'fas fa-calendar'
  }
}

export function normalizeAppointment(raw = {}) {
  const when = toDate(raw.appointmentDateTime || raw.scheduledAt) ||
    (raw.date ? toDate(`${raw.date}T${raw.time || '00:00'}:00`) : null)
  return {
    id: raw.id ?? raw.appointmentId,
    professionalId: raw.professionalId ?? raw.professional?.id,
    patientId: raw.patientId ?? raw.userId,
    patientName: raw.patientName || raw.patient?.fullName || raw.patient?.name || '',
    patientEmail: raw.patientEmail || raw.patient?.email || '',
    dateTime: when,
    date: when ? toLocalISODate(when) : '',
    time: when ? toLocalTime(when) : '',
    duration: Number(raw.duration ?? raw.estimatedDurationMinutes) || 60,
    status: String(raw.status || 'scheduled').toLowerCase(),
    type: raw.appointmentType ?? raw.type,
    notes: raw.notasAdicionales || raw.notes || '',
    reviewed: !!raw.reviewed
  }
}

export class AppointmentService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  buildPayload({ patientId, professionalId, date, time, appointmentType, notes = '' }) {
    const asNumber = (v) => (v !== null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : v)
    return {
      patientId: asNumber(patientId),
      professionalId: asNumber(professionalId),
      appointmentDateTime: toApiDateTime(date, time),
      appointmentType: asNumber(appointmentType),
      notasAdicionales: notes.trim()
    }
  }

  async getAppointments(patientId) {
    const response = await this.httpClient.get(`/api/v1/appointments?patientId=${encodeURIComponent(patientId)}`)
    return HttpClient.extractList(response)
      .map(normalizeAppointment)
      .filter((a) => a.patientId == null || String(a.patientId) === String(patientId))
      .sort((a, b) => (a.dateTime || 0) - (b.dateTime || 0))
  }

  async getAppointment(appointmentId) {
    const response = await this.httpClient.get(`/api/v1/appointments/${encodeURIComponent(appointmentId)}`)
    return normalizeAppointment(HttpClient.extractData(response))
  }

  /** El paciente cancela su cita: PATCH /api/v1/appointments/{id}/status { status: 'CANCELLED' } */
  async cancelAppointment(appointmentId) {
    const response = await this.httpClient.patch(`/api/v1/appointments/${encodeURIComponent(appointmentId)}/status`, { status: 'CANCELLED' })
    return HttpClient.extractData(response)
  }

  async bookAppointment(payload) {
    const response = await this.httpClient.post('/api/v1/appointments', payload)
    return HttpClient.extractData(response) || {}
  }

  /**
   * Horas libres de un día. Devuelve { slots, source }:
   *  - source 'api': respuesta de GET /professionals/{id}/available-slots (autoritativa).
   *  - source 'schedule': el endpoint no respondió; horas derivadas del horario publicado del profesional.
   *  - source 'none': sin endpoint ni horario publicado → no se ofrecen horas (nunca se inventan).
   */
  async getSlotsForDate(therapistId, date, schedule = null, duration = 60) {
    try {
      const response = await this.httpClient.get(
        `/api/v1/professionals/${encodeURIComponent(therapistId)}/available-slots?date=${encodeURIComponent(date)}`
      )
      const slots = HttpClient.extractList(response)
        .map((s) => (typeof s === 'string' ? s : s && (s.time || s.startTime)))
        .filter((s) => typeof s === 'string' && /^\d{1,2}:\d{2}/.test(s))
        .map((s) => s.slice(0, 5))
      return { slots: dropPastSlots([...new Set(slots)].sort(), date), source: 'api' }
    } catch (error) {
      if (error && [401, 403].includes(error.status)) throw error
      if (!isScheduledDay(date, schedule)) return { slots: [], source: hasSchedule(schedule) ? 'schedule' : 'none' }
      return { slots: dropPastSlots(slotsFromSchedule(schedule, duration), date), source: 'schedule' }
    }
  }

  /**
   * Disponibilidad de un rango (calendario mensual). Devuelve { days: { 'YYYY-MM-DD': ['09:00', …] },
   * nextAvailableDate, timeZone } o null si el endpoint no está disponible (se usa entonces el horario publicado).
   */
  async getAvailabilityRange(professionalId, startDate, endDate) {
    try {
      const query = `professionalId=${encodeURIComponent(professionalId)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      const data = HttpClient.extractData(await this.httpClient.get(`/api/v1/appointments/availability?${query}`))
      if (!data || !Array.isArray(data.days)) return null
      const days = {}
      data.days.forEach((d) => {
        if (d && typeof d.date === 'string') {
          const slots = Array.isArray(d.slots) ? d.slots.filter((s) => typeof s === 'string').map((s) => s.slice(0, 5)) : []
          days[d.date.slice(0, 10)] = dropPastSlots(slots, d.date.slice(0, 10))
        }
      })
      return { days, nextAvailableDate: typeof data.nextAvailableDate === 'string' ? data.nextAvailableDate.slice(0, 10) : null, timeZone: data.timeZone || null }
    } catch (error) {
      if (error && error.status === 401) throw error
      return null
    }
  }

  /** Compatibilidad: solo la lista de horas */
  async getAvailableSlots(therapistId, date, schedule = null, duration = 60) {
    return (await this.getSlotsForDate(therapistId, date, schedule, duration)).slots
  }

  async getAppointmentTypes() {
    try {
      const response = await this.httpClient.get('/api/v1/appointments/types')
      const list = HttpClient.extractList(response).map(normalizeAppointmentType)
      return list.length ? list : DEFAULT_APPOINTMENT_TYPES
    } catch {
      return DEFAULT_APPOINTMENT_TYPES
    }
  }
}
