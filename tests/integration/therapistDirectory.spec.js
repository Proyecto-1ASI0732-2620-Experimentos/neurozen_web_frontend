// Pruebas de integración: directorio de psicólogos y reserva directa
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { verifiedProfessional } from '../mocks/data.js'
import { openPage, loginAs, waitFor } from '../helpers.js'

describe('TherapistDirectory', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Muchos trabajadores solo pueden asistir fuera de su horario laboral; el filtro
   *   de disponibilidad debe mostrar solo a quienes atienden en esos días.
   * - ¿Qué hace esta prueba?: Con una psicóloga de lunes a miércoles y otro de fin de semana, filtra "Fines de semana"
   *   y verifica que solo quede el segundo.
   */
  it('weekendFilter_shouldShowOnlyWeekendPsychologists', async () => {
    // Arrange
    loginAs()
    server.use(http.get(API + '/professionals', () => HttpResponse.json([
      { ...verifiedProfessional, availability: 'Lun, Mié · 09:00 - 13:00' },
      { ...verifiedProfessional, id: 3, name: 'Dr. Carlos Medina', availability: 'Sáb, Dom · 10:00 - 14:00' }
    ])))
    const { page } = await openPage('/therapists')
    await waitFor(() => expect(page.text()).toContain('Dr. Carlos Medina'))

    // Act
    await page.findAll('main select')[1].setValue('weekends')

    // Assert
    expect(page.text()).toContain('Dr. Carlos Medina')
    expect(page.text()).not.toContain('Dra. Elena Ramírez')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: La reserva directa desde el perfil debe usar el mismo contrato que el asistente:
   *   paciente real, hora en UTC y los datos de contacto en las notas.
   * - ¿Qué hace esta prueba?: Reserva el día 20 a las 09:00 y verifica lo que recibe la API y la redirección a la confirmación.
   */
  it('directBooking_shouldSendPatientTimeAndContact', async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T10:00:00-05:00'))
    loginAs()
    let body = null
    server.use(http.post(API + '/appointments', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ id: 555 })
    }))
    const { page, router } = await openPage('/book-appointment/1')
    await waitFor(() => expect(page.find('#ba-date').exists()).toBe(true))

    // Act
    await page.find('#ba-date').setValue('2026-10-20')
    await page.find('#ba-date').trigger('change')
    await waitFor(() => expect(page.find('button.slot').exists()).toBe(true))
    await page.find('button.slot').trigger('click')
    await page.find('#ba-phone').setValue('987654321')
    await page.find('main form').trigger('submit')

    // Assert
    await waitFor(() => expect(body).not.toBeNull())
    expect(body).toMatchObject({ patientId: 7, professionalId: 1, appointmentDateTime: '2026-10-20T14:00:00.000Z' })
    expect(body.notasAdicionales).toContain('987654321')
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/appointment-confirmation/555'))
  })
})
