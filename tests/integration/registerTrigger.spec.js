// Pruebas de integración: registrar una situación de estrés
// (pantalla + servicio + API simulada + sesión trabajando juntos)
import { StressTriggerService } from '../../src/services/StressTriggerService.js'
import { openPage, loginAs, waitFor } from '../helpers.js'

describe('RegisterTrigger', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Porque los registros de estrés alimentan las estadísticas
   *   del usuario; un registro vacío o incompleto daría información falsa.
   * - ¿Qué hace esta prueba?: Abre la pantalla real, envía el formulario sin completarlo y
   *   verifica que se muestran los errores y que el servicio que guarda en la API nunca se llamó.
   */
  it('incompleteForm_shouldNotBeSentToApi', async () => {
    // Arrange: usuario con sesión y espía del método que guarda en la API
    loginAs()
    const save = vi.spyOn(StressTriggerService.prototype, 'addStressTrigger')
    const { page } = await openPage('/stress/triggers')

    // Act: envía el formulario sin categoría ni descripción
    await page.find('form').trigger('submit')

    // Assert: muestra errores y no llama a la API (como verifyNoInteractions)
    expect(page.text()).toContain('Este campo es obligatorio.')
    expect(save).not.toHaveBeenCalled()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Porque registrar una situación de estrés es la función
   *   principal del módulo; el usuario necesita ver que su registro quedó guardado.
   * - ¿Qué hace esta prueba?: Completa el formulario en la pantalla real, lo envía a la API
   *   simulada y verifica el mensaje de éxito y que el registro aparece en el historial.
   */
  it('completeForm_shouldBeSavedAndShownInList', async () => {
    // Arrange
    loginAs()
    const { page } = await openPage('/stress/triggers')

    // Act: completa y envía el formulario
    await page.find('#trigger-category').setValue('workOverload')
    await page.find('#trigger-description').setValue('Tres entregas el mismo día')
    await page.find('form').trigger('submit')

    // Assert: mensaje de éxito y el registro aparece en el historial
    await waitFor(() => expect(page.text()).toContain('Desencadenante registrado exitosamente'))
    expect(page.text()).toContain('Tres entregas el mismo día')
  })
})
