/**
 * HttpClient - Cliente HTTP único del frontend (fetch).
 *
 * Mejoras respecto a la versión anterior:
 *  - Timeout real con AbortController (VITE_API_TIMEOUT se leía pero no se aplicaba).
 *  - Errores homogéneos (ApiError con status y mensaje legible) en GET/POST/PUT/DELETE.
 *  - 401 en endpoints protegidos: cierra la sesión y redirige a /login?expired=1.
 *  - Soporta respuestas 204 y cuerpos vacíos.
 *  - Modo estático (Firebase Hosting) delegado a StaticAPIAdapter.
 *
 * @author Juan Carlos Angulo
 * @version 2.0.0
 */
import { StaticAPIAdapter } from './StaticAPIAdapter.js'
import { getToken, notifyUnauthorized } from './session.js'
import { t } from '../i18n/index.js'
import { ApiError } from './ApiError.js'

export { ApiError }

const AUTH_ENDPOINTS = ['/authentication/sign-in', '/authentication/sign-up']
let staticAdapter = null

function isStaticMode() {
  return import.meta.env.VITE_API_MODE === 'static' || import.meta.env.VITE_API_BASE_URL === 'static'
}

/** Mensaje legible por código de estado */
export function messageForStatus(status) {
  if (status === 0) return t('errors.network')
  if (status === 400 || status === 422) return t('errors.validation')
  if (status === 401) return t('errors.unauthorized')
  if (status === 403) return t('errors.forbidden')
  if (status === 404) return t('errors.notFound')
  if (status === 409) return t('errors.conflict')
  if (status >= 500) return t('errors.server')
  return t('errors.unknown')
}

async function parseBody(response) {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function serverMessage(body) {
  if (!body) return ''
  if (typeof body === 'string') return body.slice(0, 200)
  let msg = body.message || body.title || body.error || ''
  if (body.errors && typeof body.errors === 'object') {
    const list = Object.values(body.errors).flat().filter(Boolean)
    if (list.length) msg = msg ? `${msg}: ${list.join(' ')}` : list.join(' ')
  }
  return msg
}

export class HttpClient {
  constructor(baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5059') {
    this.baseURL = baseURL.replace(/\/$/, '')
    this.timeout = Number(import.meta.env.VITE_API_TIMEOUT) || 10000
    this.isStaticMode = isStaticMode()
    if (this.isStaticMode && !staticAdapter) staticAdapter = new StaticAPIAdapter()
  }

  _headers(hasBody) {
    const headers = { Accept: 'application/json' }
    if (hasBody) headers['Content-Type'] = 'application/json'
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  async request(method, endpoint, data) {
    if (this.isStaticMode) {
      return staticAdapter.request(method, endpoint, data)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)
    let response
    try {
      response = await fetch(`${this.baseURL}${endpoint}`, {
        method,
        headers: this._headers(data !== undefined),
        body: data !== undefined ? JSON.stringify(data) : undefined,
        signal: controller.signal
      })
    } catch (error) {
      const timedOut = error.name === 'AbortError'
      throw new ApiError(timedOut ? t('errors.timeout') : t('errors.network'), { status: 0, cause: error })
    } finally {
      clearTimeout(timer)
    }

    const body = await parseBody(response)

    if (!response.ok) {
      const isAuthCall = AUTH_ENDPOINTS.some((p) => endpoint.includes(p))
      if (response.status === 401 && !isAuthCall) {
        this._handleExpiredSession()
      }
      const detail = serverMessage(body)
      throw new ApiError(detail || messageForStatus(response.status), {
        status: response.status,
        details: body
      })
    }
    return body
  }

  _handleExpiredSession() {
    notifyUnauthorized()
  }

  get(endpoint) { return this.request('GET', endpoint) }
  post(endpoint, data) { return this.request('POST', endpoint, data ?? {}) }
  put(endpoint, data) { return this.request('PUT', endpoint, data ?? {}) }
  delete(endpoint) { return this.request('DELETE', endpoint) }

  /** Desempaqueta { data } / { success, data } o devuelve el objeto tal cual */
  static extractData(response) {
    if (response && typeof response === 'object' && !Array.isArray(response) && 'data' in response && response.data != null) {
      return response.data
    }
    return response
  }

  /** Devuelve siempre un array a partir de [], { items }, { data } */
  static extractList(response) {
    if (Array.isArray(response)) return response
    if (response && typeof response === 'object') {
      if (Array.isArray(response.items)) return response.items
      if (Array.isArray(response.data)) return response.data
      if (Array.isArray(response.value)) return response.value
    }
    return []
  }
}
