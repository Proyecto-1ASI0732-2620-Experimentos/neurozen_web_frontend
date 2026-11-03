// Pruebas unitarias: servicio de citas (src/services/AppointmentService.js)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { AppointmentService } from '../../src/services/AppointmentService.js'

describe('AppointmentService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: La cita debe crearse para el paciente correcto y con el formato del backend.
   *   Antes se enviaba siempre el usuario 1 y el tipo de sesión como texto.
   * - ¿Qué hace esta prueba?: Arma la cita con datos del formulario (texto) y verifica números, paciente real y hora UTC.
   */
  it('appointmentData_shouldUseBackendFormat', () => {
    // Arrange
    const service = new AppointmentService()

    // Act
    const payload = service.buildPayload({
      patientId: '7', professionalId: '1', date: '2026-10-20', time: '09:00', appointmentType: '1', notes: ' Primera consulta '
    })

    // Assert
    expect(payload).toEqual({
      patientId: 7, professionalId: 1, appointmentDateTime: '2026-10-20T14:00:00.000Z', appointmentType: 1, notasAdicionales: 'Primera consulta'
    })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Al reservar para hoy no se deben ofrecer horas que ya pasaron.
   * - ¿Qué hace esta prueba?: Fija las 12:30, simula que la API no da horarios y verifica que todos sean posteriores.
   */
  it('todaySlots_shouldNotIncludePastHours', async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T12:30:00-05:00'))
    server.use(http.get(API + '/professionals/:id/available-slots', () => HttpResponse.json({}, { status: 404 })))

    // Act
    const slots = await new AppointmentService().getAvailableSlots(1, '2026-10-10')

    // Assert
    expect(slots.length).toBeGreaterThan(0)
    expect(slots.every((slot) => slot > '12:30')).toBe(true)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si el backend no tiene el endpoint de tipos, la reserva no debe bloquearse.
   * - ¿Qué hace esta prueba?: Simula un 404 y verifica que se usen los tipos por defecto con ids numéricos.
   */
  it('appointmentTypesWithoutBackend_shouldUseNumericDefaults', async () => {
    // Arrange
    server.use(http.get(API + '/appointments/types', () => HttpResponse.json({}, { status: 404 })))

    // Act
    const types = await new AppointmentService().getAppointmentTypes()

    // Assert
    expect(types.map((t) => t.id)).toEqual([1, 2, 3])
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El paciente debe poder cancelar su cita y el backend debe recibir el estado correcto.
   * - ¿Qué hace esta prueba?: Cancela la cita 501 y verifica que se envíe { status: 'CANCELLED' } a ese id.
   */
  it('cancelAppointment_shouldSendCancelledStatus', async () => {
    // Arrange
    let received = null
    server.use(http.patch(API + '/appointments/:id/status', async ({ params, request }) => {
      received = { id: params.id, body: await request.json() }
      return HttpResponse.json({})
    }))

    // Act
    await new AppointmentService().cancelAppointment(501)

    // Assert
    expect(received).toEqual({ id: '501', body: { status: 'CANCELLED' } })
  })
})
