/** Error normalizado de la API (status 0 = red/timeout). */
export class ApiError extends Error {
  constructor(message, { status = 0, details = null, cause = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    this.cause = cause
  }
}
