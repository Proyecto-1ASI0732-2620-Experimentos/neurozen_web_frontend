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
import { toApiDateTime, toDate, toLocalISODate, toLocalTime } from '../utils/date.js'

export const DEFAULT_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00']

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
    dateTime: when,
    date: when ? toLocalISODate(when) : '',
    time: when ? toLocalTime(when) : '',
    duration: Number(raw.duration ?? raw.estimatedDurationMinutes) || 60,
    status: String(raw.status || 'scheduled').toLowerCase(),
    type: raw.appointmentType ?? raw.type,
    notes: raw.notasAdicionales || raw.notes || ''
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

  async bookAppointment(payload) {
    const response = await this.httpClient.post('/api/v1/appointments', payload)
    return HttpClient.extractData(response) || {}
  }

  /**
   * Horarios disponibles. Si el backend no expone el endpoint, se usan horarios
   * por defecto descartando las horas ya pasadas cuando la fecha es hoy.
   */
  async getAvailableSlots(therapistId, date) {
    let slots
    try {
      const response = await this.httpClient.get(
        `/api/v1/professionals/${encodeURIComponent(therapistId)}/available-slots?date=${encodeURIComponent(date)}`
      )
      slots = HttpClient.extractList(response).map((s) => (typeof s === 'string' ? s : s.time || s.startTime)).filter(Boolean)
    } catch {
      slots = DEFAULT_SLOTS
    }
    if (date === toLocalISODate()) {
      const now = toLocalTime()
      slots = slots.filter((s) => s > now)
    }
    return slots
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
