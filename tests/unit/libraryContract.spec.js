// Pruebas unitarias: contrato de la biblioteca (YouTube, miniaturas, 403 por plan, traducciones, suscripción)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { extractYouTubeId, normalizeResource, ResourceLibraryService } from '../../src/services/ResourceLibraryService.js'
import { isPlanRequired, isProfessionalNotVerified, ApiError, RESOURCE_PLAN_REQUIRED, RESOURCE_NOT_FOUND } from '../../src/services/ApiError.js'
import { SubscriptionService } from '../../src/services/SubscriptionService.js'
import { useResourceText } from '../../src/composables/useResourceText.js'
import { createI18nInstance } from '../../src/i18n/index.js'

describe('LibraryContract', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El backend envía watch?v=ID; por robustez se aceptan youtu.be, m.youtube.com, embed y shorts.
   */
  it('extractYouTubeId_shouldAcceptCommonFormats', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=CVMBSsqTGOk')).toBe('CVMBSsqTGOk')
    expect(extractYouTubeId('https://m.youtube.com/watch?v=bkQwODQAdCo')).toBe('bkQwODQAdCo')
    expect(extractYouTubeId('https://youtube.com/watch?v=g3-IZXI4ksw')).toBe('g3-IZXI4ksw')
    expect(extractYouTubeId('https://youtu.be/H0pbvdIcHOY')).toBe('H0pbvdIcHOY')
    expect(extractYouTubeId('https://www.youtube.com/watch?feature=share&v=tS52C0Pxf_g')).toBe('tS52C0Pxf_g')
    expect(extractYouTubeId('https://www.youtube.com/embed/r5K8Drgzj_Y')).toBe('r5K8Drgzj_Y')
    expect(extractYouTubeId('https://www.youtube.com/shorts/40LH8G7kI84')).toBe('40LH8G7kI84')
    expect(extractYouTubeId('https://neurozen.com/audio/musica.mp3')).toBeNull()
    expect(extractYouTubeId('https://www.youtube.com/watch?v=example1')).toBeNull()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: thumbnail, author y description pueden venir vacíos.
   */
  it('normalizeResource_shouldToleratEmptyFieldsAndFallbackThumbnail', () => {
    const audio = normalizeResource({ id: 7, title: 'Meditación', resourceType: 'Audio', contentUrl: 'https://www.youtube.com/watch?v=pyAyEzmiKxU', duration: 5, thumbnail: '', author: '', description: '' })
    expect(audio.youTubeId).toBe('pyAyEzmiKxU')
    expect(audio.thumbnail).toBe('https://img.youtube.com/vi/pyAyEzmiKxU/hqdefault.jpg')
    expect(audio.fallbackThumbnail).toBe('/images/resource-audio.svg')
    expect(audio.durationMinutes).toBe(5)
    const article = normalizeResource({ id: 13, title: 'Artículo', resourceType: 'Article', contentUrl: '', thumbnail: '', duration: 4 })
    expect(article.thumbnail).toBe('/images/resource-reading.svg')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El 403 por plan se distingue del 403 de psicólogo no verificado.
   */
  it('isPlanRequired_shouldDistinguishPlanFromNotVerified', () => {
    const plan = new ApiError('Este recurso está disponible desde el plan Profesional', { status: 403 })
    const notVerified = new ApiError('Tu cuenta profesional aún no está verificada', { status: 403 })
    expect(isPlanRequired(plan)).toBe(true)
    expect(isPlanRequired(notVerified)).toBe(false)
    expect(isProfessionalNotVerified(notVerified)).toBe(true)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El detalle no debe "tragarse" el 403 ni el 404 (antes buscaba en la lista o en datos de ejemplo).
   */
  it('getResourceById_shouldPropagate403And404WithCodes', async () => {
    server.use(
      http.get(API + '/resource-libraries/3', () => HttpResponse.json({ message: 'Este recurso está disponible desde el plan Avanzado' }, { status: 403 })),
      http.get(API + '/resource-libraries/999', () => HttpResponse.json({ message: 'El recurso no existe' }, { status: 404 }))
    )
    const service = new ResourceLibraryService()
    await expect(service.getResourceById(3)).rejects.toMatchObject({ code: RESOURCE_PLAN_REQUIRED, message: 'Este recurso está disponible desde el plan Avanzado' })
    await expect(service.getResourceById(999)).rejects.toMatchObject({ code: RESOURCE_NOT_FOUND })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Si la ruta principal falla por otro motivo, se usa el alias /resources/{id}.
   */
  it('getResourceById_shouldUseAliasOnOtherErrors', async () => {
    server.use(
      http.get(API + '/resource-libraries/7', () => HttpResponse.json({}, { status: 500 })),
      http.get(API + '/resources/7', () => HttpResponse.json({ id: 7, title: 'Meditación', resourceType: 'Audio', contentUrl: 'https://www.youtube.com/watch?v=pyAyEzmiKxU', duration: 5 }))
    )
    const r = await new ResourceLibraryService().getResourceById(7)
    expect(r.youTubeId).toBe('pyAyEzmiKxU')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Las traducciones por id son de la demo; no deben reemplazar el texto real de un recurso del backend.
   */
  it('useResourceText_shouldOnlyTranslateDemoResources', async () => {
    localStorage.setItem('neurozen-locale', 'es')
    const i18n = await createI18nInstance()
    const text = useResourceText(i18n.global)
    const backend = { id: 1, title: 'Técnicas de Respiración Profunda', description: 'Real. Aviso.' }
    const demo = { id: 1, title: 'Mindful Breathing Basics', description: 'Demo' }
    expect(text.title(backend)).toBe('Técnicas de Respiración Profunda')
    expect(text.description(backend)).toBe('Real. Aviso.')
    expect(text.title(demo)).toBe('Fundamentos de Respiración Consciente')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El backend devuelve holderFirstName / cardLast4 (antes el frontend leía nameUser / numberCard).
   */
  it('subscription_shouldMapCurrentBackendFields', async () => {
    server.use(http.get(API + '/subscriptions/user/7', () => HttpResponse.json({ id: 1, userId: 7, planId: 2, isActive: true, holderFirstName: 'Ana', holderLastName: 'Torres', email: 'ana@neurozen.com', cardLast4: '1111' })))
    const sub = await new SubscriptionService().getByUser(7)
    expect(sub).toEqual({ planId: 2, planKey: 'advanced', isActive: true, holder: 'Ana Torres', email: 'ana@neurozen.com', cardLast4: '1111' })
  })
})
