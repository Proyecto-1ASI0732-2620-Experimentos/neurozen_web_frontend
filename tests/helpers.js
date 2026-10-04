// Funciones de ayuda para las pruebas de integración
import { mount, flushPromises } from '@vue/test-utils'
import { vi } from 'vitest'
import App from '../src/App.vue'
import router from '../src/routes/index.js'
import { createI18nInstance } from '../src/i18n/index.js'
import { setSession } from '../src/services/session.js'
import { createToken, user } from './mocks/data.js'

let app = null

// Inicia sesión directamente, sin pasar por la pantalla de login
export function loginAs() {
  setSession({ token: createToken(), user })
}

// Monta la aplicación real (router, idioma, sesión y servicios) y abre la página "path"
export async function openPage(path) {
  if (app) app.unmount() // cierra la pantalla de la prueba anterior

  localStorage.setItem('neurozen-locale', 'es') // textos en español
  const i18n = await createI18nInstance()
  i18n.global.silentTranslationWarn = true // evita avisos de traducciones opcionales

  app = mount(App, { global: { plugins: [i18n, router] }, attachTo: document.body })
  await router.push(path)
  await flushPromises()
  return { page: app, router }
}

// Espera hasta que se cumpla una condición (por ejemplo, que llegue la respuesta de la API)
export function waitFor(check) {
  return vi.waitFor(check, { timeout: 3000 })
}
