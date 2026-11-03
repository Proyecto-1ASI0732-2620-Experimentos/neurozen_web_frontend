/**
 * ProfessionalService - Portal del psicólogo.
 * Perfil profesional propio, citas recibidas y cambio de estado de las citas.
 *
 * Endpoints que usa (deben existir en el backend):
 *   GET   /api/v1/professionals/me
 *   PUT   /api/v1/professionals/me
 *   GET   /api/v1/appointments?professionalId={id}
 *   PATCH /api/v1/appointments/{id}/status   { status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' }
 */
import { HttpClient } from './HttpClient.js'
import { normalizeProfessional } from './TherapistService.js'
import { normalizeAppointment } from './AppointmentService.js'

export const SPECIALTIES = ['clinical', 'organizational', 'educational', 'family', 'childAdolescent', 'health', 'social', 'neuropsychology']

/** Días de la semana en el orden en que se muestran */
export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const SHORT_DAYS = { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié', thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom' }

/** Texto legible de la disponibilidad; lo usa el directorio para mostrar y filtrar */
export function availabilityText(schedule) {
  if (!schedule || !schedule.days?.length) return ''
  const days = WEEK_DAYS.filter((d) => schedule.days.includes(d)).map((d) => SHORT_DAYS[d]).join(', ')
  return `${days} · ${schedule.start} - ${schedule.end}`
}

/**
 * Pasos para completar el perfil (verificación + 3 datos que el paciente necesita).
 * Devuelve la lista de pasos con su estado.
 */
export function profileSteps(profile) {
  if (!profile) return []
  return [
    { key: 'license', done: profile.verificationStatus === 'verified' },
    { key: 'bio', done: (profile.bio || '').trim().length >= 30 },
    { key: 'pricing', done: Number(profile.price) > 0 && Number(profile.experienceYears) > 0 },
    { key: 'availability', done: !!profile.availabilitySchedule?.days?.length }
  ]
}

/** Perfil profesional con los campos que solo ve el propio psicólogo */
export function normalizeMyProfile(raw = {}) {
  const base = normalizeProfessional(raw)
  return {
    ...base,
    specialty: raw.specialty || raw.specialization || '',
    experienceYears: Number(raw.experienceYears ?? raw.yearsOfExperience ?? parseInt(raw.experience, 10)) || 0,
    availabilitySchedule: raw.availabilitySchedule || null
  }
}

export const APPOINTMENT_STATUS = Object.freeze({ CONFIRMED: 'CONFIRMED', CANCELLED: 'CANCELLED', COMPLETED: 'COMPLETED' })

/** Estados de cita agrupados para la interfaz */
export function appointmentState(appointment) {
  const status = String(appointment.status || '').toLowerCase()
  if (['cancelled', 'canceled'].includes(status)) return 'cancelled'
  if (status === 'completed') return 'completed'
  if (status === 'confirmed') return 'confirmed'
  return 'pending' // scheduled / pending / sin estado
}

export class ProfessionalService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  async getMyProfile() {
    const response = await this.httpClient.get('/api/v1/professionals/me')
    return normalizeMyProfile(HttpClient.extractData(response))
  }

  /**
   * Actualiza el perfil profesional. Recibe solo los campos que cambian y envía el
   * perfil COMPLETO (PUT), para que el backend no pierda los demás datos.
   * Si cambia la colegiatura (o se reenvía tras un rechazo), el backend debe volver a PENDING.
   */
  async updateMyProfile(changes = {}) {
    const current = await this.getMyProfile()
    const merged = { ...current, ...changes }
    const payload = {
      fullName: changes.fullName ?? current.name,
      specialty: merged.specialty,
      licenseNumber: merged.licenseNumber,
      bio: (merged.bio || '').trim(),
      experienceYears: Number(merged.experienceYears) || 0,
      price: Number(merged.price) || 0,
      availabilitySchedule: merged.availabilitySchedule || null,
      availability: availabilityText(merged.availabilitySchedule)
    }
    const response = await this.httpClient.put('/api/v1/professionals/me', payload)
    return normalizeMyProfile(HttpClient.extractData(response) || payload)
  }

  async getMyAppointments(professionalId) {
    const response = await this.httpClient.get(`/api/v1/appointments?professionalId=${encodeURIComponent(professionalId)}`)
    return HttpClient.extractList(response)
      .map(normalizeAppointment)
      .filter((a) => a.professionalId == null || String(a.professionalId) === String(professionalId))
      .sort((a, b) => (a.dateTime || 0) - (b.dateTime || 0))
  }

  async updateAppointmentStatus(appointmentId, status) {
    const response = await this.httpClient.patch(`/api/v1/appointments/${encodeURIComponent(appointmentId)}/status`, { status })
    return HttpClient.extractData(response)
  }
}
