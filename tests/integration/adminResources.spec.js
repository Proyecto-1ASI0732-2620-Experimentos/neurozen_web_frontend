// Pruebas de integración: edición de la biblioteca desde el panel admin (PATCH / POST con requiredPlan)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { useLibrary } from '../mocks/library.js'
import { openPage, loginAs, waitFor, button } from '../helpers.js'

async function openAdmin() {
  const result = await openPage('/admin/resources')
  await waitFor(() => expect(result.page.find('[data-testid="resource-1"]').exists()).toBe(true))
  return result
}

async function startEdit(page, id) {
  await page.find(`[data-testid="resource-${id}"] button`).trigger('click')
}

describe('AdminResources', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El admin corrige un enlace que YouTube no deja insertar y la duración real.
   * - ¿Qué hace?: Edita enlace y duración → el PATCH lleva SOLO esos campos y la tarjeta se actualiza (200).
   */
  it('editLinkAndDuration_shouldSendOnlyChangedFields', async () => {
    loginAs('admin')
    useLibrary(server, { plan: 3 })
    let body = null
    server.use(http.patch(API + '/resource-libraries/:id', async ({ params, request }) => {
      body = await request.json()
      return HttpResponse.json({ id: Number(params.id), title: 'Técnicas de Respiración Profunda', resourceType: 'Video', duration: body.duration, contentUrl: body.contentUrl, thumbnail: '', tags: [], description: '' })
    }))
    const { page } = await openAdmin()
    await startEdit(page, 1)
    await page.find('#edit-1-contentUrl').setValue('https://www.youtube.com/watch?v=WkzMBxohi1M')
    await page.find('#edit-1-duration').setValue('5')
    await page.find('[data-testid="resource-1"] form').trigger('submit')

    await waitFor(() => expect(body).toEqual({ contentUrl: 'https://www.youtube.com/watch?v=WkzMBxohi1M', duration: 5 }))
    await waitFor(() => expect(page.find('[data-testid="resource-1"]').text()).toContain('WkzMBxohi1M'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Los valores inválidos se marcan por campo antes de enviar (mismas reglas que el backend).
   */
  it('invalidValues_shouldShowFieldErrorsAndNotSend', async () => {
    loginAs('admin')
    useLibrary(server, { plan: 3 })
    let calls = 0
    server.use(http.patch(API + '/resource-libraries/:id', () => { calls++; return HttpResponse.json({}) }))
    const { page } = await openAdmin()
    await startEdit(page, 1)
    await page.find('#edit-1-contentUrl').setValue('youtube sin protocolo')
    await page.find('#edit-1-duration').setValue('700')
    await page.find('#edit-1-title').setValue('ab')
    await page.find('[data-testid="resource-1"] form').trigger('submit')
    const text = page.find('[data-testid="resource-1"]').text()
    expect(text).toContain('Ingresa una URL http(s) válida de hasta 500 caracteres.')
    expect(text).toContain('La duración debe estar entre 0 y 600 minutos.')
    expect(text).toContain('El título debe tener entre 3 y 200 caracteres.')
    expect(calls).toBe(0)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Los `errors` del 400 del backend se muestran bajo su campo.
   */
  it('server400_shouldShowFieldErrors', async () => {
    loginAs('admin')
    useLibrary(server, { plan: 3 })
    server.use(http.patch(API + '/resource-libraries/:id', () =>
      HttpResponse.json({ message: 'Datos inválidos', errors: { thumbnail: ['La miniatura debe ser una URL http(s)'] } }, { status: 400 })))
    const { page } = await openAdmin()
    await startEdit(page, 1)
    await page.find('#edit-1-thumbnail').setValue('https://ejemplo.com/a.jpg')
    await page.find('[data-testid="resource-1"] form').trigger('submit')
    await waitFor(() => expect(page.find('[data-testid="resource-1"]').text()).toContain('La miniatura debe ser una URL http(s)'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El admin mueve un recurso de plan y un usuario Básico pasa a verlo.
   * - ¿Qué hace?: PATCH { requiredPlan: 1 } sobre "Yoga" y luego un usuario Básico lo ve en su biblioteca.
   */
  it('changePlan_shouldMakeResourceVisibleToBasicUser', async () => {
    loginAs('admin')
    const state = useLibrary(server, { plan: 3 })
    let body = null
    server.use(http.patch(API + '/resource-libraries/:id', async ({ params, request }) => {
      body = await request.json()
      const r = state.resources.find((x) => String(x.id) === params.id)
      r.plan = body.requiredPlan
      return HttpResponse.json({ ...r })
    }))
    const { page } = await openAdmin()
    await startEdit(page, 3)
    await page.find('#edit-3-plan').setValue('1')
    await page.find('[data-testid="resource-3"] form').trigger('submit')
    await waitFor(() => expect(body).toEqual({ requiredPlan: 1 }))

    // Un usuario Básico entra a su biblioteca
    loginAs('user')
    state.plan = 1
    const user = await openPage('/stress/resources')
    await waitFor(() => expect(user.page.text()).toContain('Yoga para Reducir la Ansiedad'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Al crear un recurso se elige el plan mínimo (por defecto Avanzado).
   */
  it('createResource_shouldSendRequiredPlan', async () => {
    loginAs('admin')
    useLibrary(server, { plan: 3 })
    let body = null
    server.use(http.post(API + '/resource-libraries', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ id: 50, ...body }, { status: 201 })
    }))
    const { page } = await openAdmin()
    await button(page, 'Nuevo recurso').trigger('click')
    const form = page.find('[data-testid="create-form"]')
    expect(form.find('#new-plan').element.value).toBe('2')
    await form.find('#new-type').setValue('Audio')
    await form.find('#new-plan').setValue('1')
    await form.find('#new-title').setValue('Respiración 4-7-8')
    await form.find('#new-contentUrl').setValue('https://www.youtube.com/watch?v=UYcqVZmzv0c')
    await form.find('#new-duration').setValue('6')
    await form.find('#new-tags').setValue('respiración, sueño')
    await form.trigger('submit')
    await waitFor(() => expect(body).toMatchObject({
      title: 'Respiración 4-7-8', resourceType: 'Audio', contentUrl: 'https://www.youtube.com/watch?v=UYcqVZmzv0c',
      duration: 6, tags: ['respiración', 'sueño'], requiredPlan: 1
    }))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Solo el ADMIN edita la biblioteca.
   */
  it('nonAdmin_shouldNotAccessResourceEditing', async () => {
    loginAs('user')
    useLibrary(server, { plan: 2 })
    const { router } = await openPage('/admin/resources')
    expect(router.currentRoute.value.name).toBe('Dashboard')
  })
})
