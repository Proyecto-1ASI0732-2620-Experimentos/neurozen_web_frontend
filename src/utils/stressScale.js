/**
 * Escalas de estrés usadas en la interfaz (M7).
 *
 * NeuroZen maneja DOS instrumentos distintos que NO son equivalentes:
 *  - Test PSS-10 (Escala de Estrés Percibido): puntaje original 0-40 (cálculo en AssessmentService,
 *    sin cambios). Para visualizaciones generales puede mostrarse normalizado 0-100 con
 *    (puntaje / 40) × 100, siempre identificado como «normalizado».
 *  - Desencadenantes: intensidad percibida de una situación, escala 1-10 elegida por el usuario.
 *    Es un registro personal, NO una medición clínica, y no se mezcla con el PSS-10.
 *
 * Estas funciones solo formatean para la presentación: no modifican respuestas ni datos históricos.
 */
export const PSS_MAX = 40
export const TRIGGER_MIN = 1
export const TRIGGER_MAX = 10

/** PSS-10 normalizado 0-100 (entero). null si el puntaje no es válido. */
export function normalizePss(score) {
  const n = Number(score)
  if (score == null || score === '' || Number.isNaN(n) || n < 0 || n > PSS_MAX) return null
  return Math.round((n / PSS_MAX) * 100)
}

/** Porcentaje (0-100) de un valor dentro de su escala, solo para dibujar barras */
export function percentOf(value, max) {
  const n = Number(value)
  if (value == null || Number.isNaN(n) || !max) return 0
  return Math.max(0, Math.min(100, Math.round((n / max) * 100)))
}

/** Categoría visual (no clínica) de un porcentaje: low | moderate | high */
export function bandFor(percent) {
  if (percent <= 40) return 'low'
  if (percent <= 70) return 'moderate'
  return 'high'
}
