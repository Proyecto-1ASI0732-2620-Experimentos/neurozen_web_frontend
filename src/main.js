/**
 * main.js - Punto de entrada principal de la aplicación NeuroZen
 * Configura Vue 3, Vue Router y Vue i18n antes de montar la aplicación
 *
 * @author Juan Carlos Angulo
 * @version 1.1.0
 */

import { createApp } from 'vue'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import 'material-symbols/outlined.css'
import './style.css'
import App from './App.vue'
import router from './routes/index.js'
import { createI18nInstance } from './i18n/index.js'
import { applyPreferences } from './services/preferences.js'
import { setUnauthorizedHandler } from './services/session.js'

/**
 * Respaldo global para imágenes rotas: si un <img> tiene data-fallback y falla,
 * se sustituye una sola vez (evita bucles de onerror y textos alt a la vista).
 */
document.addEventListener('error', (event) => {
  const img = event.target
  if (img instanceof HTMLImageElement && img.dataset.fallback && !img.dataset.fallbackApplied) {
    img.dataset.fallbackApplied = '1'
    img.src = img.dataset.fallback
  }
}, true)

async function initApp() {
  applyPreferences()

  const app = createApp(App)
  const i18n = await createI18nInstance()
  app.use(i18n)
  app.use(router)

  // 401 en cualquier petición: volver a /login conservando la página actual
  setUnauthorizedHandler(() => {
    const current = router.currentRoute.value
    if (current.name !== 'Login') {
      router.push({ name: 'Login', query: { expired: '1', redirect: current.fullPath } })
    }
  })
  app.mount('#app')
}

initApp().catch((error) => {
  console.error('Error al iniciar NeuroZen:', error)
  const root = document.getElementById('app')
  if (root) {
    root.innerHTML = '<p style="font-family:sans-serif;padding:2rem">No se pudo iniciar la aplicación. Recarga la página.</p>'
  }
})
