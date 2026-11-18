/**
 * Borrador del perfil profesional que aún no se guardó (biografía, años, tarifa, especialidad, horario).
 * Vive solo en memoria de la pestaña (no en localStorage): si el psicólogo va a «Horario» y vuelve, recupera lo que
 * escribió. Se borra al guardar o al cerrar sesión/recargar la página.
 */
const drafts = new Map()

export function saveProfileDraft(userId, form) {
  if (userId != null) drafts.set(String(userId), JSON.parse(JSON.stringify(form)))
}

export function readProfileDraft(userId) {
  const draft = userId == null ? null : drafts.get(String(userId))
  return draft ? JSON.parse(JSON.stringify(draft)) : null
}

export function clearProfileDraft(userId) {
  if (userId != null) drafts.delete(String(userId))
}
