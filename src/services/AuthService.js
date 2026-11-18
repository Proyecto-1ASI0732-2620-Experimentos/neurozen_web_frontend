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
import { normalizeRole, normalizeVerification, ROLES } from './roles.js'
import { ProfessionalService } from './ProfessionalService.js'
import { normalizeFullName } from '../utils/validation.js'

/**
 * Normaliza el usuario devuelto por el backend al formato usado por la UI.
 * IMPORTANTE: este objeto se guarda en la sesión (localStorage/sessionStorage). NO debe incluir
 * el DNI ni la contraseña (Ley 29733): el DNI solo se lee de GET /users/{id} en la pantalla de perfil.
 */
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
    role: normalizeRole(user.role || fallback.role),
    // Solo para psicólogos: estado de verificación de la colegiatura e id del perfil profesional
    verificationStatus: user.verificationStatus ? normalizeVerification(user.verificationStatus) : (fallback.verificationStatus || null),
    professionalId: user.professionalId ?? fallback.professionalId ?? null,
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
      // El rol del login se conserva si el perfil completo no lo incluye
      const keep = { ...fallback, role: basic.role, verificationStatus: basic.verificationStatus, professionalId: basic.professionalId }
      return { ...basic, ...Object.fromEntries(Object.entries(normalizeUser(HttpClient.extractData(full), keep)).filter(([, v]) => v !== '' && v != null)) }
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
        throw new Error(t('auth.errors.invalidCredentials'), { cause: error })
      }
      throw error
    }
    if (!response || !response.token) {
      throw new Error(t('auth.errors.invalidResponse'))
    }
    // El token debe estar disponible para pedir el perfil completo
    setSession({ token: response.token, user: normalizeUser(response, { email }), remember })
    let user = await this._buildUser(response, { email })
    if (user.role === ROLES.PSYCHOLOGIST) user = await this._withProfessionalStatus(user)
    setSession({ token: response.token, user, remember })
    return user
  }

  /**
   * Para psicólogos: consulta su perfil profesional para conocer el estado de verificación.
   * Si el endpoint falla, se asume "pendiente" (nunca se da acceso sin confirmación).
   */
  async _withProfessionalStatus(user) {
    try {
      const profile = await new ProfessionalService().getMyProfile()
      return {
        ...user,
        professionalId: profile.id ?? user.professionalId,
        verificationStatus: profile.verificationStatus,
        specialty: profile.specialty,
        licenseNumber: profile.licenseNumber
      }
    } catch {
      return { ...user, verificationStatus: user.verificationStatus || 'pending' }
    }
  }

  /** Vuelve a consultar el estado del psicólogo (p. ej. tras ser aprobado por el admin) */
  async refreshProfessionalStatus(user) {
    return this._withProfessionalStatus(user)
  }

  /**
   * Registro de cuenta. POST /api/v1/authentication/sign-up
   *  - role 'user': trabajador; la cuenta queda activa.
   *  - role 'psychologist': requiere especialidad y número de colegiatura; la cuenta
   *    queda "pendiente de verificación" hasta que un administrador la apruebe.
   * El DNI (8 dígitos) es obligatorio para ambos. Se envían dos consentimientos separados
   * (acceptedTerms y acceptedPrivacyPolicy) y confirmPassword para que el backend lo valide.
   * El DNI y la contraseña solo viajan en esta petición: no se guardan en la sesión.
   *
   * Contrato del backend (un solo campo por dato): fullName, dni, email, password, confirmPassword, role,
   * acceptedTerms, acceptedPrivacyPolicy, specialty, licenseNumber. Ya no se envían username,
   * firstName ni lastName (el backend los ignora y exige fullName y email).
   */
  async register({ email, password, confirmPassword, name, dni, role = ROLES.USER, specialty, licenseNumber, acceptedTerms, acceptedPrivacyPolicy }) {
    const fullName = normalizeFullName(name)
    const payload = {
      fullName,
      dni: String(dni ?? '').trim(),
      email: email.trim(),
      password,
      confirmPassword: confirmPassword ?? password,
      role: role === ROLES.PSYCHOLOGIST ? 'PSYCHOLOGIST' : 'USER',
      acceptedTerms: !!acceptedTerms,
      acceptedPrivacyPolicy: !!acceptedPrivacyPolicy
    }
    if (role === ROLES.PSYCHOLOGIST) {
      payload.specialty = specialty
      payload.licenseNumber = String(licenseNumber ?? '').trim()
    }
    const response = await this.httpClient.post('/api/v1/authentication/sign-up', payload)
    const fallback = {
      email,
      name: fullName,
      role,
      verificationStatus: role === ROLES.PSYCHOLOGIST ? 'pending' : null
    }
    if (response && response.token) {
      setSession({ token: response.token, user: normalizeUser(response, fallback), remember: true })
      let user = await this._buildUser(response, fallback)
      if (user.role === ROLES.PSYCHOLOGIST) user = await this._withProfessionalStatus(user)
      setSession({ token: response.token, user, remember: true })
      return { user, authenticated: true }
    }
    // El backend puede registrar sin devolver token: el usuario deberá iniciar sesión
    return { user: normalizeUser(response || {}, fallback), authenticated: false }
  }

  /**
   * Solicita un enlace de recuperación. Por seguridad la respuesta es la misma exista
   * o no la cuenta. POST /api/v1/authentication/forgot-password { email }
   */
  async forgotPassword(email) {
    return this.httpClient.post('/api/v1/authentication/forgot-password', { email: email.trim() })
  }

  /** POST /api/v1/authentication/reset-password { token, newPassword } */
  async resetPassword(token, newPassword) {
    return this.httpClient.post('/api/v1/authentication/reset-password', { token, newPassword })
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
