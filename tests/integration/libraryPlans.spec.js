// Pruebas de integración: biblioteca con enlaces de YouTube y acceso por planes
import { server } from '../mocks/server.js'
import { useLibrary } from '../mocks/library.js'
import { openPage, loginAs, waitFor } from '../helpers.js'

const cards = (page) => page.findAll('main ul.grid > li')
const titles = (page) => cards(page).map((c) => c.find('h2').text())
const banner = (page) => page.find('[data-testid="upgrade-banner"]')

async function openLibrary() {
  const result = await openPage('/stress/resources')
  await waitFor(() => expect(cards(result.page).length).toBeGreaterThan(0))
  return result
}

describe('LibraryPlans', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Sin suscripción el backend trata al usuario como Básico y entrega 2 videos y 2 audios (+ artículos Básico).
   * - ¿Qué hace?: Abre la biblioteca sin plan: solo lo que entregó la API y el banner para mejorar el plan.
   */
  it('userWithoutSubscription_shouldSeeBasicResourcesAndUpgradeBanner', async () => {
    loginAs('user')
    useLibrary(server, { plan: null })
    const { page } = await openLibrary()
    expect(titles(page)).toEqual([
      'Técnicas de Respiración Profunda', 'Ejercicios de Estiramiento para Oficina',
      'Meditación Guiada de 5 Minutos', 'Música Relajante para Dormir', 'Pausas activas en la jornada'
    ])
    await waitFor(() => expect(banner(page).exists()).toBe(true))
    expect(banner(page).text()).toContain('Desbloquea toda la biblioteca con el plan Avanzado')
    expect(banner(page).find('a').attributes('href')).toBe('/subscriptions')
    // No se muestran candados ni títulos de recursos que la API no entregó
    expect(page.text()).not.toContain('Yoga para Reducir la Ansiedad')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El plan Básico ve lo mismo que un usuario sin plan.
   */
  it('basicPlan_shouldSeeFourYouTubeResourcesAndBanner', async () => {
    loginAs('user')
    useLibrary(server, { plan: 1 })
    const { page } = await openLibrary()
    expect(cards(page).filter((c) => /Video|Audio/.test(c.text()))).toHaveLength(4)
    await waitFor(() => expect(banner(page).exists()).toBe(true))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El plan Avanzado ve los 12 de YouTube, sin banner y sin el recurso exclusivo Profesional.
   */
  it('advancedPlan_shouldSeeTheTwelveYouTubeResourcesWithoutBanner', async () => {
    loginAs('user')
    useLibrary(server, { plan: 2 })
    const { page } = await openLibrary()
    expect(cards(page)).toHaveLength(13) // 12 de YouTube + 1 artículo
    expect(page.text()).not.toContain('Programa exclusivo Zen+')
    await new Promise((r) => setTimeout(r, 50))
    expect(banner(page).exists()).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El plan Profesional ve todo, incluido lo exclusivo.
   */
  it('professionalPlan_shouldSeeEverything', async () => {
    loginAs('user')
    useLibrary(server, { plan: 3 })
    const { page } = await openLibrary()
    expect(cards(page)).toHaveLength(14)
    expect(page.text()).toContain('Programa exclusivo Zen+')
    expect(banner(page).exists()).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Un Básico puede llegar a un recurso Avanzado por un enlace guardado: debe ver el mensaje del backend
   *   y «Mejorar plan», sin error genérico ni cierre de sesión.
   */
  it('basicOpeningAdvancedResourceByLink_shouldShowPlanMessageAndUpgradeButton', async () => {
    loginAs('user')
    useLibrary(server, { plan: 1 })
    const { page, router } = await openPage('/stress/resources/3')
    await waitFor(() => expect(page.find('[data-testid="plan-required"]').exists()).toBe(true))
    const box = page.find('[data-testid="plan-required"]')
    expect(box.text()).toContain('Este recurso está disponible desde el plan Avanzado')
    expect(box.findAll('a').map((a) => a.attributes('href'))).toContain('/subscriptions')
    expect(page.find('iframe').exists()).toBe(false)
    expect(router.currentRoute.value.name).toBe('ResourceDetail')
    expect(localStorage.getItem('authToken')).toBeTruthy()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Un recurso que ya no existe (favorito antiguo) debe mostrar un mensaje claro.
   */
  it('missingResource_shouldShowNotFoundMessage', async () => {
    loginAs('user')
    useLibrary(server, { plan: 2 })
    const { page } = await openPage('/stress/resources/999')
    await waitFor(() => expect(page.text()).toContain('No se encontró el recurso'))
    expect(page.find('[data-testid="plan-required"]').exists()).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Al suscribirse al Avanzado la biblioteca debe actualizarse sin cerrar sesión.
   * - ¿Qué hace?: Básico (4 de YouTube) → compra el Avanzado → vuelve a la biblioteca → ve los 12, sin banner.
   */
  it('basicSubscribingToAdvanced_shouldRefreshLibraryWithoutLogout', async () => {
    loginAs('user')
    const state = useLibrary(server, { plan: 1 })
    let { page, router } = await openLibrary()
    expect(cards(page)).toHaveLength(5)

    await router.push('/subscriptions/purchase?plan=advanced')
    await waitFor(() => expect(page.find('#p-first').exists()).toBe(true))
    await page.find('#p-first').setValue('Ana')
    await page.find('#p-last').setValue('Torres')
    await page.find('#p-email').setValue('ana@neurozen.com')
    await page.find('#p-card').setValue('4111 1111 1111 1111')
    await page.find('#p-exp').setValue('12/30')
    await page.find('#p-cvv').setValue('123')
    await page.find('main form').trigger('submit')
    await waitFor(() => expect(state.plan).toBe(2))

    await router.push('/stress/resources')
    await waitFor(() => expect(cards(page)).toHaveLength(13))
    expect(banner(page).exists()).toBe(false)
    expect(localStorage.getItem('authToken')).toBeTruthy()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Videos Y audios se reproducen dentro de NeuroZen con el reproductor de YouTube.
   */
  it.each([
    [1, 'CVMBSsqTGOk', 'Video'],
    [7, 'pyAyEzmiKxU', 'Audio']
  ])('recurso %s (%s, %s) → reproductor de YouTube + «Ver en YouTube»', async (id, yt) => {
    loginAs('user')
    useLibrary(server, { plan: 2 })
    const { page } = await openPage(`/stress/resources/${id}`)
    await waitFor(() => expect(page.find('iframe').exists()).toBe(true))
    const iframe = page.find('iframe')
    expect(iframe.attributes('src')).toBe(`https://www.youtube-nocookie.com/embed/${yt}?rel=0`)
    expect(iframe.attributes('loading')).toBe('lazy')
    expect(iframe.attributes('title')).toContain('Reproductor de YouTube')
    // «Ver en YouTube» abre una pestaña nueva (noopener) con la URL armada desde el id validado
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    await page.find('[data-testid="watch-on-youtube"]').trigger('click')
    expect(open).toHaveBeenCalledWith(`https://www.youtube.com/watch?v=${yt}`, '_blank', 'noopener,noreferrer')
    expect(page.find('audio').exists()).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El aviso clínico viene al final de la descripción y no debe perderse; antes, el recurso con id 1
   *   se mostraba con el título y la descripción de la demo (traducción por id).
   */
  it.each([5, 9])('recurso %s muestra el aviso clínico completo', async (id) => {
    loginAs('user')
    useLibrary(server, { plan: 2 })
    const { page } = await openPage(`/stress/resources/${id}`)
    await waitFor(() => expect(page.find('[data-testid="resource-description"]').exists()).toBe(true))
    expect(page.find('[data-testid="resource-description"]').text()).toContain('Este material no sustituye la atención de un profesional de la salud.')
  })

  it('backendResourceWithDemoId_shouldKeepItsRealTitle', async () => {
    loginAs('user')
    useLibrary(server, { plan: 2 })
    const { page } = await openPage('/stress/resources/1')
    await waitFor(() => expect(page.find('iframe').exists()).toBe(true))
    expect(page.text()).toContain('Técnicas de Respiración Profunda')
    expect(page.text()).not.toContain('Fundamentos de Respiración Consciente')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Los artículos siguen mostrando su `content`; las miniaturas vacías usan una imagen de respaldo.
   */
  it('article_shouldShowContent_andEmptyThumbnailUsesFallback', async () => {
    loginAs('user')
    useLibrary(server, { plan: 2 })
    const { page } = await openLibrary()
    const article = cards(page).find((c) => c.text().includes('Pausas activas'))
    expect(article.find('img').attributes('src')).toBe('/images/resource-reading.svg')
    expect(cards(page)[0].find('img').attributes('src')).toBe('https://img.youtube.com/vi/CVMBSsqTGOk/hqdefault.jpg')
    expect(cards(page)[0].find('img').attributes('data-fallback')).toBe('/images/resource-video.svg')

    await article.find('a').trigger('click')
    await waitFor(() => expect(page.text()).toContain('Segundo párrafo del artículo.'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: "Vistos recientemente" se guarda en el navegador; si el plan bajó, no debe mostrar títulos de
   *   recursos que la API ya no entrega.
   */
  it('recentlyViewed_shouldHideResourcesTheApiNoLongerReturns', async () => {
    loginAs('user')
    localStorage.setItem('neurozen_recent_resources:7', JSON.stringify([
      { id: 3, title: 'Yoga para Reducir la Ansiedad', category: 'video' },
      { id: 1, title: 'Técnicas de Respiración Profunda', category: 'video' }
    ]))
    useLibrary(server, { plan: 1 })
    const { page } = await openLibrary()
    expect(page.text()).toContain('Vistos Recientemente')
    expect(page.text()).not.toContain('Yoga para Reducir la Ansiedad')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: La lista no se guarda en caché: se pide de nuevo al volver a entrar (el admin puede mover recursos de plan).
   */
  it('library_shouldBeRequestedAgainOnEachVisit', async () => {
    loginAs('user')
    const state = useLibrary(server, { plan: 1 })
    const { page, router } = await openLibrary()
    state.resources.find((r) => r.id === 3).plan = 1 // el admin lo movió a Básico
    await router.push('/profile')
    await router.push('/stress/resources')
    await waitFor(() => expect(page.text()).toContain('Yoga para Reducir la Ansiedad'))
    expect(state.requests.filter((r) => r === 'list').length).toBeGreaterThanOrEqual(2)
  })
})
