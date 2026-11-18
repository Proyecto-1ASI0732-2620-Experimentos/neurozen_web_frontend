/** Error normalizado de la API (status 0 = red/timeout). */
export class ApiError extends Error {
  constructor(message, { status = 0, details = null, cause = null, code = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    this.cause = cause
    // Código interno para casos que la interfaz trata de forma especial (p. ej. PROFESSIONAL_NOT_VERIFIED)
    this.code = code
  }
}

export const PROFESSIONAL_NOT_VERIFIED = 'PROFESSIONAL_NOT_VERIFIED'

/** Mensaje del backend: «Tu cuenta profesional aún no está verificada» (403) */
const NOT_VERIFIED_PATTERN = /no est[aá] verificad|not verified/i

/** true si el error es el 403 que el backend devuelve a un psicólogo PENDING/REJECTED */
export function isProfessionalNotVerified(error) {
  return !!error && (error.code === PROFESSIONAL_NOT_VERIFIED ||
    (error.status === 403 && NOT_VERIFIED_PATTERN.test(String(error.message || ''))))
}

/** Detecta el 403 de psicólogo no verificado a partir del cuerpo de la respuesta */
export function isNotVerifiedBody(status, body) {
  const message = body && typeof body === 'object' ? body.message : body
  return status === 403 && NOT_VERIFIED_PATTERN.test(String(message || ''))
}

/**
 * Errores por campo del 400 del backend ({ message, errors: { campo: [..] } }).
 * Devuelve { campo: 'primer mensaje' } con el nombre de campo en minúscula inicial.
 */
export function fieldErrors(error) {
  const errors = error && error.details && typeof error.details === 'object' ? error.details.errors : null
  if (!errors || typeof errors !== 'object') return {}
  return Object.fromEntries(
    Object.entries(errors)
      .map(([key, value]) => [key.charAt(0).toLowerCase() + key.slice(1), [].concat(value).filter(Boolean)[0]])
      .filter(([, value]) => value)
  )
}

export const RESOURCE_PLAN_REQUIRED = 'RESOURCE_PLAN_REQUIRED'
export const RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND'

/** Mensaje del backend: «Este recurso está disponible desde el plan Avanzado» (403) */
const PLAN_REQUIRED_PATTERN = /disponible desde el plan|requires the .* plan/i

/**
 * true si el error es el 403 de la biblioteca por plan insuficiente.
 * Se distingue del 403 de psicólogo no verificado, que redirige a la pantalla de cuenta pendiente.
 */
export function isPlanRequired(error) {
  if (!error || isProfessionalNotVerified(error)) return false
  return error.code === RESOURCE_PLAN_REQUIRED ||
    (error.status === 403 && PLAN_REQUIRED_PATTERN.test(String(error.message || '')))
}
