// Pruebas unitarias: cliente HTTP (src/services/HttpClient.js), por aquí pasan todas las peticiones
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { HttpClient } from '../../src/services/HttpClient.js'
import { setSession, setUnauthorizedHandler, getToken } from '../../src/services/session.js'
import { createToken, user } from '../mocks/data.js'

describe('HttpClient', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si el servidor rechaza la sesión (401), la app debe cerrarla y volver al login.
   * - ¿Qué hace esta prueba?: Simula un 401 y verifica que se avise una sola vez (times(1)) y se borre el token.
   */
  it('response401_shouldCloseSessionAndNotifyOnce', async () => {
    // Arrange
    setSession({ token: createToken(), user })
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    server.use(http.get(API + '/triggers', () => HttpResponse.json({}, { status: 401 })))

    // Act + Assert
    await expect(new HttpClient().get('/api/v1/triggers')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(getToken()).toBeNull()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Equivocarse de contraseña no es lo mismo que una sesión vencida.
   * - ¿Qué hace esta prueba?: Un 401 del login no debe disparar la redirección por sesión vencida (verifyNoInteractions).
   */
  it('loginWithWrongPassword_shouldNotBeTreatedAsExpiredSession', async () => {
    // Arrange
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    // Act
    await expect(new HttpClient().post('/api/v1/authentication/sign-in', { username: 'x', password: 'mala' })).rejects.toThrow()

    // Assert
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Sin internet la app debe mostrar un error claro y no romperse.
   * - ¿Qué hace esta prueba?: Simula la red caída y verifica un error con estado 0 (sin conexión).
   */
  it('noConnection_shouldThrowNetworkError', async () => {
    // Arrange
    server.use(http.get(API + '/professionals', () => HttpResponse.error()))

    // Act + Assert
    await expect(new HttpClient().get('/api/v1/professionals')).rejects.toMatchObject({ status: 0 })
  })
})
