// Pruebas unitarias: pausas activas (src/services/ActiveBreaksService.js)
import { ActiveBreaksService, DEFAULT_CONFIG } from '../../src/services/ActiveBreaksService.js'

const service = new ActiveBreaksService()
const FRIDAY = new Date(2026, 9, 9) // viernes 9 de octubre de 2026
const SATURDAY = new Date(2026, 9, 10) // sábado 10 de octubre de 2026

describe('ActiveBreaksService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Las pausas activas son para la jornada laboral; antes también se
   *   programaban el fin de semana.
   * - ¿Qué hace esta prueba?: Con la configuración de lunes a viernes verifica que el viernes tenga pausas y el sábado no.
   */
  it('breaks_shouldOnlyBeScheduledOnWorkingDays', () => {
    // Arrange
    const config = structuredClone(DEFAULT_CONFIG)

    // Act
    const friday = service.getSchedule(config, FRIDAY)
    const saturday = service.getSchedule(config, SATURDAY)

    // Assert
    expect(friday.length).toBeGreaterThan(0)
    expect(saturday).toEqual([])
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si el usuario apaga las pausas, la app no debe seguir recordándoselas.
   * - ¿Qué hace esta prueba?: Desactiva las pausas y verifica que el viernes no tenga ninguna.
   */
  it('disabledBreaks_shouldNotBeScheduled', () => {
    // Arrange
    const config = structuredClone(DEFAULT_CONFIG)
    config.isActive = false

    // Act + Assert
    expect(service.getSchedule(config, FRIDAY)).toEqual([])
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Antes se ignoraban los minutos del horario y las pausas caían en otra hora.
   * - ¿Qué hace esta prueba?: Jornada 09:30-12:00 cada 45 min y verifica 10:15, 11:00 y 11:45.
   */
  it('workdayStartingAt0930_shouldRespectMinutes', () => {
    // Arrange
    const config = structuredClone(DEFAULT_CONFIG)
    config.frequency = 45
    config.settings.workingHours = { start: '09:30', end: '12:00' }

    // Act
    const times = service.getSchedule(config, FRIDAY).map((b) => b.time)

    // Assert
    expect(times).toEqual(['10:15', '11:00', '11:45'])
  })
})
