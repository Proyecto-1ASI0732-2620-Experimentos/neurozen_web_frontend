/**
 * useToast - notificaciones globales no bloqueantes.
 * Sustituye a los alert()/confirm() que bloqueaban la interfaz.
 */
import { reactive } from 'vue'

const state = reactive({ items: [] })
let seq = 0

function push(type, message, { title = '', duration = 4000 } = {}) {
  const id = ++seq
  state.items.push({ id, type, message, title })
  if (duration > 0) setTimeout(() => dismiss(id), duration)
  return id
}

export function dismiss(id) {
  const i = state.items.findIndex((t) => t.id === id)
  if (i > -1) state.items.splice(i, 1)
}

export const toast = {
  success: (msg, opts) => push('success', msg, opts),
  error: (msg, opts) => push('error', msg, { duration: 6000, ...opts }),
  info: (msg, opts) => push('info', msg, opts),
  warning: (msg, opts) => push('warning', msg, { duration: 5000, ...opts })
}

export function useToast() {
  return { toasts: state.items, toast, dismiss }
}
