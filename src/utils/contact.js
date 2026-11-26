/**
 * Datos de contacto de soporte (M4).
 * No hay datos de contacto reales verificables en el proyecto, así que no se muestran por defecto.
 * Si el equipo define VITE_SUPPORT_EMAIL en su entorno, el footer y Ajustes muestran ese correo.
 * (No se modifica ningún archivo .env: la variable es opcional.)
 */
import { isEmail } from './validation.js'

export function supportEmail(env = import.meta.env) {
  const value = String(env?.VITE_SUPPORT_EMAIL || '').trim()
  return isEmail(value) ? value : ''
}
