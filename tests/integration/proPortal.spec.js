// Pruebas de integración: portal del psicólogo verificado (pantallas + ProfessionalService + API simulada)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { verifiedProfessional } from '../mocks/data.js'
import { openPage, loginAs, waitFor, button } from '../helpers.js'

describe('ProPortal', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El psicólogo debe confirmar las citas que recibe para que el paciente sepa
   *   que su sesión está asegurada.
   * - ¿Qué hace esta prueba?: Confirma la cita 501 en "Horario" y verifica que la API reciba CONFIRMED y que
   *   la cita se muestre como confirmada.
   */
  it('confirmAppointment_shouldSendConfirmedStatus', async () => {
    // Arrange
    loginAs('psychologist')
    let received = null
    server.use(http.patch(API + '/appointments/:id/status', async ({ params, request }) => {
      received = { id: params.id, ...(await request.json()) }
      return HttpResponse.json({})
    }))
    const { page } = await openPage('/pro/schedule')
    await waitFor(() => expect(button(page, 'Confirmar')).toBeTruthy())

    // Act
    await button(page, 'Confirmar').trigger('click')

    // Assert
    await waitFor(() => expect(received).toEqual({ id: '501', status: 'CONFIRMED' }))
    await waitFor(() => expect(page.text()).toContain('Confirmada'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Verificado no es lo mismo que perfil completo; la biografía ayuda a que
   *   los pacientes lo elijan.
   * - ¿Qué hace esta prueba?: Con la biografía vacía (3 de 4 pasos), la completa y verifica que suba a 4 de 4
   *   y que la API reciba la biografía.
   */
  it('completingBio_shouldCompleteProfileAndSaveIt', async () => {
    // Arrange
    loginAs('psychologist')
    let body = null
    server.use(
      http.get(API + '/professionals/me', () => HttpResponse.json({ ...verifiedProfessional, bio: '' })),
      http.put(API + '/professionals/me', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...verifiedProfessional, ...body })
      })
    )
    const { page } = await openPage('/pro/profile')
    await waitFor(() => expect(page.text()).toContain('3 de 4 pasos completados'))

    // Act
    await page.find('#pp-bio').setValue('Psicóloga clínica con enfoque cognitivo-conductual en estrés laboral.')
    await page.find('main form').trigger('submit')

    // Assert
    expect(page.text()).toContain('4 de 4 pasos completados')
    await waitFor(() => expect(body.bio).toContain('enfoque cognitivo-conductual'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El informe que comparte el paciente (US15) solo sirve si el psicólogo lo ve
   *   antes de la sesión.
   * - ¿Qué hace esta prueba?: Abre la ficha de la paciente en "Pacientes" y verifica que muestre su informe y su mensaje.
   */
  it('patientCard_shouldShowSharedReport', async () => {
    // Arrange
    loginAs('psychologist')
    server.use(http.get(API + '/reports', () => HttpResponse.json([
      { id: 1, patientId: 7, professionalId: 1, stressCurrent: 70, stressAverage: 62, triggersCount: 4, note: 'Semana de cierre muy pesada', createdAt: '2026-10-09T10:00:00Z' }
    ])))
    const { page } = await openPage('/pro/patients')
    await waitFor(() => expect(page.text()).toContain('Ana Torres'))

    // Act
    await page.find('main ul > li button').trigger('click')

    // Assert
    await waitFor(() => expect(page.text()).toContain('Informes compartidos'))
    expect(page.text()).toContain('62/100')
    expect(page.text()).toContain('Semana de cierre muy pesada')
  })
})
