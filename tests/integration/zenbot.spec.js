// Prueba de integración: ZenBot dentro de la aplicación (widget + motor de respuestas)
import { openPage, loginAs, waitFor, pause } from '../helpers.js'

describe('ZenBotWidget', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Ante un mensaje de crisis, el usuario debe ver de inmediato las líneas de ayuda.
   * - ¿Qué hace esta prueba?: Abre ZenBot, escribe "ya no quiero vivir" y verifica la respuesta con la Línea 113
   *   y la opción de hablar con un especialista.
   */
  it('crisisMessage_shouldShowHelpLines', async () => {
    // Arrange
    loginAs()
    const { page } = await openPage('/')
    await page.find('button[aria-label="Abrir ZenBot, tu asistente"]').trigger('click')

    // Act
    await page.find('#zenbot-input').setValue('ya no quiero vivir')
    await page.find('section[role="dialog"] form').trigger('submit')
    await pause(250)

    // Assert
    await waitFor(() => expect(page.find('a[href="tel:113"]').exists()).toBe(true))
    expect(page.text()).toContain('Hablar con un especialista')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: ZenBot debe llevar al usuario a la herramienta adecuada según lo que escribe.
   * - ¿Qué hace esta prueba?: Escribe "no puedo dormir" y verifica la respuesta sobre el sueño con enlace a recursos.
   */
  it('sleepMessage_shouldSuggestResources', async () => {
    // Arrange
    loginAs()
    const { page } = await openPage('/')
    await page.find('button[aria-label="Abrir ZenBot, tu asistente"]').trigger('click')

    // Act
    await page.find('#zenbot-input').setValue('no puedo dormir')
    await page.find('section[role="dialog"] form').trigger('submit')
    await pause(550)

    // Assert
    await waitFor(() => expect(page.text()).toContain('Dormir mal aumenta el estrés'))
    expect(page.find('section[role="dialog"] a[href="/stress/resources"]').exists()).toBe(true)
  })
})
