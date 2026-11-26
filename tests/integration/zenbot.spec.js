// Prueba de integración (con API simulada MSW): ZenBot dentro de la aplicación (widget + motor + biblioteca)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { openPage, loginAs, waitFor, pause } from '../helpers.js'

async function openZenBot() {
  loginAs()
  const { page, router } = await openPage('/')
  await page.find('button[aria-label="Abrir ZenBot, tu asistente"]').trigger('click')
  return { page, router }
}

async function say(page, text, wait = 550) {
  await page.find('#zenbot-input').setValue(text)
  await page.find('section[data-testid="zenbot"] form').trigger('submit')
  await pause(wait)
}

describe('ZenBotWidget', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Ante un mensaje de crisis, el usuario debe ver de inmediato las líneas de ayuda.
   * - ¿Qué hace esta prueba?: Abre ZenBot, escribe "ya no quiero vivir" y verifica la respuesta con la Línea 113,
   *   el aviso de que ZenBot no llama a emergencias y el acceso a psicólogos.
   */
  it('crisisMessage_shouldShowHelpLines', async () => {
    const { page } = await openZenBot()
    await say(page, 'ya no quiero vivir', 250)
    await waitFor(() => expect(page.find('a[href="tel:113"]').exists()).toBe(true))
    expect(page.find('[role="alert"]').exists()).toBe(true)
    expect(page.text()).toContain('ZenBot no puede llamar ni avisar a nadie por ti')
    expect(page.find('section[data-testid="zenbot"] a[href="/therapists"]').exists()).toBe(true)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: ZenBot debe orientar según lo que escribe el usuario y llevarlo a la herramienta adecuada.
   * - ¿Qué hace esta prueba?: Escribe "no puedo dormir" y verifica la respuesta sobre el sueño, la pregunta de seguimiento
   *   y el enlace a respiración.
   */
  it('sleepMessage_shouldAnswerAndOfferBreathing', async () => {
    const { page } = await openZenBot()
    await say(page, 'no puedo dormir')
    await waitFor(() => expect(page.text()).toContain('Dormir mal aumenta el estrés'))
    expect(page.text()).toContain('¿Te cuesta conciliar el sueño')
    expect(page.find('section[data-testid="zenbot"] a[href="/stress/breathing"]').exists()).toBe(true)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Al abrir ZenBot por primera vez debe verse la bienvenida y las 10 opciones.
   * - ¿Qué hace esta prueba?: Verifica el texto de bienvenida, las 10 opciones y que una opción inicie la conversación.
   */
  it('welcome_shouldShowTenStartersThatStartAConversation', async () => {
    const { page } = await openZenBot()
    expect(page.text()).toContain('Soy ZenBot, tu asistente de bienestar de NeuroZen')
    expect(page.findAll('[data-starter]')).toHaveLength(10)
    await page.find('[data-starter="professional"]').trigger('click')
    await pause(550)
    await waitFor(() => expect(page.text()).toContain('Buscar apoyo profesional es una gran decisión'))
    expect(page.find('section[data-testid="zenbot"] a[href="/book-session"]').exists()).toBe(true)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: ZenBot debe recomendar recursos REALES de la biblioteca con enlaces funcionales.
   * - ¿Qué hace esta prueba?: Con la biblioteca simulada (recurso 101 «Respiración para la oficina»), escribe que está
   *   estresado por el trabajo y verifica la tarjeta, el botón «Ver video» y que lleve al detalle del recurso.
   */
  it('workStress_shouldRecommendRealResourceWithWorkingLink', async () => {
    const { page, router } = await openZenBot()
    await say(page, 'Me siento muy estresado por mi trabajo')
    await waitFor(() => expect(page.find('[data-testid="zenbot-resource"]').exists()).toBe(true))
    expect(page.text()).toContain('Respiración para la oficina')
    const link = page.find('[data-testid="zenbot-resource"] a')
    expect(link.text()).toContain('Ver video')
    await link.trigger('click')
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/stress/resources/101'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si la biblioteca no responde, ZenBot debe explicarlo y permitir reintentar
   *   sin perder la conversación.
   * - ¿Qué hace esta prueba?: Simula un error 500 en la biblioteca y verifica el mensaje y el botón «Reintentar».
   */
  it('libraryError_shouldShowRecoverableMessage', async () => {
    server.use(http.get(API + '/resource-libraries', () => new HttpResponse(null, { status: 500 })))
    const { page } = await openZenBot()
    await say(page, 'quiero aprender a relajarme')
    await waitFor(() => expect(page.text()).toContain('No pude cargar la biblioteca de recursos'))
    expect(page.findAll('section[data-testid="zenbot"] button').some((b) => b.text().includes('Reintentar'))).toBe(true)
    expect(page.text()).toContain('quiero aprender a relajarme')
  })
})
