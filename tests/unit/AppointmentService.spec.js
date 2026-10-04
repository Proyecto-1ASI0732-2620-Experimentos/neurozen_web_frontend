// Pruebas unitarias: servicio de citas (src/services/AppointmentService.js)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { AppointmentService } from '../../src/services/AppointmentService.js'

describe('AppointmentService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Porque la cita debe crearse para el paciente correcto y
   *   con el formato que exige el backend. Antes se enviaba siempre el usuario 1 y el tipo de
   *   sesión como texto, por lo que el backend rechazaba la cita o la asignaba a otra persona.
   * - ¿Qué hace esta prueba?: Arma la cita con los datos del formulario (que llegan como texto) y
   *   verifica que se envían como números, con el paciente real y la hora en UTC.
   */
  it('appointmentData_shouldUseBackendFormat', () => {
    // Arrange: datos tal como vienen del formulario
    const service = new AppointmentService()
    const formData = {
      patientId: '7',
      professionalId: '1',
      date: '2026-10-20',
      time: '09:00',
      appointmentType: '1',
      notes: 'Primera consulta'
    }

    // Act
    const payload = service.buildPayload(formData)

    // Assert: formato exacto que espera el backend
    expect(payload).toEqual({
      patientId: 7,
      professionalId: 1,
      appointmentDateTime: '2026-10-20T14:00:00.000Z',
      appointmentType: 1,
      notasAdicionales: 'Primera consulta'
    })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Porque al reservar para el mismo día no se deben ofrecer
   *   horarios que ya pasaron; el usuario podría elegir una cita imposible de atender.
   * - ¿Qué hace esta prueba?: Fija la hora actual en las 12:30, pide los horarios de hoy sin
   *   respuesta del backend (se usan los horarios por defecto) y verifica que todos son
   *   posteriores a las 12:30.
   */
  it('todaySlots_shouldNotIncludePastHours', async () => {
    // Arrange: son las 12:30 del 10 de octubre y la API no devuelve horarios
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T12:30:00-05:00'))
    server.use(http.get(API + '/professionals/:id/available-slots', () => HttpResponse.json({}, { status: 404 })))

    // Act
    const slots = await new AppointmentService().getAvailableSlots(1, '2026-10-10')

    // Assert: hay horarios y todos son después de las 12:30
    expect(slots.length).toBeGreaterThan(0)
    expect(slots.every((slot) => slot > '12:30')).toBe(true)
  })
})
