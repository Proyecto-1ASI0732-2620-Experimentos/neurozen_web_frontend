// Pruebas de integración: el perfil profesional se guarda aunque el psicólogo aún no tenga horario,
// y lo escrito no se pierde al ir a «Horario» (bug reportado)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { verifiedProfessional } from '../mocks/data.js'
import { openPage, loginAs, waitFor, button } from '../helpers.js'

const BIO = 'Psicóloga clínica con enfoque integral en ansiedad, estrés laboral y procesos de duelo.'

// Imita la regla real del backend: PUT /professionals/me exige availabilitySchedule (400 si falta)
function useProfessional(initial) {
  const state = { profile: { ...initial }, puts: [] }
  server.use(
    http.get(API + '/professionals/me', () => HttpResponse.json(state.profile)),
    http.put(API + '/professionals/me', async ({ request }) => {
      const body = await request.json()
      state.puts.push(body)
      if (!body.availabilitySchedule?.days?.length) {
        return HttpResponse.json({ message: 'Datos inválidos', errors: { availabilitySchedule: ['Indica tus días y horario de atención'] } }, { status: 400 })
      }
      state.profile = { ...state.profile, ...body, name: body.fullName ?? state.profile.name }
      return HttpResponse.json(state.profile)
    })
  )
  return state
}

const newlyVerified = { ...verifiedProfessional, bio: '', experienceYears: 0, price: 0, availabilitySchedule: null, availability: '' }

describe('ProProfileSchedule', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Un psicólogo recién verificado no tiene horario y el backend exige el horario en cada guardado;
   *   antes no podía guardar biografía, años ni tarifa.
   * - ¿Qué hace?: Sin horario, el perfil pide días y horas en el mismo formulario y guarda todo en un solo PUT.
   */
  it('newlyVerifiedWithoutSchedule_shouldSaveBioYearsPriceAndScheduleTogether', async () => {
    loginAs('psychologist')
    const state = useProfessional(newlyVerified)
    const { page } = await openPage('/pro/profile')
    await waitFor(() => expect(page.find('[data-testid="profile-availability"]').exists()).toBe(true))

    await page.find('#pp-bio').setValue(BIO)
    await page.find('#pp-exp').setValue(5)
    await page.find('#pp-price').setValue(80)
    await page.find('[data-testid="pp-av-day-saturday"]').trigger('click')
    await page.find('main form').trigger('submit')

    await waitFor(() => expect(state.puts).toHaveLength(1))
    expect(state.puts[0]).toMatchObject({
      bio: BIO, experienceYears: 5, price: 80,
      availabilitySchedule: { days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], start: '09:00', end: '18:00' }
    })
    await waitFor(() => expect(page.find('[data-testid="profile-availability"]').exists()).toBe(false))
    expect(page.text()).toContain('4 de 4 pasos completados')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Al ir a «Horario» se perdía lo escrito en biografía, años y tarifa.
   * - ¿Qué hace?: Escribe, va a Horario, vuelve al perfil y encuentra sus datos con un aviso.
   */
  it('unsavedChanges_shouldSurviveGoingToScheduleAndBack', async () => {
    loginAs('psychologist')
    useProfessional(newlyVerified)
    const { page, router } = await openPage('/pro/profile')
    await waitFor(() => expect(page.find('#pp-bio').exists()).toBe(true))
    await page.find('#pp-bio').setValue(BIO)
    await page.find('#pp-exp').setValue(7)
    await page.find('#pp-price').setValue(95)

    await router.push('/pro/schedule')
    await waitFor(() => expect(router.currentRoute.value.name).toBe('ProSchedule'))
    await router.push('/pro/profile')

    await waitFor(() => expect(page.find('#pp-bio').element.value).toBe(BIO))
    expect(Number(page.find('#pp-exp').element.value)).toBe(7)
    expect(Number(page.find('#pp-price').element.value)).toBe(95)
    expect(page.find('[data-testid="draft-restored"]').exists()).toBe(true)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El horario guardado desde «Horario» no debe borrar lo que se escriba después en el perfil.
   * - ¿Qué hace?: Con horario ya guardado, el perfil no vuelve a pedirlo y el PUT conserva ese horario.
   */
  it('withSavedSchedule_shouldNotAskAgainAndKeepIt', async () => {
    loginAs('psychologist')
    const state = useProfessional({ ...newlyVerified, availabilitySchedule: { days: ['monday'], start: '10:00', end: '14:00' } })
    const { page } = await openPage('/pro/profile')
    await waitFor(() => expect(page.find('#pp-bio').exists()).toBe(true))
    expect(page.find('[data-testid="profile-availability"]').exists()).toBe(false)
    await page.find('#pp-bio').setValue(BIO)
    await page.find('main form').trigger('submit')
    await waitFor(() => expect(state.puts).toHaveLength(1))
    expect(state.puts[0].availabilitySchedule).toEqual({ days: ['monday'], start: '10:00', end: '14:00' })
    expect(state.puts[0].bio).toBe(BIO)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Un horario inválido no se envía; un error del backend se muestra en su campo.
   */
  it('invalidSchedule_shouldBlock_andBackendErrorsShowUnderFields', async () => {
    loginAs('psychologist')
    const state = useProfessional(newlyVerified)
    server.use(http.put(API + '/professionals/me', async ({ request }) => {
      state.puts.push(await request.json())
      return HttpResponse.json({ message: 'Datos inválidos', errors: { bio: ['La presentación no puede superar 800 caracteres'] } }, { status: 400 })
    }))
    const { page } = await openPage('/pro/profile')
    await waitFor(() => expect(page.find('[data-testid="profile-availability"]').exists()).toBe(true))
    await page.find('#pp-av-end').setValue('08:00')
    await page.find('main form').trigger('submit')
    expect(page.find('[data-testid="pp-av-error"]').exists()).toBe(true)
    expect(state.puts).toHaveLength(0)

    await page.find('#pp-av-end').setValue('18:00')
    await page.find('#pp-bio').setValue(BIO)
    await page.find('main form').trigger('submit')
    await waitFor(() => expect(page.text()).toContain('La presentación no puede superar 800 caracteres'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Un psicólogo rechazado sin horario no podía reenviar su solicitud (400) ni entrar a «Horario».
   * - ¿Qué hace?: El reenvío pide el horario y lo incluye en el PUT.
   */
  it('rejectedWithoutSchedule_shouldResubmitIncludingSchedule', async () => {
    loginAs('psychologist', { verificationStatus: 'rejected' })
    const state = useProfessional({ ...newlyVerified, verificationStatus: 'REJECTED', rejectionReason: 'El nombre no coincide con el CPsP.' })
    const { page } = await openPage('/pro/status')
    await waitFor(() => expect(page.find('[data-testid="resubmit-availability"]').exists()).toBe(true))
    await page.find('#rs-name').setValue('Elena Ramírez Soto')
    await button(page, 'Reenviar').trigger('click')
    await waitFor(() => expect(state.puts).toHaveLength(1))
    expect(state.puts[0]).toMatchObject({ fullName: 'Elena Ramírez Soto', availabilitySchedule: { days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] } })
  })
})
