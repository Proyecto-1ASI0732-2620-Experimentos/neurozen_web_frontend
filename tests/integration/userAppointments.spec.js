// Pruebas de integración: "Mis citas" del trabajador (pantalla + servicios + API simulada)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { openPage, loginAs, waitFor, button, dialog, dialogButton } from '../helpers.js'

describe('UserAppointments', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El paciente debe poder cancelar una cita próxima si no podrá asistir.
   * - ¿Qué hace esta prueba?: Cancela la cita 501 desde "Mis citas" y verifica que la API reciba CANCELLED
   *   y que la cita se muestre como cancelada.
   */
  it('cancelUpcomingAppointment_shouldMarkItAsCancelled', async () => {
    // Arrange
    loginAs()
    let received = null
    server.use(http.patch(API + '/appointments/:id/status', async ({ params, request }) => {
      received = { id: params.id, ...(await request.json()) }
      return HttpResponse.json({})
    }))
    const { page } = await openPage('/appointments')
    await waitFor(() => expect(button(page, 'Cancelar cita')).toBeTruthy())

    // Act
    await button(page, 'Cancelar cita').trigger('click')
    await dialogButton('Cancelar cita').trigger('click')

    // Assert
    await waitFor(() => expect(received).toEqual({ id: '501', status: 'CANCELLED' }))
    await waitFor(() => expect(page.text()).toContain('Cancelada'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Las valoraciones ayudan a otros pacientes a elegir; deben venir de sesiones
   *   atendidas y tener una puntuación.
   * - ¿Qué hace esta prueba?: Intenta calificar sin estrellas (error, no se envía) y luego con 5 estrellas (se envía).
   */
  it('reviewCompletedSession_shouldRequireStars', async () => {
    // Arrange
    loginAs()
    let body = null
    server.use(http.post(API + '/professionals/:id/reviews', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ id: 1 })
    }))
    const { page } = await openPage('/appointments')
    await waitFor(() => expect(button(page, 'Calificar')).toBeTruthy())

    // Act: sin estrellas
    await button(page, 'Calificar').trigger('click')
    await dialogButton('Enviar calificación').trigger('click')
    const errorShown = dialog().text().includes('Elige de 1 a 5 estrellas.')

    // Act: con 5 estrellas
    await dialog().findAll('[role="radio"]')[4].trigger('click')
    await dialogButton('Enviar calificación').trigger('click')

    // Assert
    expect(errorShown).toBe(true)
    await waitFor(() => expect(body).toMatchObject({ appointmentId: 502, rating: 5 }))
  })
})
