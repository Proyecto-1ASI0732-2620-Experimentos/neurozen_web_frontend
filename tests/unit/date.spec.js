// Pruebas unitarias: fechas y horas de las citas (src/utils/date.js)
import { toApiDateTime, toLocalISODate } from '../../src/utils/date.js'

describe('DateUtils', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: La API guarda las citas en UTC y el usuario elige la hora de Lima.
   *   Antes la hora se enviaba sin convertir y las citas quedaban 5 horas antes.
   * - ¿Qué hace esta prueba?: Convierte las 09:00 de Lima y verifica que se envíen como 14:00 UTC.
   */
  it('limaLocalTime_shouldBeSentAsCorrectUtc', () => {
    // Arrange
    const date = '2026-10-20'
    const time = '09:00'

    // Act
    const result = toApiDateTime(date, time)

    // Assert
    expect(result).toBe('2026-10-20T14:00:00.000Z')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Después de las 19:00 en Lima ya es el día siguiente en UTC; los
   *   formularios mostraban la fecha de mañana y permitían registrar fechas futuras.
   * - ¿Qué hace esta prueba?: Fija las 20:30 del día 10 y verifica que la fecha de hoy sea el 10, no el 11.
   */
  it('after7pm_todayShouldBeTheLocalDate', () => {
    // Arrange
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T20:30:00-05:00'))

    // Act
    const today = toLocalISODate()

    // Assert
    expect(today).toBe('2026-10-10')
  })
})
