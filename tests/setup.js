// Se ejecuta antes de cada archivo de pruebas
import { vi } from 'vitest'
import { server } from './mocks/server.js'
import { clearSession, setUnauthorizedHandler } from '../src/services/session.js'

// El gráfico (Chart.js) necesita <canvas>, que no existe en las pruebas: se reemplaza por uno vacío
vi.mock('chart.js', () => ({
  Chart: class {
    static register() {}
    update() {}
    destroy() {}
  },
  CategoryScale: {}, LinearScale: {}, PointElement: {}, LineElement: {}, LineController: {}, Tooltip: {}, Filler: {}
}))

beforeAll(() => {
  // Enciende el servidor simulado
  // Avisa si el frontend llama a un endpoint sin respuesta simulada
  server.listen({ onUnhandledRequest: 'warn' })

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
  setUnauthorizedHandler(null)
})

afterEach(() => {
  // Quita las respuestas especiales que haya agregado una prueba y vuelve al reloj real
  server.resetHandlers()
  vi.useRealTimers()
})

afterAll(() => server.close())
