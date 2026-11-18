// Pruebas unitarias: formato de lecturas y lógica del formulario de recursos del admin
import { parseReadingContent } from '../../src/utils/readingContent.js'
import {
  validateResourceForm, buildCreatePayload, buildPatch, emptyResourceForm, formFromResource, addTag, basicCountByType, fieldsFor
} from '../../src/admin/resourceForm.js'
import { normalizeAdminResource } from '../../src/services/AdminResourceService.js'
import { AuthService } from '../../src/services/AuthService.js'

describe('ReadingContent', () => {
  it('parse_shouldDetectHeadingsParagraphsAndLists', () => {
    const blocks = parseReadingContent('Título corto\n\nUn párrafo.\nSigue aquí.\n\n- uno\n- dos\n\n1. paso\n2. otro\n\nTexto final.')
    expect(blocks).toEqual([
      { type: 'heading', text: 'Título corto' },
      { type: 'paragraph', text: 'Un párrafo.\nSigue aquí.' },
      { type: 'list', ordered: false, items: ['uno', 'dos'] },
      { type: 'list', ordered: true, items: ['paso', 'otro'] },
      { type: 'paragraph', text: 'Texto final.' }
    ])
  })

  it('parse_shortLineWithPeriodIsParagraph_andCrlfIsHandled', () => {
    expect(parseReadingContent('Respira.')).toEqual([{ type: 'paragraph', text: 'Respira.' }])
    expect(parseReadingContent('A\r\n\r\nB.')).toEqual([{ type: 'heading', text: 'A' }, { type: 'paragraph', text: 'B.' }])
    expect(parseReadingContent('')).toEqual([])
  })
})

describe('AdminResourceForm', () => {
  it('fields_shouldDependOnType', () => {
    expect(fieldsFor('Video').contentUrl).toBe('required')
    expect(fieldsFor('Audio').contentUrl).toBe('required')
    expect(fieldsFor('Exercise').contentUrl).toBe('optional')
    expect(fieldsFor('Article').contentUrl).toBe('hidden')
    expect(fieldsFor('Article').contentRecommended).toBe(true)
  })

  it('validate_shouldApplyBackendLimits', () => {
    const f = { ...emptyResourceForm('Video'), title: 'ab', content: 'x'.repeat(20001), author: 'a'.repeat(121), duration: 601, tags: Array(11).fill('t') }
    expect(validateResourceForm(f)).toMatchObject({
      title: 'title', content: 'content', author: 'author', duration: 'duration', tags: 'tags', contentUrl: 'urlRequired'
    })
    const ok = { ...emptyResourceForm('Article'), title: 'Lectura válida', content: 'Texto' }
    expect(validateResourceForm(ok)).toEqual({})
  })

  it('createPayload_articleHasNoUrl_patchHasOnlyChanges', () => {
    const article = { ...emptyResourceForm('Article'), title: ' Lectura ', contentUrl: 'https://x.pe', tags: ['a'] }
    const payload = buildCreatePayload(article)
    expect(payload).toMatchObject({ resourceType: 'Article', requiredPlan: 2, title: 'Lectura', tags: ['a'] })
    expect(payload).not.toHaveProperty('contentUrl')

    const original = formFromResource(normalizeAdminResource({ id: 1, title: 'Video', resourceType: 'Video', contentUrl: 'https://a.pe', duration: 5, tags: ['x'], requiredPlan: 1, thumbnail: 'https://t.pe' }))
    const edited = { ...original, duration: 7, requiredPlan: 2, thumbnail: '' }
    expect(buildPatch(edited, original)).toEqual({ duration: 7, requiredPlan: 2, thumbnail: '' })
    expect(buildPatch(original, original)).toEqual({})
  })

  it('tags_trimDeduplicateAndLimit_basicCount', () => {
    expect(addTag(['Sueño'], ' sueño ')).toEqual(['Sueño'])
    expect(addTag([], 'x'.repeat(40))).toEqual(['x'.repeat(30)])
    expect(addTag(Array(10).fill(0).map((_, i) => `t${i}`), 'nuevo')).toHaveLength(10)
    const list = [{ resourceType: 'Article', requiredPlan: 1 }, { resourceType: 'Article', requiredPlan: 2 }, { resourceType: 'Video', requiredPlan: 1 }]
    expect(basicCountByType(list, ['Article', 'Video', 'Audio'])).toEqual({ Article: 1, Video: 1, Audio: 0 })
  })
})

describe('SignUpPayload', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El backend ahora acepta un solo campo por dato: fullName y email (sin username/firstName/lastName).
   */
  it('register_shouldSendExactlyTheTenBackendFields', async () => {
    const service = new AuthService()
    service.httpClient.post = vi.fn().mockResolvedValue({})
    await service.register({
      name: 'Elena  Ramírez', dni: '87654321', email: 'elena@psico.pe', password: 'Segura2026', confirmPassword: 'Segura2026',
      role: 'psychologist', specialty: 'clinical', licenseNumber: '45821', acceptedTerms: true, acceptedPrivacyPolicy: true
    })
    const body = service.httpClient.post.mock.calls[0][1]
    expect(Object.keys(body).sort()).toEqual(
      ['acceptedPrivacyPolicy', 'acceptedTerms', 'confirmPassword', 'dni', 'email', 'fullName', 'licenseNumber', 'password', 'role', 'specialty']
    )
    expect(body.fullName).toBe('Elena Ramírez')
  })
})
