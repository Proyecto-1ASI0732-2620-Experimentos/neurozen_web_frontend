// Pruebas unitarias: cuenta del usuario (src/services/UserService.js)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { UserService } from '../../src/services/UserService.js'

describe('UserService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Para cambiar la contraseña el backend debe recibir la actual (para validar)
   *   y la nueva, en la cuenta correcta.
   * - ¿Qué hace esta prueba?: Captura la petición y verifica el usuario y ambas contraseñas.
   */
  it('changePassword_shouldSendCurrentAndNewPassword', async () => {
    // Arrange
    let received = null
    server.use(http.put(API + '/users/:id/password', async ({ params, request }) => {
      received = { id: params.id, ...(await request.json()) }
      return new HttpResponse(null, { status: 204 })
    }))

    // Act
    await new UserService().changePassword(7, { currentPassword: 'Secreta123', newPassword: 'Nueva2026x' })

    // Assert
    expect(received).toEqual({ id: '7', currentPassword: 'Secreta123', newPassword: 'Nueva2026x' })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Los datos opcionales del onboarding (edad, ocupación, tipo de trabajo)
   *   deben guardarse en el perfil para personalizar la experiencia.
   * - ¿Qué hace esta prueba?: Actualiza el perfil con esos datos y verifica que lleguen a la API.
   */
  it('onboardingData_shouldBeSavedInTheProfile', async () => {
    // Arrange
    let body = null
    server.use(http.put(API + '/users/:id', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json(body)
    }))

    // Act
    await new UserService().updateProfile(7, { username: 'ana@neurozen.com', email: 'ana@neurozen.com', fullName: 'Ana Torres', ageRange: '25-34', occupation: 'Analista', workType: 'formal' })

    // Assert
    expect(body).toMatchObject({ ageRange: '25-34', occupation: 'Analista', workType: 'formal' })
  })
})
