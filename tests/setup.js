// Se ejecuta antes de cada archivo de pruebas
import { vi } from 'vitest'
import { server } from './mocks/server.js'
import { clearSession } from '../src/services/session.js'

beforeAll(() => {
  // Enciende el servidor simulado
  server.listen()

  // Node no acepta rutas como '/es.json'; se completan con la dirección de la página
  const originalFetch = globalThis.fetch
  globalThis.fetch = (url, options) =>
    originalFetch(typeof url === 'string' && url.startsWith('/') ? window.location.origin + url : url, options)

  // El navegador simulado no sabe desplazarse; el router lo usa al cambiar de página
  window.scrollTo = () => {}
})

beforeEach(() => {
  // Cada prueba empieza sin sesión ni datos guardados
  localStorage.clear()
  sessionStorage.clear()
  clearSession()
})

afterEach(() => {
  // Quita las respuestas especiales que haya agregado una prueba y vuelve al reloj real
  server.resetHandlers()
  vi.useRealTimers()
})

afterAll(() => server.close())
