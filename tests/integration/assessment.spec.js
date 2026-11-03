// Pruebas de integración: test de autoevaluación de estrés (pantalla + AssessmentService + API simulada)
import { openPage, loginAs, waitFor, button, pause } from '../helpers.js'

describe('AssessmentPage', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El test es la primera experiencia del trabajador tras registrarse (US04);
   *   el resultado y sus recomendaciones deben ser correctos.
   * - ¿Qué hace esta prueba?: Responde las 10 preguntas con "Con frecuencia" y verifica 22/40, "Estrés moderado"
   *   y la recomendación de respiración guiada.
   */
  it('completeTest_shouldShowModerateResultWithRecommendations', async () => {
    // Arrange
    loginAs()
    const { page } = await openPage('/assessment')
    await button(page, 'Comenzar test').trigger('click')

    // Act: responde las 10 preguntas (la pantalla avanza sola tras cada respuesta)
    for (let i = 1; i <= 10; i++) {
      await waitFor(() => expect(page.text()).toContain(`Pregunta ${i} de 10`))
      await page.findAll('[role="radio"]').find((r) => r.text().includes('Con frecuencia')).trigger('click')
      await pause(260)
    }
    await button(page, 'Ver resultado').trigger('click')

    // Assert
    await waitFor(() => expect(page.text()).toContain('22/40'))
    expect(page.text()).toContain('Estrés moderado')
    expect(page.text()).toContain('Respiración guiada')
  })
})
