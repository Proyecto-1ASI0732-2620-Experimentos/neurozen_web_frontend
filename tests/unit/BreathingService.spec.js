// Pruebas unitarias: historial de sesiones de respiración (src/services/BreathingService.js)
import { BreathingService } from '../../src/services/BreathingService.js'
import { setSession } from '../../src/services/session.js'
import { user } from '../mocks/data.js'

describe('BreathingService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Antes la sesión de respiración nunca se guardaba y el usuario perdía su progreso.
   * - ¿Qué hace esta prueba?: Guarda dos sesiones y verifica que aparezcan en el historial, la más reciente primero.
   */
  it('completedSessions_shouldBeSavedNewestFirst', () => {
    // Arrange
    setSession({ token: 'token', user })
    const service = new BreathingService()

    // Act
    service.saveSession({ exerciseId: 1, duration: 300, mood: 3 })
    service.saveSession({ exerciseId: 2, duration: 240, mood: 5 })

    // Assert
    const history = service.getHistory()
    expect(history).toHaveLength(2)
    expect(history[0].exerciseId).toBe(2)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Las notas del usuario se guardan en el dispositivo; deben limpiarse y limitarse.
   * - ¿Qué hace esta prueba?: Guarda una nota con espacios y muy larga, y verifica que se recorte a 500 caracteres.
   */
  it('sessionNotes_shouldBeTrimmedAndLimited', () => {
    // Arrange
    setSession({ token: 'token', user })
    const longNote = '  ' + 'a'.repeat(600)

    // Act
    const entry = new BreathingService().saveSession({ exerciseId: 1, duration: 300, notes: longNote })

    // Assert
    expect(entry.notes.startsWith('a')).toBe(true)
    expect(entry.notes).toHaveLength(500)
  })
})
