/**
 * roles.js - Roles de usuario y estado de verificación de psicólogos.
 *
 * NeuroZen tiene tres tipos de cuenta:
 *  - user:          trabajador que busca apoyo para gestionar su estrés
 *  - psychologist:  profesional que atiende citas (debe ser verificado por un admin)
 *  - admin:         equipo de NeuroZen que valida la colegiatura de los psicólogos
 */
import { getCurrentUser, readUserData } from './session.js'

export const ROLES = Object.freeze({ USER: 'user', PSYCHOLOGIST: 'psychologist', ADMIN: 'admin' })

export const VERIFICATION = Object.freeze({ PENDING: 'pending', VERIFIED: 'verified', REJECTED: 'rejected' })

/** Clave local (por usuario) que indica que el psicólogo ya vio la pantalla de bienvenida */
export const PRO_WELCOME_KEY = 'neurozen_pro_welcome_seen'

/** Acepta los nombres que pueda usar el backend (PSYCHOLOGIST, Professional, ROLE_ADMIN...) */
export function normalizeRole(raw) {
  const value = String(raw || '').toLowerCase().replace(/^role_/, '')
  if (['admin', 'administrator', 'administrador'].includes(value)) return ROLES.ADMIN
  if (['psychologist', 'professional', 'psicologo', 'psicólogo', 'therapist'].includes(value)) return ROLES.PSYCHOLOGIST
  return ROLES.USER
}

export function normalizeVerification(raw) {
  const value = String(raw || '').toLowerCase()
  if (['verified', 'approved', 'verificado'].includes(value)) return VERIFICATION.VERIFIED
  if (['rejected', 'rechazado', 'denied'].includes(value)) return VERIFICATION.REJECTED
  return VERIFICATION.PENDING
}

export function getRole(user = getCurrentUser()) {
  return user ? normalizeRole(user.role) : null
}

export function isVerifiedPsychologist(user = getCurrentUser()) {
  return getRole(user) === ROLES.PSYCHOLOGIST && user.verificationStatus === VERIFICATION.VERIFIED
}

/** Página de inicio según el rol (y el estado de verificación del psicólogo) */
export function homeRouteFor(user = getCurrentUser()) {
  const role = getRole(user)
  if (role === ROLES.ADMIN) return { name: 'AdminProfessionals' }
  if (role === ROLES.PSYCHOLOGIST) {
    if (user.verificationStatus !== VERIFICATION.VERIFIED) return { name: 'ProStatus' }
    return readUserData(PRO_WELCOME_KEY, false) ? { name: 'ProDashboard' } : { name: 'ProWelcome' }
  }
  return { name: 'Dashboard' }
}
