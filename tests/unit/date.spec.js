// Pruebas unitarias: hora de las citas (src/utils/date.js)
import { toApiDateTime } from '../../src/utils/date.js'

describe('DateUtils', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Porque la API guarda las citas en hora UTC y el usuario
   *   las elige en hora de Lima (UTC-5). Antes la hora se enviaba sin convertir y las citas
   *   quedaban registradas 5 horas antes de lo elegido.
   * - ¿Qué hace esta prueba?: Convierte una cita del 20 de octubre a las 09:00 (hora de Lima) y
   *   verifica que se envía como las 14:00 UTC.
   */
  it('limaLocalTime_shouldBeSentAsCorrectUtc', () => {
    // Arrange: el usuario elige el 20 de octubre a las 09:00
    const date = '2026-10-20'
    const time = '09:00'

    // Act
    const result = toApiDateTime(date, time)

    // Assert: 09:00 en Lima son las 14:00 en UTC
    expect(result).toBe('2026-10-20T14:00:00.000Z')
  })
})
