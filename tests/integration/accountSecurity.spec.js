// Pruebas de integración: seguridad de la cuenta (Ajustes > Seguridad y restablecer contraseña)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { openPage, loginAs, waitFor, button, dialog, dialogButton } from '../helpers.js'
import { getToken } from '../../src/services/session.js'

describe('AccountSecurity', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Equivocarse en la contraseña actual no debe cerrar la sesión del usuario.
   * - ¿Qué hace esta prueba?: El backend responde 400 y verifica el mensaje en el campo y que la sesión siga activa.
   */
  it('wrongCurrentPassword_shouldShowErrorAndKeepSession', async () => {
    // Arrange
    loginAs()
    server.use(http.put(API + '/users/:id/password', () => HttpResponse.json({ message: 'Wrong password' }, { status: 400 })))
    const { page } = await openPage('/settings?tab=security')

    // Act
    await page.find('#cp-current').setValue('Equivocada1')
    await page.find('#cp-new').setValue('Nueva2026x')
    await page.find('#cp-confirm').setValue('Nueva2026x')
    await page.find('#panel-security form').trigger('submit')

    // Assert
    await waitFor(() => expect(page.text()).toContain('La contraseña actual no es correcta.'))
    expect(getToken()).not.toBeNull()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Eliminar la cuenta es irreversible; se exige escribir el correo para evitar errores.
   * - ¿Qué hace esta prueba?: Con un correo equivocado no se elimina; con el correcto se elimina, se cierra la sesión
   *   y se vuelve al login.
   */
  it('deleteAccount_shouldRequireTypingTheEmail', async () => {
    // Arrange
    loginAs()
    let deleted = 0
    server.use(http.delete(API + '/users/:id', () => {
      deleted++
      return new HttpResponse(null, { status: 204 })
    }))
    const { page, router } = await openPage('/settings?tab=security')

    // Act: correo equivocado
    await button(page, 'Eliminar mi cuenta').trigger('click')
    await dialog().find('input').setValue('otro@mail.com')
    await dialogButton('Eliminar mi cuenta').trigger('click')
    const deletedWithWrongEmail = deleted

    // Act: correo correcto
    await dialog().find('input').setValue('ana@neurozen.com')
    await dialogButton('Eliminar mi cuenta').trigger('click')

    // Assert
    expect(deletedWithWrongEmail).toBe(0)
    await waitFor(() => expect(deleted).toBe(1))
    await waitFor(() => expect(router.currentRoute.value.name).toBe('Login'))
    expect(getToken()).toBeNull()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Quien olvidó su contraseña debe poder crear una nueva con el enlace del correo.
   * - ¿Qué hace esta prueba?: Abre el enlace con token, guarda una contraseña segura y verifica el envío y el regreso al login.
   */
  it('resetPasswordLink_shouldSaveNewPassword', async () => {
    // Arrange
    let body = null
    server.use(http.post(API + '/authentication/reset-password', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ message: 'ok' })
    }))
    const { page, router } = await openPage('/reset-password?token=abc123')

    // Act
    await page.find('#rp-new').setValue('Final2026')
    await page.find('#rp-confirm').setValue('Final2026')
    await page.find('form').trigger('submit')

    // Assert
    await waitFor(() => expect(body).toEqual({ token: 'abc123', newPassword: 'Final2026' }))
    await waitFor(() => expect(router.currentRoute.value.name).toBe('Login'))
  })
})
