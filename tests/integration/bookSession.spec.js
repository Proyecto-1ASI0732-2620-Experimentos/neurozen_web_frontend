// Pruebas de integración: reserva de una sesión en 4 pasos (pantallas + servicios + router + API simulada)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { openPage, loginAs, waitFor, button } from '../helpers.js'

// Recorre los pasos 1 a 3 del asistente: profesional → día 20 a las 09:00 → tipo de sesión
async function completeSteps(page) {
  await waitFor(() => expect(page.text()).toContain('Dra. Elena Ramírez'))
  await page.find('[role="radio"]').trigger('click')
  await button(page, 'Siguiente').trigger('click')
  await page.findAll('.grid-cols-7 button').find((b) => b.text() === '20').trigger('click')
  await waitFor(() => expect(page.find('button.slot').exists()).toBe(true))
  await page.find('button.slot').trigger('click')
  await button(page, 'Siguiente').trigger('click')
  await page.find('[role="radio"]').trigger('click')
  await button(page, 'Siguiente').trigger('click')
}

describe('BookSession', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Reservar con un profesional es el flujo de negocio más importante.
   * - ¿Qué hace esta prueba?: Recorre los 4 pasos y verifica que la API reciba la cita correcta (paciente 7,
   *   profesional 1, 09:00 Lima = 14:00 UTC) y que se muestre la confirmación.
   */
  it('fullFlow_bookASession', async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T10:00:00-05:00'))
    loginAs()
    let sent = null
    server.use(http.post(API + '/appointments', async ({ request }) => {
      sent = await request.json()
      return HttpResponse.json({ id: 555 })
    }))
    const { page, router } = await openPage('/book-session')

    // Act
    await completeSteps(page)
    await button(page, 'Confirmar Reserva').trigger('click')

    // Assert
    await waitFor(() => expect(sent).not.toBeNull())
    expect(sent).toMatchObject({ patientId: 7, professionalId: 1, appointmentDateTime: '2026-10-20T14:00:00.000Z' })
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/appointment-confirmation/555'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si la API falla al reservar, el usuario no debe perder los datos elegidos.
   * - ¿Qué hace esta prueba?: Simula un error 500 y verifica el mensaje, que siga en la reserva y que pueda reintentar.
   */
  it('serverErrorOnBooking_shouldKeepDataAndAllowRetry', async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T10:00:00-05:00'))
    loginAs()
    server.use(http.post(API + '/appointments', () => new HttpResponse(null, { status: 500 })))
    const { page, router } = await openPage('/book-session')
    await completeSteps(page)

    // Act
    await page.find('#bs-notes').setValue('Prefiero por la mañana')
    await button(page, 'Confirmar Reserva').trigger('click')

    // Assert
    await waitFor(() => expect(page.text()).toContain('Error al reservar la cita'))
    expect(router.currentRoute.value.name).toBe('BookSession')
    expect(page.find('#bs-notes').element.value).toBe('Prefiero por la mañana')
    expect(button(page, 'Confirmar Reserva').element.disabled).toBe(false)
  })
})
