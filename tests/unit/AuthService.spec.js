// Pruebas unitarias: inicio de sesión y registro (src/services/AuthService.js)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { AuthService } from '../../src/services/AuthService.js'
import { ApiError } from '../../src/services/ApiError.js'
import { getToken, getCurrentUser } from '../../src/services/session.js'
import { CREDENTIALS } from '../mocks/data.js'

describe('AuthService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El login debe llamar a la API una sola vez con el correo limpio y guardar la sesión.
   * - ¿Qué hace esta prueba?: Usa mocks (como Mockito) y verifica la llamada (times(1)) y el token guardado.
   */
  it('successfulLogin_shouldCallApiOnceAndSaveSession', async () => {
    // Arrange
    const service = new AuthService()
    service.httpClient.post = vi.fn().mockResolvedValue({ id: 7, token: 'token-123', role: 'USER' })
    service.httpClient.get = vi.fn().mockResolvedValue({ id: 7, fullName: 'Ana Torres' })

    // Act
    await service.login('  ana@neurozen.com ', 'Secreta123')

    // Assert
    expect(service.httpClient.post).toHaveBeenCalledTimes(1)
    expect(service.httpClient.post).toHaveBeenCalledWith('/api/v1/authentication/sign-in', { username: 'ana@neurozen.com', password: 'Secreta123' })
    expect(getToken()).toBe('token-123')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Con una contraseña incorrecta no debe quedar ninguna sesión guardada.
   * - ¿Qué hace esta prueba?: La API responde 401 (mock); verifica el error y que no se pida el perfil (verifyNoInteractions).
   */
  it('wrongPassword_shouldThrowErrorAndNotSaveSession', async () => {
    // Arrange
    const service = new AuthService()
    service.httpClient.post = vi.fn().mockRejectedValue(new ApiError('Unauthorized', { status: 401 }))
    service.httpClient.get = vi.fn()

    // Act + Assert
    await expect(service.login('ana@neurozen.com', 'mala')).rejects.toThrow()
    expect(getToken()).toBeNull()
    expect(service.httpClient.get).not.toHaveBeenCalled()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Al iniciar sesión, el psicólogo debe conocer su estado de verificación
   *   para entrar a su panel o a la pantalla de revisión.
   * - ¿Qué hace esta prueba?: Inicia sesión como psicóloga y verifica rol, estado "verified" e id profesional.
   */
  it('psychologistLogin_shouldLoadVerificationStatus', async () => {
    // Act
    await new AuthService().login(CREDENTIALS.psychologist.email, CREDENTIALS.psychologist.password)

    // Assert
    const user = getCurrentUser()
    expect(user.role).toBe('psychologist')
    expect(user.verificationStatus).toBe('verified')
    expect(user.professionalId).toBe(1)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El registro del psicólogo debe enviar el rol, la especialidad, la colegiatura
   *   y la aceptación de términos para que el administrador pueda verificarlo.
   * - ¿Qué hace esta prueba?: Captura lo que llega a la API y verifica cada dato del registro.
   */
  it('psychologistRegistration_shouldSendLicenseAndRole', async () => {
    // Arrange
    let body = null
    server.use(http.post(API + '/authentication/sign-up', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ id: 99, role: 'PSYCHOLOGIST' })
    }))

    // Act
    await new AuthService().register({
      name: 'Pedro Gómez', email: 'pedro@psico.pe', password: 'Segura2026', role: 'psychologist',
      specialty: 'clinical', licenseNumber: '99999', acceptedTerms: true
    })

    // Assert
    expect(body).toMatchObject({ role: 'PSYCHOLOGIST', specialty: 'clinical', licenseNumber: '99999', acceptedTerms: true, email: 'pedro@psico.pe' })
  })
})
