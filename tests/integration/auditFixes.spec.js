// Pruebas de integración (app real + API simulada con MSW) de las observaciones de las entrevistas.
// No son pruebas contra el backend real: usan las respuestas simuladas de tests/mocks.
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { verifiedProfessional } from '../mocks/data.js'
import { openPage, loginAs, waitFor, button, pause } from '../helpers.js'

describe('Dashboard (A1 / M7)', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Observación A1: un usuario nuevo veía estadísticas de ejemplo como si fueran suyas.
   * - ¿Qué hace esta prueba?: Sin test ni desencadenantes, verifica el estado inicial con «Hacer el test» y «Registrar cómo
   *   me siento», sin gráfico ni porcentajes.
   */
  it('newUser_shouldSeeEmptyStateWithoutSampleData', async () => {
    server.use(http.get(API + '/triggers', () => HttpResponse.json([])))
    loginAs()
    const { page, router } = await openPage('/')
    await waitFor(() => expect(page.find('[data-testid="dashboard-empty"]').exists()).toBe(true))
    expect(page.find('canvas').exists()).toBe(false)
    expect(page.text()).not.toMatch(/\d+%/)
    expect(page.text()).toContain('Hacer el test')
    await page.findAll('[data-testid="dashboard-empty"] a').find((a) => a.text().includes('Registrar cómo me siento')).trigger('click')
    await waitFor(() => expect(router.currentRoute.value.name).toBe('RegisterTrigger'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Se debe distinguir «error al cargar» de «aún no hay datos».
   * - ¿Qué hace esta prueba?: Simula un 500 en los desencadenantes y verifica el estado de error con «Reintentar».
   */
  it('triggersError_shouldShowErrorStateNotEmptyState', async () => {
    server.use(http.get(API + '/triggers', () => new HttpResponse(null, { status: 500 })))
    loginAs()
    const { page } = await openPage('/')
    await waitFor(() => expect(page.text()).toContain('Error al cargar los datos'))
    expect(page.find('[data-testid="dashboard-empty"]').exists()).toBe(false)
    expect(button(page, 'Reintentar')).toBeTruthy()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: M7: el PSS-10 se muestra en su escala 0-40 y el normalizado identificado como tal.
   * - ¿Qué hace esta prueba?: Con un resultado de 20/40, verifica «20/40» y «50/100 normalizado».
   */
  it('assessmentResult_shouldShowOriginalAndNormalizedScale', async () => {
    server.use(
      http.get(API + '/triggers', () => HttpResponse.json([])),
      http.get(API + '/assessments', () => HttpResponse.json([{ score: 20, level: 'moderate', completedAt: '2026-10-01T10:00:00Z' }]))
    )
    loginAs()
    const { page } = await openPage('/')
    await waitFor(() => expect(page.text()).toContain('20/40'))
    expect(page.text()).toContain('50/100 normalizado')
    expect(page.find('[data-testid="dashboard-empty"]').exists()).toBe(false)
  })
})

describe('Booking (A2 / A3)', () => {
  async function reachSummary(page) {
    await waitFor(() => expect(page.text()).toContain('Dra. Elena Ramírez'))
    await page.find('[role="radio"]').trigger('click')
    await button(page, 'Siguiente').trigger('click')
    await page.findAll('.grid-cols-7 button').find((b) => b.text() === '21').trigger('click')
    await waitFor(() => expect(page.find('button.slot').exists()).toBe(true))
    await page.find('button.slot').trigger('click')
    await button(page, 'Siguiente').trigger('click')
    await page.find('[role="radio"]').trigger('click')
    await button(page, 'Siguiente').trigger('click')
  }

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: A2: no deben poder elegirse días sin disponibilidad.
   * - ¿Qué hace esta prueba?: Con horario lunes/miércoles, verifica que el martes 20 esté deshabilitado y el 21 no,
   *   y que el mes se muestre como «Octubre de 2026».
   */
  it('calendar_shouldDisableDaysWithoutAvailability', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T10:00:00-05:00'))
    loginAs()
    const { page } = await openPage('/book-session')
    await waitFor(() => expect(page.text()).toContain('Dra. Elena Ramírez'))
    await page.find('[role="radio"]').trigger('click')
    await button(page, 'Siguiente').trigger('click')
    const day = (n) => page.findAll('.grid-cols-7 button').find((b) => b.text() === String(n))
    expect(day(20).element.disabled).toBe(true)
    expect(day(20).attributes('data-state')).toBe('unavailable')
    expect(day(21).element.disabled).toBe(false)
    expect(page.text()).toContain('Octubre de 2026')
    expect(page.text()).toContain('Próxima fecha disponible')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si el día elegido no tiene horarios, se debe ofrecer la próxima fecha disponible.
   * - ¿Qué hace esta prueba?: La API devuelve [] para el 21 y verifica «Próxima fecha disponible» con el lunes 26.
   */
  it('dayWithoutSlots_shouldSuggestNextAvailableDate', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T10:00:00-05:00'))
    server.use(http.get(API + '/professionals/:id/available-slots', ({ request }) =>
      HttpResponse.json(new URL(request.url).searchParams.get('date') === '2026-10-21' ? [] : ['09:00'])))
    loginAs()
    const { page } = await openPage('/book-session')
    await waitFor(() => expect(page.text()).toContain('Dra. Elena Ramírez'))
    await page.find('[role="radio"]').trigger('click')
    await button(page, 'Siguiente').trigger('click')
    await page.findAll('.grid-cols-7 button').find((b) => b.text() === '21').trigger('click')
    await waitFor(() => expect(page.text()).toContain('No hay horarios disponibles para este día'))
    expect(page.text()).toMatch(/Próxima fecha disponible: Lunes, 26 de octubre de 2026/)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: A3: desde el resumen se debe poder cambiar la hora sin rehacer todos los pasos.
   * - ¿Qué hace esta prueba?: Llega al resumen, pulsa «Editar hora», elige 10:00, vuelve al resumen y confirma; verifica
   *   que se conserven profesional, tipo y notas y que la API reciba la hora nueva (10:00 Lima = 15:00 UTC).
   */
  it('editTimeFromSummary_shouldKeepOtherDataAndReturnToSummary', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T10:00:00-05:00'))
    let sent = null
    server.use(http.post(API + '/appointments', async ({ request }) => {
      sent = await request.json()
      return HttpResponse.json({ id: 556 })
    }))
    loginAs()
    const { page, router } = await openPage('/book-session')
    await reachSummary(page)
    await page.find('#bs-notes').setValue('Prefiero mañanas')

    await page.find('[data-testid="edit-time"]').trigger('click')
    await waitFor(() => expect(page.text()).toContain('Estás cambiando la fecha u hora'))
    await waitFor(() => expect(page.findAll('button.slot').length).toBeGreaterThan(1))
    await page.findAll('button.slot').find((b) => b.text().includes('10:00')).trigger('click')
    await button(page, 'Volver al resumen').trigger('click')

    await waitFor(() => expect(page.find('#bs-notes').exists()).toBe(true))
    expect(page.find('#bs-notes').element.value).toBe('Prefiero mañanas')
    expect(page.text()).toContain('Dra. Elena Ramírez')
    await button(page, 'Confirmar cita').trigger('click')
    await waitFor(() => expect(sent).not.toBeNull())
    expect(sent).toMatchObject({ professionalId: 1, appointmentDateTime: '2026-10-21T15:00:00.000Z', appointmentType: 1, notasAdicionales: 'Prefiero mañanas' })
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/appointment-confirmation/556'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: A3: no se debe confirmar una hora que dejó de estar disponible.
   * - ¿Qué hace esta prueba?: Tras llegar al resumen, la API deja de ofrecer las 09:00; al confirmar no se envía la cita,
   *   se vuelve a fecha/hora con un aviso y la nota se conserva.
   */
  it('slotTakenBeforeConfirm_shouldNotBookAndAskForAnotherTime', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T10:00:00-05:00'))
    let available = ['09:00', '10:00']
    let posted = false
    server.use(
      http.get(API + '/professionals/:id/available-slots', () => HttpResponse.json(available)),
      http.post(API + '/appointments', () => { posted = true; return HttpResponse.json({ id: 1 }) })
    )
    loginAs()
    const { page } = await openPage('/book-session')
    await reachSummary(page)
    await page.find('#bs-notes').setValue('Nota')
    available = ['10:00']

    await button(page, 'Confirmar cita').trigger('click')
    await waitFor(() => expect(page.text()).toContain('Esa hora ya no está disponible'))
    expect(posted).toBe(false)
    expect(page.findAll('button.slot').map((b) => b.text())).toEqual(['10:00'])
  })
})

describe('Booking with backend availability range', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Con el endpoint de disponibilidad por rango, un día de atención sin horas
   *   libres debe aparecer deshabilitado desde el principio (sin que el usuario tenga que probarlo).
   * - ¿Qué hace esta prueba?: El backend dice que el miércoles 21 no tiene horas y el lunes 26 sí; verifica que el 21
   *   quede deshabilitado y que se proponga el 26 como próxima fecha disponible.
   */
  it('rangeEndpoint_shouldDisableFullDaysUpfront', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T10:00:00-05:00'))
    server.use(http.get(API + '/appointments/availability', () => HttpResponse.json({
      professionalId: 1, timeZone: 'America/Lima', slotMinutes: 60,
      days: [{ date: '2026-10-12', slots: [] }, { date: '2026-10-14', slots: [] }, { date: '2026-10-19', slots: [] }, { date: '2026-10-21', slots: [] }, { date: '2026-10-26', slots: ['09:00'] }],
      nextAvailableDate: '2026-10-26'
    })))
    loginAs()
    const { page } = await openPage('/book-session')
    await waitFor(() => expect(page.text()).toContain('Dra. Elena Ramírez'))
    await page.find('[role="radio"]').trigger('click')
    await button(page, 'Siguiente').trigger('click')
    const day = (n) => page.findAll('.grid-cols-7 button').find((b) => b.text() === String(n))
    await waitFor(() => expect(day(21).element.disabled).toBe(true))
    expect(day(26).element.disabled).toBe(false)
    expect(page.text()).toMatch(/Próxima fecha disponible: Lunes, 26 de octubre de 2026/)
  })
})

describe('Directory (M1 / M2)', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: M1/M2: filtro por tarifa y tarjetas con datos reales («Tarifa por definir»,
   *   «Sin valoraciones aún», especialidad traducida).
   * - ¿Qué hace esta prueba?: Con un profesional de $80 y otro sin tarifa ni reseñas, filtra de 50 a 90.
   */
  it('feeFilter_andRealCardData', async () => {
    server.use(http.get(API + '/professionals', () => HttpResponse.json([
      verifiedProfessional,
      { ...verifiedProfessional, id: 3, name: 'Lic. Carla Soto', price: null, rating: 0, reviews: 0, specialty: 'organizational' }
    ])))
    loginAs()
    const { page } = await openPage('/therapists')
    await waitFor(() => expect(page.text()).toContain('Lic. Carla Soto'))
    expect(page.text()).toContain('Tarifa por definir')
    expect(page.text()).toContain('Sin valoraciones aún')
    expect(page.text()).toContain('Psicología clínica')
    expect(page.text()).not.toContain('$0')

    const [min, max] = page.findAll('main input[type="number"]')
    await min.setValue('50')
    await max.setValue('90')
    expect(page.text()).toContain('Dra. Elena Ramírez')
    expect(page.text()).not.toContain('Lic. Carla Soto')
    await max.setValue('40')
    expect(page.text()).toContain('La tarifa mínima no puede ser mayor que la máxima')
  })
})

describe('Auth, footer and onboarding (A4 / M4 / M5 / M6 / B3)', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: A4: no debe aparecer «null» ni textos técnicos en el inicio de sesión.
   * - ¿Qué hace esta prueba?: El backend responde 500 con message: null; verifica que se muestre un mensaje legible.
   */
  it('loginServerErrorWithNullMessage_shouldNotShowNull', async () => {
    server.use(http.post(API + '/authentication/sign-in', () => HttpResponse.json({ message: null, title: 'null' }, { status: 500 })))
    const { page } = await openPage('/login')
    expect(page.text()).toContain('Usa el correo con el que creaste tu cuenta')
    await page.find('#email').setValue('ana@neurozen.com')
    await page.find('#password').setValue('Secreta123')
    await page.find('form').trigger('submit')
    await waitFor(() => expect(page.find('[role="alert"]').exists()).toBe(true))
    expect(page.text()).not.toMatch(/\bnull\b|undefined|\[object Object\]/)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: M6/B3: checklist de contraseña en tiempo real y plazo de verificación del psicólogo.
   * - ¿Qué hace esta prueba?: Escribe "abc" y luego "abc12345" y verifica qué requisitos se marcan; muestra el plazo.
   */
  it('registerPasswordChecklist_andPsychologistVerificationTime', async () => {
    const { page } = await openPage('/register?type=psychologist')
    expect(page.text()).toContain('La verificación suele tomar de 1 a 2 días hábiles')
    const rule = (k) => page.find(`[data-rule="${k}"]`).attributes('data-ok')
    await page.find('#password').setValue('abc')
    expect([rule('length'), rule('letter'), rule('number')]).toEqual(['false', 'true', 'false'])
    await page.find('#password').setValue('abc12345')
    expect([rule('length'), rule('letter'), rule('number')]).toEqual(['true', 'true', 'true'])
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: M4: el footer mostraba un teléfono y una dirección ficticios y un año fijo.
   * - ¿Qué hace esta prueba?: Verifica que no aparezcan los datos de relleno y que el año sea el actual.
   */
  it('footer_shouldNotShowFakeContactAndUseCurrentYear', async () => {
    loginAs()
    const { page } = await openPage('/stress/triggers')
    const footer = page.find('footer').text()
    expect(footer).not.toContain('555')
    expect(footer).not.toContain('Wellness St')
    expect(footer).toContain(`© ${new Date().getFullYear()} NeuroZen`)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: M5: el paso se presentaba como «Último paso» y con opciones preseleccionadas.
   * - ¿Qué hace esta prueba?: Verifica «Paso opcional», ninguna opción marcada y que «Omitir» continúe al test.
   */
  it('optionalOnboardingStep_shouldStartEmptyAndAllowSkip', async () => {
    loginAs('user', { workType: 'formal', ageRange: '25-34' })
    const { page, router } = await openPage('/onboarding/profile')
    expect(page.text()).toContain('Paso opcional')
    expect(page.findAll('[aria-pressed="true"]')).toHaveLength(0)
    await page.find('[data-testid="skip-optional"]').trigger('click')
    await pause(10)
    await waitFor(() => expect(router.currentRoute.value.name).toBe('Assessment'))
  })
})
