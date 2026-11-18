// Pruebas de integración: panel de administración de la biblioteca (tabla, crear y editar con plan)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { useLibrary } from '../mocks/library.js'
import { openPage, loginAs, waitFor, button } from '../helpers.js'

const form = () => {
  const el = document.querySelector('[data-testid="resource-form"]')
  return el
}
const field = (id) => document.getElementById(id)

// Cambia el valor de un control del formulario (se dibuja en <body> con Teleport)
async function setField(id, value) {
  const el = field(id)
  el.value = value
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'))
  await new Promise((r) => setTimeout(r, 0))
}

async function submitForm() {
  form().dispatchEvent(new Event('submit', { cancelable: true }))
  await new Promise((r) => setTimeout(r, 0))
}

async function openAdmin() {
  const result = await openPage('/admin/resources')
  await waitFor(() => expect(result.page.find('[data-testid="resources-table"]').exists()).toBe(true))
  return result
}

async function openEdit(page, id) {
  await page.find(`[data-testid="resource-${id}"] button`).trigger('click')
  await waitFor(() => expect(form()).toBeTruthy())
}

describe('AdminResources', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El admin ve todos los recursos (sin filtro de plan) con su plan, y cuántos hay en Básico por tipo.
   */
  it('table_shouldListAllResourcesWithPlanAndBasicCountByType', async () => {
    loginAs('admin')
    useLibrary(server, { plan: 3, withReadings: true })
    const { page } = await openAdmin()
    expect(page.findAll('tbody tr')).toHaveLength(83) // 12 YouTube + 1 video Profesional + 50 lecturas + 20 ejercicios
    expect(page.find('[data-testid="resource-1"]').text()).toContain('Básico')
    expect(page.find('[data-testid="resource-3"]').text()).toContain('Avanzado')
    expect(page.find('[data-testid="basic-Article"]').text()).toContain('2 en Básico')
    expect(page.find('[data-testid="basic-Exercise"]').text()).toContain('2 en Básico')
    expect(page.find('[data-testid="basic-Video"]').text()).toContain('2 en Básico')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Editar pide primero GET /admin/resource-libraries/{id} y el PATCH lleva solo lo cambiado.
   */
  it('editLinkAndDuration_shouldLoadResourceAndSendOnlyChangedFields', async () => {
    loginAs('admin')
    const state = useLibrary(server, { plan: 3 })
    let detailRequested = false
    server.use(http.get(API + '/admin/resource-libraries/:id', ({ params }) => {
      detailRequested = true
      const r = state.resources.find((x) => String(x.id) === params.id)
      return HttpResponse.json({ ...r, content: '', requiredPlan: r.plan, requiredPlanName: 'Básico' })
    }))
    const { page } = await openAdmin()
    await openEdit(page, 1)
    expect(detailRequested).toBe(true)
    expect(field('rf-type').disabled).toBe(true) // el tipo no se cambia al editar
    expect(field('rf-title').value).toBe('Técnicas de Respiración Profunda')

    await setField('rf-url', 'https://www.youtube.com/watch?v=WkzMBxohi1M')
    await setField('rf-duration', '5')
    await submitForm()

    await waitFor(() => expect(state.patches).toEqual([{ contentUrl: 'https://www.youtube.com/watch?v=WkzMBxohi1M', duration: 5 }]))
    await waitFor(() => expect(form()).toBeNull())
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Los valores inválidos se marcan bajo cada campo antes de enviar (mismas reglas que el backend).
   */
  it('invalidValues_shouldShowFieldErrorsAndNotSend', async () => {
    loginAs('admin')
    const state = useLibrary(server, { plan: 3 })
    const { page } = await openAdmin()
    await openEdit(page, 1)
    await setField('rf-url', 'youtube sin protocolo')
    await setField('rf-duration', '700')
    await setField('rf-title', 'ab')
    await submitForm()
    const text = form().textContent
    expect(text).toContain('Ingresa una URL http(s) válida de hasta 500 caracteres.')
    expect(text).toContain('La duración debe estar entre 0 y 600 minutos.')
    expect(text).toContain('El título debe tener entre 3 y 200 caracteres.')
    expect(state.patches).toHaveLength(0)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Los `errors` del 400 del backend aparecen bajo su campo.
   */
  it('server400_shouldShowFieldErrors', async () => {
    loginAs('admin')
    useLibrary(server, { plan: 3 })
    server.use(http.patch(API + '/resource-libraries/:id', () =>
      HttpResponse.json({ message: 'Datos inválidos', errors: { thumbnail: ['La miniatura debe ser una URL http(s)'], requiredPlan: ['El plan debe ser 1 (Básico), 2 (Avanzado) o 3 (Profesional)'] } }, { status: 400 })))
    const { page } = await openAdmin()
    await openEdit(page, 1)
    await setField('rf-thumbnail', 'https://ejemplo.com/a.jpg')
    await submitForm()
    await waitFor(() => expect(form().textContent).toContain('La miniatura debe ser una URL http(s)'))
    expect(form().textContent).toContain('El plan debe ser 1 (Básico), 2 (Avanzado) o 3 (Profesional)')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El admin cambia el plan de un video y un usuario Básico pasa a verlo; la lista se recarga.
   */
  it('changeVideoPlan_shouldReloadListAndMakeItVisibleToBasicUser', async () => {
    loginAs('admin')
    const state = useLibrary(server, { plan: 3 })
    const { page } = await openAdmin()
    await openEdit(page, 3)
    await setField('rf-plan', '1')
    await submitForm()
    await waitFor(() => expect(state.patches).toEqual([{ requiredPlan: 1 }]))
    await waitFor(() => expect(page.find('[data-testid="resource-3"]').text()).toContain('Básico'))

    loginAs('user')
    state.plan = 1
    const user = await openPage('/stress/resources')
    await waitFor(() => expect(user.page.text()).toContain('Yoga para Reducir la Ansiedad'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Una Lectura se crea sin URL (el campo no se muestra) y con su texto.
   */
  it('createArticle_shouldHideUrlAndSendContent', async () => {
    loginAs('admin')
    const state = useLibrary(server, { plan: 3 })
    const { page } = await openAdmin()
    await button(page, 'Nuevo recurso').trigger('click')
    await waitFor(() => expect(form()).toBeTruthy())
    expect(field('rf-type').value).toBe('Article')
    expect(field('rf-url')).toBeNull()
    expect(field('rf-plan').value).toBe('2') // Avanzado por defecto
    await setField('rf-title', 'Cómo poner límites en el trabajo')
    await setField('rf-content', 'Introducción\n\nPrimer párrafo.')
    await submitForm()
    await waitFor(() => expect(state.created).toHaveLength(1))
    expect(state.created[0]).toMatchObject({ resourceType: 'Article', requiredPlan: 2, title: 'Cómo poner límites en el trabajo', content: 'Introducción\n\nPrimer párrafo.' })
    expect(state.created[0]).not.toHaveProperty('contentUrl')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Un Ejercicio se crea con plan Profesional y etiquetas (la URL es opcional).
   */
  it('createExercise_withProfessionalPlanAndTags', async () => {
    loginAs('admin')
    const state = useLibrary(server, { plan: 3 })
    const { page } = await openAdmin()
    await button(page, 'Nuevo recurso').trigger('click')
    await waitFor(() => expect(form()).toBeTruthy())
    await setField('rf-type', 'Exercise')
    await setField('rf-plan', '3')
    await setField('rf-title', 'Estiramiento de cuello')
    await setField('rf-content', '1. Inclina la cabeza.\n2. Mantén 10 segundos.')
    await setField('rf-duration', '6')
    await setField('rf-tags', 'pausa, cuello,')
    await submitForm()
    await waitFor(() => expect(state.created).toHaveLength(1))
    expect(state.created[0]).toMatchObject({ resourceType: 'Exercise', requiredPlan: 3, duration: 6, tags: ['pausa', 'cuello'], contentUrl: '' })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Un Video necesita su enlace.
   */
  it('createVideoWithoutUrl_shouldBeBlocked', async () => {
    loginAs('admin')
    const state = useLibrary(server, { plan: 3 })
    const { page } = await openAdmin()
    await button(page, 'Nuevo recurso').trigger('click')
    await waitFor(() => expect(form()).toBeTruthy())
    await setField('rf-type', 'Video')
    await setField('rf-title', 'Video sin enlace')
    await submitForm()
    expect(form().textContent).toContain('El enlace es obligatorio para videos y audios.')
    expect(state.created).toHaveLength(0)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Solo el ADMIN ve el panel (el backend además responde 403 a otros roles).
   */
  it('nonAdmin_shouldNotAccessResourcePanel', async () => {
    loginAs('user')
    useLibrary(server, { plan: 2 })
    const { router } = await openPage('/admin/resources')
    expect(router.currentRoute.value.name).toBe('Dashboard')
  })
})
