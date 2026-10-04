/**
 * AuthService - Autenticación contra la API .NET.
 * Única puerta de entrada para login, registro y logout (la sesión se guarda en session.js).
 *
 * @author Juan Carlos Angulo
 * @version 2.0.0
 */
import { HttpClient } from './HttpClient.js'
import { setSession, clearSession, getCurrentUser, isAuthenticated } from './session.js'
import { t } from '../i18n/index.js'

/** Normaliza el usuario devuelto por el backend al formato usado por la UI */
export function normalizeUser(raw = {}, fallback = {}) {
  const user = raw.user || raw
  const first = user.firstName || ''
  const last = user.lastName || ''
  const fullName =
    [user.fullName, user.name, [first, last].filter(Boolean).join(' '), fallback.name]
      .find((v) => v && !String(v).includes('@')) || ''
  return {
    id: user.id ?? user.userId ?? fallback.id ?? null,
    name: fullName,
    fullName,
    email: user.email || fallback.email || '',
    username: user.username || user.email || fallback.email || '',
    firstName: first || fullName.split(' ')[0] || '',
    lastName: last || fullName.split(' ').slice(1).join(' '),
    avatar: user.avatarUrl || user.avatar || user.profileImage || '',
    phone: user.phoneNumber || user.phone || '',
    address: user.address || '',
    birthDate: user.dateOfBirth || user.birthDate || '',
    gender: user.gender || '',
    role: user.role || 'user',
    memberSince: user.createdAt || user.registrationDate || user.memberSince || ''
  }
}

export class AuthService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  /** Completa los datos del usuario con GET /users/{id}; si falla, usa los del login */
  async _buildUser(response, fallback) {
    const basic = normalizeUser(response, fallback)
    if (basic.id == null) return basic
    try {
      const full = await this.httpClient.get(`/api/v1/users/${basic.id}`)
      return { ...basic, ...Object.fromEntries(Object.entries(normalizeUser(HttpClient.extractData(full), fallback)).filter(([, v]) => v !== '' && v != null)) }
    } catch {
      return basic
    }
  }

  async login(email, password, { remember = true } = {}) {
    let response
    try {
      response = await this.httpClient.post('/api/v1/authentication/sign-in', {
        username: email.trim(),
        password
      })
    } catch (error) {
      if (error.status === 401 || error.status === 400 || error.status === 404) {
        throw new Error(t('auth.errors.invalidCredentials'))
      }
      throw error
    }
    if (!response || !response.token) {
      throw new Error(t('auth.errors.invalidResponse'))
    }
    // El token debe estar disponible para pedir el perfil completo
    setSession({ token: response.token, user: normalizeUser(response, { email }), remember })
    const user = await this._buildUser(response, { email })
    setSession({ token: response.token, user, remember })
    return user
  }

  async register({ email, password, name }) {
    const fullName = name.trim()
    const response = await this.httpClient.post('/api/v1/authentication/sign-up', {
      username: email.trim(),
      email: email.trim(),
      password,
      fullName,
      firstName: fullName.split(' ')[0] || fullName,
      lastName: fullName.split(' ').slice(1).join(' ')
    })
    const fallback = { email, name: fullName }
    if (response && response.token) {
      setSession({ token: response.token, user: normalizeUser(response, fallback), remember: true })
      const user = await this._buildUser(response, fallback)
      setSession({ token: response.token, user, remember: true })
      return { user, authenticated: true }
    }
    // El backend puede registrar sin devolver token: el usuario deberá iniciar sesión
    return { user: normalizeUser(response || {}, fallback), authenticated: false }
  }

  logout() {
    clearSession()
    return true
  }

  getCurrentUser() {
    return getCurrentUser()
  }

  isAuthenticated() {
    return isAuthenticated()
  }
}
