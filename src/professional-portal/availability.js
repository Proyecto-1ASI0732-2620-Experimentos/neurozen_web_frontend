/**
 * Disponibilidad semanal del psicólogo (lógica pura).
 *
 * El backend exige `availabilitySchedule` en CADA `PUT /professionals/me` (responde 400 «Indica tus días y horario
 * de atención» si falta), y un psicólogo recién registrado todavía no tiene horario. Por eso las pantallas que guardan
 * el perfil piden el horario en el mismo formulario cuando aún no existe.
 */
import { WEEK_DAYS } from '../services/ProfessionalService.js'

/** Propuesta inicial editable (lunes a viernes, 09:00-18:00); solo se guarda si el psicólogo pulsa Guardar. */
export const defaultAvailability = () => ({ days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], start: '09:00', end: '18:00' })

export const hasAvailability = (schedule) => !!schedule?.days?.length

/** Clave de i18n del error, o '' si el horario es válido (mismas reglas que el backend) */
export function availabilityErrorKey(schedule) {
  if (!schedule?.days?.length) return 'pro.schedule.errors.noDays'
  if (!schedule.start || !schedule.end || schedule.end <= schedule.start) return 'stress.activeBreaks.invalidHours'
  return ''
}

/** Agrega o quita un día manteniendo el orden de la semana */
export function toggleDay(days, day) {
  return days.includes(day) ? days.filter((d) => d !== day) : WEEK_DAYS.filter((d) => [...days, day].includes(d))
}

/** Errores del backend sobre el horario: availabilitySchedule, availabilitySchedule.days, .start o .end */
export function availabilityServerError(errors) {
  const key = Object.keys(errors || {}).find((k) => k.toLowerCase().startsWith('availabilityschedule'))
  return key ? errors[key] : ''
}
