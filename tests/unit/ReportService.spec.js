// Pruebas unitarias: informe de progreso compartido con el psicólogo (src/services/ReportService.js)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { ReportService } from '../../src/services/ReportService.js'
import { setSession } from '../../src/services/session.js'
import { user } from '../mocks/data.js'

describe('ReportService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El psicólogo usa el informe para preparar la sesión; debe resumir solo la última semana.
   * - ¿Qué hace esta prueba?: Fija la fecha en el 10 de octubre y verifica que cuente el registro del día 8
   *   y que la categoría más frecuente sea "meeting".
   */
  it('summary_shouldCountLastWeekTriggersAndTopCategory', async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T12:00:00-05:00'))
    setSession({ token: 'token', user })

    // Act
    const summary = await new ReportService().buildSummary()

    // Assert
    expect(summary.triggersCount).toBe(1)
    expect(summary.topCategory).toBe('meeting')
    expect(summary.lastAssessment).toBeNull()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El informe debe llegar al psicólogo correcto y asociado a la cita.
   * - ¿Qué hace esta prueba?: Captura el envío y verifica paciente, psicólogo, cita y nota, sin datos internos de la app.
   */
  it('sharedReport_shouldBeSentToTheAppointmentPsychologist', async () => {
    // Arrange
    setSession({ token: 'token', user })
    let body = null
    server.use(http.post(API + '/reports', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ id: 1, ...body })
    }))
    const summary = { stressCurrent: 60, stressAverage: 55, weeklyChange: -5, triggersCount: 3, isDemoData: false }

    // Act
    await new ReportService().share({ professionalId: 1, appointmentId: 501, summary, note: ' Semana difícil ' })

    // Assert
    expect(body).toMatchObject({ patientId: 7, professionalId: 1, appointmentId: 501, note: 'Semana difícil', stressAverage: 55 })
    expect(body).not.toHaveProperty('isDemoData')
  })
})
