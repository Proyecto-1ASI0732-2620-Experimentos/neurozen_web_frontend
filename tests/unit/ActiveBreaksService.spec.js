// Pruebas unitarias: pausas activas (src/services/ActiveBreaksService.js)
import { ActiveBreaksService, DEFAULT_CONFIG } from '../../src/services/ActiveBreaksService.js'

const service = new ActiveBreaksService()
const FRIDAY = new Date(2026, 9, 9) // viernes 9 de octubre de 2026
const SATURDAY = new Date(2026, 9, 10) // sábado 10 de octubre de 2026

describe('ActiveBreaksService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Porque las pausas activas son recordatorios para la
   *   jornada laboral. Antes se programaban también el fin de semana, avisando al usuario en sus
   *   días de descanso.
   * - ¿Qué hace esta prueba?: Con la configuración por defecto (lunes a viernes) pide la agenda
   *   del viernes y la del sábado, y verifica que el viernes sí tiene pausas y el sábado ninguna.
   */
  it('breaks_shouldOnlyBeScheduledOnWorkingDays', () => {
    // Arrange: configuración por defecto (lunes a viernes, 09:00 a 18:00)
    const config = structuredClone(DEFAULT_CONFIG)

    // Act
    const fridaySchedule = service.getSchedule(config, FRIDAY)
    const saturdaySchedule = service.getSchedule(config, SATURDAY)

    // Assert: el viernes hay pausas y el sábado no
    expect(fridaySchedule.length).toBeGreaterThan(0)
    expect(saturdaySchedule).toEqual([])
  })
})
