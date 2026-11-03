// Pruebas unitarias: portal del psicólogo (src/services/ProfessionalService.js)
import { profileSteps, availabilityText, appointmentState, ProfessionalService } from '../../src/services/ProfessionalService.js'
import { verifiedProfessional } from '../mocks/data.js'

describe('ProfessionalService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Estar verificado no es lo mismo que tener el perfil completo; el paciente
   *   necesita ver biografía, tarifa y horario para elegir.
   * - ¿Qué hace esta prueba?: Con un perfil verificado pero vacío, verifica que solo 1 de 4 pasos esté completo.
   */
  it('verifiedButEmptyProfile_shouldHaveOnlyOneStepDone', () => {
    // Arrange
    const profile = { verificationStatus: 'verified', bio: '', price: 0, experienceYears: 0, availabilitySchedule: null }

    // Act
    const done = profileSteps(profile).filter((s) => s.done).map((s) => s.key)

    // Assert
    expect(done).toEqual(['license'])
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El directorio muestra la disponibilidad como texto y la usa para filtrar.
   * - ¿Qué hace esta prueba?: Convierte lunes y miércoles de 09:00 a 13:00 en "Lun, Mié · 09:00 - 13:00".
   */
  it('availability_shouldBeShownAsReadableText', () => {
    // Act
    const text = availabilityText({ days: ['wednesday', 'monday'], start: '09:00', end: '13:00' })

    // Assert
    expect(text).toBe('Lun, Mié · 09:00 - 13:00')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El backend puede enviar el estado de la cita con distintos nombres;
   *   las acciones del psicólogo dependen de él.
   * - ¿Qué hace esta prueba?: Verifica que "SCHEDULED", "CONFIRMED", "COMPLETED" y "CANCELED" se agrupen bien.
   */
  it('appointmentStatuses_shouldBeGroupedForTheInterface', () => {
    // Act + Assert
    expect(appointmentState({ status: 'SCHEDULED' })).toBe('pending')
    expect(appointmentState({ status: 'CONFIRMED' })).toBe('confirmed')
    expect(appointmentState({ status: 'COMPLETED' })).toBe('completed')
    expect(appointmentState({ status: 'CANCELED' })).toBe('cancelled')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Al guardar solo la disponibilidad no se deben borrar la tarifa ni la experiencia.
   * - ¿Qué hace esta prueba?: Guarda solo la disponibilidad (mocks) y verifica que el PUT envíe el perfil completo.
   */
  it('savingOnlyAvailability_shouldKeepTheOtherProfileData', async () => {
    // Arrange
    const service = new ProfessionalService()
    service.httpClient.get = vi.fn().mockResolvedValue(verifiedProfessional)
    service.httpClient.put = vi.fn().mockResolvedValue(null)

    // Act
    await service.updateMyProfile({ availabilitySchedule: { days: ['friday'], start: '15:00', end: '18:00' } })

    // Assert
    expect(service.httpClient.put).toHaveBeenCalledTimes(1)
    const payload = service.httpClient.put.mock.calls[0][1]
    expect(payload.price).toBe(80)
    expect(payload.experienceYears).toBe(8)
    expect(payload.availability).toBe('Vie · 15:00 - 18:00')
  })
})
