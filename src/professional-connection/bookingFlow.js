/**
 * Lógica compartida por BookAppointment y BookSession tras crear una cita:
 * navega a la confirmación si el backend devuelve id; si no, a "Mis citas".
 * (Antes se usaba `appointmentId || 1` y se mostraba la cita equivocada.)
 */
import { toast } from '../composables/useToast.js'
import { t } from '../i18n/index.js'

export function goToConfirmation(router, created, { professionalId, date, time, duration, notes }) {
  const id = created && (created.id ?? created.appointmentId)
  if (id == null) {
    toast.success(t('appointments.bookedNoId'))
    router.push({ name: 'UserAppointments' })
    return
  }
  router.push({
    name: 'AppointmentConfirmation',
    params: { appointmentId: id },
    query: { professionalId, date, time, duration, notes: notes || undefined }
  })
}
