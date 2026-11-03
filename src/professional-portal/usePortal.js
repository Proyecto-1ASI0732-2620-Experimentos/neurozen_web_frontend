/**
 * Utilidades compartidas del portal del psicólogo: carga del perfil y de las citas,
 * y agrupación de citas en pacientes.
 */
import { ProfessionalService, appointmentState } from '../services/ProfessionalService.js'
import { updateUser, getCurrentUser } from '../services/session.js'

export const proService = new ProfessionalService()

/** Carga perfil + citas del psicólogo autenticado y sincroniza la sesión */
export async function loadPortalData({ withAppointments = true } = {}) {
  const profile = await proService.getMyProfile()
  const user = getCurrentUser()
  if (user && (user.verificationStatus !== profile.verificationStatus || user.professionalId !== profile.id)) {
    updateUser({ verificationStatus: profile.verificationStatus, professionalId: profile.id })
  }
  const appointments = withAppointments ? await proService.getMyAppointments(profile.id) : []
  return { profile, appointments: appointments.map((a) => ({ ...a, state: appointmentState(a) })) }
}

export const isToday = (date) => !!date && date.toDateString() === new Date().toDateString()

export function patientLabel(appointment, t) {
  return appointment.patientName || t('pro.patientFallback', { id: appointment.patientId ?? '—' })
}

/** Agrupa las citas por paciente (la lista de pacientes se deriva de las citas) */
export function groupPatients(appointments, t) {
  const now = new Date()
  const map = new Map()
  appointments.forEach((a) => {
    const key = String(a.patientId ?? a.patientName ?? a.id)
    if (!map.has(key)) map.set(key, { id: key, name: patientLabel(a, t), email: a.patientEmail || '', appointments: [] })
    map.get(key).appointments.push(a)
  })
  return [...map.values()].map((p) => {
    const sorted = [...p.appointments].sort((x, y) => (x.dateTime || 0) - (y.dateTime || 0))
    const valid = sorted.filter((a) => a.state !== 'cancelled')
    const next = valid.find((a) => a.dateTime && a.dateTime >= now)
    const last = [...valid].reverse().find((a) => a.dateTime && a.dateTime < now)
    return {
      ...p,
      appointments: sorted,
      sessions: valid.filter((a) => a.dateTime && a.dateTime < now && a.state !== 'pending').length,
      next,
      last,
      active: !!next
    }
  })
}
