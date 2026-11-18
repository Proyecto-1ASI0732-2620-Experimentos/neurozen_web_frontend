// Pruebas de integración: lecturas y ejercicios en la biblioteca (lista por plan y página de lectura)
import { server } from '../mocks/server.js'
import { useLibrary } from '../mocks/library.js'
import { openPage, loginAs, waitFor, button } from '../helpers.js'

const categoryCount = (page, label) => {
  const chip = page.findAll('[role="group"] button').find((b) => b.text().startsWith(label))
  return Number(chip.find('span.text-xs').text())
}

describe('ReadingsLibrary', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Un usuario Básico recibe 2 lecturas y 2 ejercicios (la lista ya viene filtrada por plan).
   */
  it('basicUser_shouldSeeTwoReadingsAndTwoExercises', async () => {
    loginAs('user')
    useLibrary(server, { plan: 1, withReadings: true })
    const { page } = await openPage('/stress/resources')
    await waitFor(() => expect(page.text()).toContain('Lectura 1'))
    expect(categoryCount(page, 'Lectura')).toBe(2)
    expect(categoryCount(page, 'Ejercicios')).toBe(2)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Un usuario Avanzado recibe las 50 lecturas y los 20 ejercicios.
   */
  it('advancedUser_shouldSeeFiftyReadingsAndTwentyExercises', async () => {
    loginAs('user')
    useLibrary(server, { plan: 2, withReadings: true })
    const { page } = await openPage('/stress/resources')
    await waitFor(() => expect(page.text()).toContain('Lectura 50'))
    expect(categoryCount(page, 'Lectura')).toBe(50)
    expect(categoryCount(page, 'Ejercicios')).toBe(20)

    await button(page, 'Lectura').trigger('click')
    expect(page.findAll('main ul.grid > li')).toHaveLength(50)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: La lectura respeta subtítulos, párrafos y listas, y NUNCA interpreta HTML.
   */
  it('reading_shouldRenderParagraphsHeadingsListsAndNeverHtml', async () => {
    loginAs('user')
    useLibrary(server, { plan: 2, withReadings: true })
    const { page } = await openPage('/stress/resources/1000')
    await waitFor(() => expect(page.find('[data-testid="reading-content"]').exists()).toBe(true))
    const content = page.find('[data-testid="reading-content"]')
    expect(content.findAll('h3').map((h) => h.text())).toEqual(['Qué es el estrés laboral', 'Señales frecuentes'])
    expect(content.findAll('li').map((li) => li.text())).toEqual(['Cansancio', 'Irritabilidad'])
    expect(content.find('p').text()).toContain('El estrés aparece cuando las demandas superan los recursos.\nPuede afectar el sueño.')
    // El texto con etiquetas se muestra literal: no se crea <b> ni <script>
    expect(content.text()).toContain('<b>No es HTML</b>')
    expect(content.find('b').exists()).toBe(false)
    expect(content.find('script').exists()).toBe(false)
    expect(page.find('[data-testid="resource-duration"]').text()).toBe('5 min de lectura')
    expect(page.text()).toContain('estrés') // etiquetas
    expect(page.find('iframe').exists()).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Un ejercicio con video muestra el reproductor encima de los pasos (lista numerada).
   */
  it('exerciseWithVideo_shouldShowPlayerAboveNumberedSteps', async () => {
    loginAs('user')
    useLibrary(server, { plan: 2, withReadings: true })
    const { page } = await openPage('/stress/resources/2000')
    await waitFor(() => expect(page.find('iframe').exists()).toBe(true))
    expect(page.find('iframe').attributes('src')).toContain('/embed/Ki-y10XIVA8')
    const steps = page.find('[data-testid="reading-content"] ol')
    expect(steps.findAll('li').map((li) => li.text())).toEqual(['Siéntate derecho.', 'Respira profundo.', 'Estira los brazos.'])
    expect(page.find('[data-testid="resource-duration"]').text()).toBe('6 min')
    // el reproductor va antes que los pasos
    const html = page.html()
    expect(html.indexOf('<iframe')).toBeLessThan(html.indexOf('data-testid="reading-content"'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Una lectura fuera del plan responde 403 y se ofrece «Mejorar plan».
   */
  it('readingOutsidePlan_shouldShowUpgrade', async () => {
    loginAs('user')
    useLibrary(server, { plan: 1, withReadings: true })
    const { page } = await openPage('/stress/resources/1010')
    await waitFor(() => expect(page.find('[data-testid="plan-required"]').exists()).toBe(true))
    expect(page.text()).toContain('Este recurso está disponible desde el plan Avanzado')
    expect(page.find('[data-testid="plan-required"]').findAll('a').map((a) => a.attributes('href'))).toContain('/subscriptions')
  })
})
