// Pruebas unitarias: sesión del usuario (src/services/session.js)
import { setSession, isAuthenticated, getToken, readUserData, writeUserData } from '../../src/services/session.js'
import { createToken, user } from '../mocks/data.js'

describe('Session', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Con un token vencido el usuario quedaba atrapado en la app.
   * - ¿Qué hace esta prueba?: Guarda un token vencido y verifica que la sesión se cierre.
   */
  it('expiredToken_shouldNotBeAuthenticated', () => {
    // Arrange
    setSession({ token: createToken(-60), user })

    // Act
    const result = isAuthenticated()

    // Assert
    expect(result).toBe(false)
    expect(getToken()).toBeNull()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: En un equipo compartido, un usuario no debe ver los datos de otro.
   * - ¿Qué hace esta prueba?: El usuario 7 guarda un favorito y verifica que el usuario 8 no lo vea.
   */
  it('anotherUser_shouldNotSeePreviousUserData', () => {
    // Arrange
    setSession({ token: 'token', user: { id: 7 } })
    writeUserData('neurozen_favorites', [101])

    // Act
    setSession({ token: 'token', user: { id: 8 } })

    // Assert
    expect(readUserData('neurozen_favorites', [])).toEqual([])
  })
})
