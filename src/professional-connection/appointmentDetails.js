/**
 * Carga una cita y su profesional. Si la API no devuelve la cita, usa los datos
 * de navegación (query) que dejó el flujo de reserva.
 */
import { AppointmentService } from '../services/AppointmentService.js'
import { TherapistService } from '../services/TherapistService.js'

export async function loadAppointmentDetails(appointmentId, query = {}) {
  const appointments = new AppointmentService()
  const therapists = new TherapistService()
  let appointment = null
  try {
    appointment = await appointments.getAppointment(appointmentId)
  } catch {
    appointment = null
  }
  if (!appointment || !appointment.date) {
    if (!query.professionalId || !query.date) throw new Error('not-found')
    appointment = {
      id: appointmentId,
      professionalId: query.professionalId,
      date: query.date,
      time: query.time || '',
      duration: Number(query.duration) || 60,
      notes: query.notes || '',
      status: 'scheduled'
    }
  }
  let professional = null
  try {
    professional = await therapists.getTherapist(appointment.professionalId)
  } catch {
    professional = null
  }
  return { appointment, professional }
}
