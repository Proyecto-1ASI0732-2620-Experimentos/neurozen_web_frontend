/**
 * session.js - Fuente única de la sesión del usuario en el frontend.
 *
 * Antes el token y el usuario se leían directamente de localStorage en 9 archivos
 * y existían dos copias del usuario ('user' y 'currentUser'). Este módulo centraliza
 * esa lógica y expone un estado reactivo para que Header, Dashboard, etc. se
 * actualicen al iniciar/cerrar sesión o editar el perfil.
 *
 * - "Recordarme" activado  -> token en localStorage (persiste entre sesiones)
 * - "Recordarme" desactivado -> token en sessionStorage (se borra al cerrar el navegador)
 */
import { reactive, readonly } from 'vue'

const TOKEN_KEY = 'authToken'
const USER_KEY = 'user'
const LEGACY_USER_KEY = 'currentUser'

function readJSON(storage, key) {
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function readToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)
}

function readUser() {
  return (
    readJSON(sessionStorage, USER_KEY) ||
    readJSON(localStorage, USER_KEY) ||
    readJSON(localStorage, LEGACY_USER_KEY)
  )
}

/** Decodifica el payload de un JWT sin validar firma (solo para leer `exp`). */
function decodeJwt(token) {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodeURIComponent(escape(json)))
  } catch {
    return null
  }
}

const state = reactive({
  token: readToken(),
  user: readUser()
})

export const session = readonly(state)

/** true si el token existe y, cuando es un JWT con `exp`, no ha caducado. */
export function isAuthenticated() {
  const token = state.token
  if (!token) return false
  const payload = decodeJwt(token)
  if (payload && typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
    clearSession()
    return false
  }
  return true
}

export function getToken() {
  return state.token
}

export function getCurrentUser() {
  return state.user
}

/** Id del usuario autenticado o null (sin valores por defecto inventados). */
export function getUserId() {
  const u = state.user
  if (!u) return null
  return u.id ?? u.userId ?? null
}

/** Nombre visible del usuario, evitando mostrar correos como nombre. */
export function getDisplayName(user = state.user) {
  if (!user) return ''
  const candidates = [
    user.fullName,
    user.name,
    [user.firstName, user.lastName].filter(Boolean).join(' '),
    user.username
  ]
  const found = candidates.find((c) => c && !String(c).includes('@'))
  return found || (user.email ? user.email.split('@')[0] : '')
}

/** Guarda token y usuario tras login/registro. */
export function setSession({ token, user, remember = true }) {
  const target = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  other.removeItem(TOKEN_KEY)
  other.removeItem(USER_KEY)
  localStorage.removeItem(LEGACY_USER_KEY)
  if (token) target.setItem(TOKEN_KEY, token)
  if (user) target.setItem(USER_KEY, JSON.stringify(user))
  state.token = token || null
  state.user = user || null
}

/** Actualiza los datos del usuario (p. ej. tras editar el perfil). */
export function updateUser(partial) {
  const merged = { ...(state.user || {}), ...partial }
  const storage = sessionStorage.getItem(TOKEN_KEY) ? sessionStorage : localStorage
  storage.setItem(USER_KEY, JSON.stringify(merged))
  state.user = merged
}

/** Cierra la sesión borrando todas las claves de autenticación. */
export function clearSession() {
  ;[localStorage, sessionStorage].forEach((s) => {
    s.removeItem(TOKEN_KEY)
    s.removeItem(USER_KEY)
  })
  localStorage.removeItem(LEGACY_USER_KEY)
  state.token = null
  state.user = null
}

/**
 * Clave de localStorage aislada por usuario. Evita que favoritos, pausas
 * activas o historial de un usuario aparezcan a otro en el mismo navegador.
 */
export function userStorageKey(base) {
  const id = getUserId()
  return id != null ? `${base}:${id}` : base
}

export function readUserData(base, fallback) {
  const value = readJSON(localStorage, userStorageKey(base))
  return value ?? fallback
}

export function writeUserData(base, value) {
  localStorage.setItem(userStorageKey(base), JSON.stringify(value))
}

/* Notificación de sesión expirada (401). main.js registra la navegación a /login,
   evitando que los servicios dependan del router. */
let unauthorizedHandler = null
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn
}
export function notifyUnauthorized() {
  clearSession()
  if (unauthorizedHandler) unauthorizedHandler()
}
