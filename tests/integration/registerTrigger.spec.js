// Pruebas de integración: registrar una situación de estrés (pantalla + servicio + API simulada + sesión)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { StressTriggerService } from '../../src/services/StressTriggerService.js'
import { openPage, loginAs, waitFor } from '../helpers.js'

describe('RegisterTrigger', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Un registro incompleto daría estadísticas de estrés falsas.
   * - ¿Qué hace esta prueba?: Envía el formulario vacío y verifica los errores y que nunca se llame a la API.
   */
  it('incompleteForm_shouldNotBeSentToApi', async () => {
    // Arrange
    loginAs()
    const save = vi.spyOn(StressTriggerService.prototype, 'addStressTrigger')
    const { page } = await openPage('/stress/triggers')

    // Act
    await page.find('form').trigger('submit')

    // Assert
    expect(page.text()).toContain('Este campo es obligatorio.')
    expect(save).not.toHaveBeenCalled()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Registrar el estrés es la función principal del módulo; el usuario debe ver su registro.
   * - ¿Qué hace esta prueba?: Completa y envía el formulario, y verifica el mensaje de éxito y el registro en el historial.
   */
  it('completeForm_shouldBeSavedAndShownInList', async () => {
    // Arrange
    loginAs()
    const { page } = await openPage('/stress/triggers')

    // Act
    await page.find('#trigger-category').setValue('workOverload')
    await page.find('#trigger-description').setValue('Tres entregas el mismo día')
    await page.find('form').trigger('submit')

    // Assert
    await waitFor(() => expect(page.text()).toContain('Desencadenante registrado exitosamente'))
    expect(page.text()).toContain('Tres entregas el mismo día')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si el servidor falla, el usuario no debe perder lo que escribió.
   * - ¿Qué hace esta prueba?: Simula un error 500 y verifica el mensaje de error y que el texto siga en el formulario.
   */
  it('serverErrorOnSave_shouldKeepWhatTheUserWrote', async () => {
    // Arrange
    loginAs()
    server.use(http.post(API + '/triggers', () => new HttpResponse(null, { status: 500 })))
    const { page } = await openPage('/stress/triggers')

    // Act
    await page.find('#trigger-category').setValue('meeting')
    await page.find('#trigger-description').setValue('Reunión improvisada')
    await page.find('form').trigger('submit')

    // Assert
    await waitFor(() => expect(page.text()).toContain('Error al guardar el registro'))
    expect(page.find('#trigger-description').element.value).toBe('Reunión improvisada')
  })
})
