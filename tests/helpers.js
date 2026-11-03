// Funciones de ayuda para las pruebas de integración
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { vi } from 'vitest'
import App from '../src/App.vue'
import router from '../src/routes/index.js'
import { createI18nInstance } from '../src/i18n/index.js'
import { setSession, setUnauthorizedHandler } from '../src/services/session.js'
import { createToken, user, admin, psychologist } from './mocks/data.js'

let app = null

// Inicia sesión directamente (sin pasar por el login) como trabajador, admin o psicólogo
export function loginAs(role = 'user', overrides = {}) {
  const accounts = { user, admin, psychologist }
  setSession({ token: createToken(), user: { ...accounts[role], ...overrides } })
}

// Monta la aplicación real (router, idioma, sesión y servicios) y abre la página "path"
export async function openPage(path) {
  if (app) app.unmount() // cierra la pantalla de la prueba anterior

  localStorage.setItem('neurozen-locale', 'es') // textos en español
  const i18n = await createI18nInstance()
  i18n.global.silentTranslationWarn = true // evita avisos de traducciones opcionales

  // Igual que main.js: si la API responde 401, se vuelve al login
  setUnauthorizedHandler(() => {
    if (router.currentRoute.value.name !== 'Login') router.push({ name: 'Login', query: { expired: '1' } })
  })

  app = mount(App, { global: { plugins: [i18n, router] }, attachTo: document.body })
  await router.push(path)
  await flushPromises()
  return { page: app, router }
}

// Busca un botón por su texto visible
export function button(page, text) {
  return page.findAll('button').find((b) => b.text().includes(text))
}

// Diálogo de confirmación abierto (se dibuja en <body> mediante Teleport)
export function dialog() {
  const el = document.querySelector('[role="dialog"][aria-modal="true"]')
  return el ? new DOMWrapper(el) : null
}

// Botón de un diálogo por su texto
export function dialogButton(text) {
  return dialog().findAll('button').find((b) => b.text().includes(text))
}

// Pausa real (para animaciones o avances automáticos de la pantalla)
export function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Espera hasta que se cumpla una condición (por ejemplo, que llegue la respuesta de la API)
export function waitFor(check) {
  return vi.waitFor(check, { timeout: 3000 })
}
