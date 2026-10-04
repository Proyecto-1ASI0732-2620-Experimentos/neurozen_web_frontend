// Prueba de integración: flujo completo de reserva de una sesión con un profesional
// (pantallas + servicios + router + API simulada trabajando juntos)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { openPage, loginAs, waitFor } from '../helpers.js'

// Busca un botón por su texto
const button = (page, text) => page.findAll('button').find((b) => b.text().includes(text))

describe('BookSession', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Porque reservar una sesión con un profesional es el flujo
   *   de negocio más importante de la plataforma; si falla, el usuario no puede recibir ayuda.
   * - ¿Qué hace esta prueba?: Recorre los 4 pasos en la pantalla real (profesional, día y hora,
   *   tipo de sesión y confirmación), verifica que la API recibe la cita con el paciente, el
   *   profesional y la hora correctos, y que se muestra la confirmación de la cita creada.
   */
  it('fullFlow_bookASession', async () => {
    // Arrange: hoy es 10 de octubre de 2026 y guardamos lo que llega a la API
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T10:00:00-05:00'))
    loginAs()
    let sent = null
    server.use(
      http.post(API + '/appointments', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ id: 555 })
      })
    )
    const { page, router } = await openPage('/book-session')
    await waitFor(() => expect(page.text()).toContain('Dra. Elena Ramírez'))

    // Act - Paso 1: elegir profesional
    await page.find('[role="radio"]').trigger('click')
    await button(page, 'Siguiente').trigger('click')

    // Act - Paso 2: elegir el día 20 y las 09:00
    await page.findAll('.grid-cols-7 button').find((b) => b.text() === '20').trigger('click')
    await waitFor(() => expect(page.find('button.slot').exists()).toBe(true))
    await page.find('button.slot').trigger('click')
    await button(page, 'Siguiente').trigger('click')

    // Act - Paso 3: elegir el tipo de sesión
    await page.find('[role="radio"]').trigger('click')
    await button(page, 'Siguiente').trigger('click')

    // Act - Paso 4: confirmar
    await button(page, 'Confirmar Reserva').trigger('click')

    // Assert: la API recibió la cita correcta (usuario 7, 09:00 Lima = 14:00 UTC)
    await waitFor(() => expect(sent).not.toBeNull())
    expect(sent.patientId).toBe(7)
    expect(sent.professionalId).toBe(1)
    expect(sent.appointmentDateTime).toBe('2026-10-20T14:00:00.000Z')

    // Assert: se muestra la confirmación de la cita creada
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/appointment-confirmation/555'))
  })
})
