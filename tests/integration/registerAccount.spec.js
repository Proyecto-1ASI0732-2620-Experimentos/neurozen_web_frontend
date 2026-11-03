// Pruebas de integración: registro con dos tipos de cuenta (pantalla + AuthService + router)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { pendingProfessional } from '../mocks/data.js'
import { openPage, waitFor } from '../helpers.js'

// Completa los campos comunes del formulario de registro
async function fillCommon(page, { name, email }) {
  await page.find('#name').setValue(name)
  await page.find('#email').setValue(email)
  await page.find('#password').setValue('Segura2026')
  await page.find('#confirm').setValue('Segura2026')
}

describe('RegisterAccount', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Un psicólogo recién registrado no puede atender hasta que el administrador
   *   verifique su colegiatura.
   * - ¿Qué hace esta prueba?: Registra a un psicólogo y verifica que llegue a la pantalla "Tu cuenta está en revisión".
   */
  it('psychologistRegistration_shouldEndInPendingReview', async () => {
    // Arrange
    server.use(http.get(API + '/professionals/me', () => HttpResponse.json(pendingProfessional)))
    const { page, router } = await openPage('/register?type=psychologist')

    // Act
    await fillCommon(page, { name: 'Pedro Gómez Ruiz', email: 'pedro@psico.pe' })
    await page.find('#specialty').setValue('organizational')
    await page.find('#license').setValue('C.Ps.P. 99999')
    await page.find('#terms').setValue(true)
    await page.find('form').trigger('submit')

    // Assert
    await waitFor(() => expect(router.currentRoute.value.name).toBe('ProStatus'))
    await waitFor(() => expect(page.text()).toContain('Tu cuenta está en revisión'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Aceptar los Términos y la Política de Privacidad es un requisito legal
   *   porque la plataforma maneja datos de salud.
   * - ¿Qué hace esta prueba?: Envía el registro sin aceptar los términos y verifica el error y que no se llame a la API.
   */
  it('registrationWithoutTerms_shouldNotBeSent', async () => {
    // Arrange
    let requests = 0
    server.use(http.post(API + '/authentication/sign-up', () => {
      requests++
      return HttpResponse.json({})
    }))
    const { page } = await openPage('/register?type=user')

    // Act
    await fillCommon(page, { name: 'Carla Mendoza', email: 'carla@mail.com' })
    await page.find('form').trigger('submit')

    // Assert
    expect(page.text()).toContain('Debes aceptar los Términos y la Política de Privacidad.')
    expect(requests).toBe(0)
  })
})
