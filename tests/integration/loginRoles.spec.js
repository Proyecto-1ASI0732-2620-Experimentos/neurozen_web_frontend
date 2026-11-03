// Pruebas de integración: inicio de sesión según el tipo de cuenta (pantalla + AuthService + router)
import { openPage, waitFor } from '../helpers.js'
import { getToken } from '../../src/services/session.js'
import { CREDENTIALS } from '../mocks/data.js'

// Completa y envía el formulario de login
async function submitLogin(page, email, password) {
  await page.find('#email').setValue(email)
  await page.find('#password').setValue(password)
  await page.find('form').trigger('submit')
}

describe('LoginRoles', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El usuario debe saber por qué no puede entrar y no debe quedar una sesión inválida.
   * - ¿Qué hace esta prueba?: Inicia sesión con una contraseña incorrecta y verifica el mensaje y que no haya sesión.
   */
  it('wrongPassword_shouldShowErrorAndNotLogIn', async () => {
    // Arrange
    const { page } = await openPage('/login')

    // Act
    await submitLogin(page, CREDENTIALS.worker.email, 'ClaveIncorrecta')

    // Assert
    await waitFor(() => expect(page.text()).toContain('Correo o contraseña incorrectos'))
    expect(getToken()).toBeNull()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Cada tipo de cuenta tiene su propia área; el administrador no usa las
   *   herramientas del trabajador.
   * - ¿Qué hace esta prueba?: Inicia sesión como administrador y verifica que llegue al panel de verificación.
   */
  it('adminLogin_shouldGoToVerificationPanel', async () => {
    // Arrange
    const { page, router } = await openPage('/login')

    // Act
    await submitLogin(page, CREDENTIALS.admin.email, CREDENTIALS.admin.password)

    // Assert
    await waitFor(() => expect(router.currentRoute.value.name).toBe('AdminProfessionals'))
  })
})
