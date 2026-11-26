// Pruebas de integración (app real + API simulada MSW) de los caminos secundarios de las correcciones:
// navegación del calendario, cancelar una edición, conflicto 409, reserva directa, ajustes de accesibilidad,
// detalle del psicólogo, períodos del panel y controles de ZenBot.
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { openPage, loginAs, waitFor, button, pause } from '../helpers.js'
import { DashboardService } from '../../src/services/DashboardService.js'

const fixedNow = () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-10T10:00:00-05:00'))
}
const dayButton = (page, n) => page.findAll('.grid-cols-7 button').find((b) => b.text() === String(n))

describe('BookSession secondary paths', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Al llegar desde el perfil (?professionalId=) el profesional debe venir elegido y
   *   el calendario debe poder recorrer meses y saltar a la próxima fecha disponible.
   * - ¿Qué hace esta prueba?: Abre con professionalId=1, avanza y retrocede de mes y usa «Elegir esta fecha».
   */
  it('preselectedProfessional_monthNavigationAndPickNextDate', async () => {
    fixedNow()
    loginAs()
    const { page } = await openPage('/book-session?professionalId=1')
    await waitFor(() => expect(page.find('[role="radio"][aria-checked="true"]').exists()).toBe(true))
    await button(page, 'Siguiente').trigger('click')
    await waitFor(() => expect(page.text()).toContain('Octubre de 2026'))
    await page.find('button[aria-label="Mes siguiente"]').trigger('click')
    expect(page.text()).toContain('Noviembre de 2026')
    await page.find('button[aria-label="Mes anterior"]').trigger('click')
    expect(page.text()).toContain('Octubre de 2026')
    await button(page, 'Elegir esta fecha').trigger('click')
    await waitFor(() => expect(page.find('button.slot').exists()).toBe(true))
    expect(dayButton(page, 12).attributes('aria-pressed')).toBe('true')
    await button(page, 'Anterior').trigger('click')
    expect(page.text()).toContain('Seleccionar Profesional')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: «Editar fecha» debe permitir cambiar de día y «Cancelar cambio» debe restaurar
   *   lo elegido antes; si el backend responde 409 al confirmar, se vuelve a pedir la hora sin perder datos.
   * - ¿Qué hace esta prueba?: Edita la fecha, cancela, vuelve a editar, cambia al lunes 26 y simula un 409 al confirmar.
   */
  it('editDate_cancelAndConflictOnConfirm', async () => {
    fixedNow()
    let attempts = 0
    server.use(http.post(API + '/appointments', () => {
      attempts++
      return HttpResponse.json({ message: 'El horario ya no está disponible' }, { status: 409 })
    }))
    loginAs()
    const { page } = await openPage('/book-session')
    await waitFor(() => expect(page.text()).toContain('Dra. Elena Ramírez'))
    await page.find('[role="radio"]').trigger('click')
    await button(page, 'Siguiente').trigger('click')
    await dayButton(page, 21).trigger('click')
    await waitFor(() => expect(page.find('button.slot').exists()).toBe(true))
    await page.find('button.slot').trigger('click')
    await button(page, 'Siguiente').trigger('click')
    await page.find('[role="radio"]').trigger('click')
    await button(page, 'Siguiente').trigger('click')

    await page.find('[data-testid="edit-date"]').trigger('click')
    await waitFor(() => expect(page.text()).toContain('Estás cambiando la fecha u hora'))
    await dayButton(page, 26).trigger('click')
    await button(page, 'Cancelar cambio').trigger('click')
    await waitFor(() => expect(page.text()).toContain('miércoles, 21 de octubre de 2026'.replace(/^./, 'M')))

    await page.find('[data-testid="edit-date"]').trigger('click')
    await dayButton(page, 26).trigger('click')
    await waitFor(() => expect(page.find('button.slot-active').exists()).toBe(true))
    await button(page, 'Volver al resumen').trigger('click')
    await waitFor(() => expect(page.text()).toContain('Lunes, 26 de octubre de 2026'))

    await button(page, 'Confirmar cita').trigger('click')
    await waitFor(() => expect(page.text()).toContain('Esa hora ya no está disponible'))
    expect(attempts).toBe(1)
    expect(page.find('button.slot-active').exists()).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si la lista no trae el horario, se pide el perfil completo; si tampoco lo tiene,
   *   se avisa que el profesional no publicó su horario.
   * - ¿Qué hace esta prueba?: Lista sin horario y perfil con horario → el miércoles 21 queda disponible; luego un
   *   profesional sin horario en ningún lado muestra el aviso.
   */
  it('missingScheduleInList_shouldUseProfileOrWarn', async () => {
    fixedNow()
    server.use(
      http.get(API + '/professionals', () => HttpResponse.json([
        { id: 1, name: 'Dra. Elena Ramírez', verificationStatus: 'VERIFIED', specialty: 'clinical', price: 80 },
        { id: 4, name: 'Lic. Sin Horario', verificationStatus: 'VERIFIED', specialty: 'clinical' }
      ])),
      http.get(API + '/professionals/:id', ({ params }) => HttpResponse.json(params.id === '1'
        ? { id: 1, name: 'Dra. Elena Ramírez', verificationStatus: 'VERIFIED', availabilitySchedule: { days: ['wednesday'], start: '09:00', end: '12:00' } }
        : { id: 4, name: 'Lic. Sin Horario', verificationStatus: 'VERIFIED' }))
    )
    loginAs()
    const { page } = await openPage('/book-session')
    await waitFor(() => expect(page.text()).toContain('Lic. Sin Horario'))
    await page.findAll('[role="radio"]')[0].trigger('click')
    await pause(20)
    await button(page, 'Siguiente').trigger('click')
    await waitFor(() => expect(dayButton(page, 21).element.disabled).toBe(false))
    await button(page, 'Anterior').trigger('click')
    await page.findAll('[role="radio"]')[1].trigger('click')
    await pause(20)
    await button(page, 'Siguiente').trigger('click')
    await waitFor(() => expect(page.text()).toContain('aún no publicó su horario'))
  })
})

describe('BookAppointment (direct booking) availability', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: En la reserva directa el selector de fecha nativo no puede deshabilitar días,
   *   así que se valida el día elegido y se ofrece la próxima fecha disponible.
   * - ¿Qué hace esta prueba?: Elige el martes 20 (no atiende), usa el botón de próxima fecha (miércoles 21), y prueba una
   *   fecha fuera de la ventana de 90 días.
   */
  it('nonWorkingDay_shouldOfferNextDateAndRejectOutOfRange', async () => {
    fixedNow()
    loginAs()
    const { page } = await openPage('/book-appointment/1')
    await waitFor(() => expect(page.find('#ba-date').exists()).toBe(true))
    expect(page.text()).toContain('Atiende: Lun, Mié · 09:00 - 13:00')
    await page.find('#ba-date').setValue('2026-10-20')
    await page.find('#ba-date').trigger('change')
    await waitFor(() => expect(page.text()).toContain('El profesional no atiende ese día'))
    await button(page, 'Próxima fecha disponible').trigger('click')
    await waitFor(() => expect(page.find('button.slot').exists()).toBe(true))
    expect(page.find('#ba-date').element.value).toBe('2026-10-21')

    await page.find('#ba-date').setValue('2027-06-01')
    await page.find('#ba-date').trigger('change')
    await waitFor(() => expect(page.text()).toContain('Elige una fecha entre hoy y los próximos 90 días'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si la hora se ocupa mientras el usuario completa el formulario, el backend
   *   responde 409 y se debe pedir otra hora.
   * - ¿Qué hace esta prueba?: Simula el 409 y verifica el aviso junto a las horas.
   */
  it('conflict_shouldAskForAnotherTime', async () => {
    fixedNow()
    server.use(http.post(API + '/appointments', () => HttpResponse.json({ message: 'El horario ya no está disponible' }, { status: 409 })))
    loginAs()
    const { page } = await openPage('/book-appointment/1')
    await waitFor(() => expect(page.find('#ba-date').exists()).toBe(true))
    await page.find('#ba-date').setValue('2026-10-21')
    await page.find('#ba-date').trigger('change')
    await waitFor(() => expect(page.find('button.slot').exists()).toBe(true))
    await page.find('button.slot').trigger('click')
    await page.find('#ba-phone').setValue('987654321')
    await page.find('main form').trigger('submit')
    await waitFor(() => expect(page.text()).toContain('Esa hora ya no está disponible'))
  })
})

describe('Therapist detail (M2)', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: La ficha del profesional también debe mostrar solo datos reales.
   * - ¿Qué hace esta prueba?: Verifica especialidad traducida, años de experiencia, tarifa, horario y «Tarifa por definir».
   */
  it('detail_shouldShowRealData', async () => {
    loginAs()
    const { page } = await openPage('/therapist/1')
    await waitFor(() => expect(page.text()).toContain('Psicología clínica'))
    expect(page.text()).toContain('8 años de experiencia')
    expect(page.text()).toContain('$80')
    expect(page.text()).toContain('Lun, Mié · 09:00 - 13:00')
    server.use(http.get(API + '/professionals/:id', () => HttpResponse.json({ id: 1, name: 'Dra. Elena Ramírez', verificationStatus: 'VERIFIED', price: null })))
    const second = await openPage('/therapist/2')
    await waitFor(() => expect(second.page.text()).toContain('Tarifa por definir'))
  })
})

describe('Settings accessibility controls (B2)', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Los controles A-/A+, el contraste y «Restablecer» deben aplicar cambios reales.
   * - ¿Qué hace esta prueba?: Pulsa A+, activa alto contraste (clase en <html> y estado «Activado») y restablece.
   */
  it('fontAndContrast_shouldApplyAndReset', async () => {
    loginAs()
    const { page } = await openPage('/settings')
    await page.find('button[aria-label="Aumentar tamaño de texto (A+)"]').trigger('click')
    expect(document.documentElement.style.fontSize).toBe('17px')
    await page.find('button[aria-label="Reducir tamaño de texto (A-)"]').trigger('click')
    await page.find('button[aria-label="Reducir tamaño de texto (A-)"]').trigger('click')
    expect(document.documentElement.style.fontSize).toBe('15px')
    await page.find('button[role="switch"][aria-label="Alto contraste"]').trigger('click')
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true)
    expect(page.text()).toContain('Activado')
    await button(page, 'Restablecer').trigger('click')
    expect(document.documentElement.classList.contains('high-contrast')).toBe(false)
    expect(document.documentElement.style.fontSize).toBe('16px')
  })
})

describe('Dashboard periods (A1)', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Los períodos Día y Mes deben agrupar los registros reales sin inventar valores.
   * - ¿Qué hace esta prueba?: Con un registro de hoy a las 10:00 y otro de hace 10 días, revisa los intervalos.
   */
  it('dayAndMonthPeriods_shouldBucketRealRecords', () => {
    const service = new DashboardService()
    const now = new Date(2026, 10, 26, 18)
    const triggers = [
      { stressLevel: 6, triggeredAt: new Date(2026, 10, 26, 10) },
      { stressLevel: 4, triggeredAt: new Date(2026, 10, 16, 9) }
    ]
    const day = service._fromTriggers(triggers, 'day', now)
    expect(day.weeklyData.find((b) => b.day === '09:00').value).toBe(6)
    expect(day.weeklyData.find((b) => b.day === '06:00').value).toBeNull()
    const month = service._fromTriggers(triggers, 'month', now)
    expect(month.weeklyData.map((b) => b.value)).toEqual([null, null, 4, 6])
    expect(month.periodCount).toBe(2)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Cambiar de período en el panel debe pedir los datos del período elegido.
   * - ¿Qué hace esta prueba?: Con un registro reciente, pulsa «Mes» y verifica que siga mostrando la escala 1-10.
   */
  it('changePeriod_shouldReloadWithScale', async () => {
    server.use(http.get(API + '/triggers', () => HttpResponse.json([
      { id: 1, description: 'Reunión', category: 'meeting', stressLevel: 7, triggeredAt: new Date(Date.now() - 3600e3).toISOString() }
    ])))
    loginAs()
    const { page } = await openPage('/')
    await waitFor(() => expect(page.text()).toContain('Intensidad percibida (escala 1-10)'))
    await page.findAll('[role="radio"]').find((b) => b.text() === 'Mes').trigger('click')
    await waitFor(() => expect(page.text()).toContain('Último mes'))
    expect(page.text()).toContain('7/10')
  })
})

describe('ZenBot controls (Z2/Z7)', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Se debe poder volver a ver las opciones, reiniciar y cerrar con Esc, y la
   *   conversación debe recuperarse durante la sesión del navegador.
   * - ¿Qué hace esta prueba?: Envía un mensaje, alterna las opciones, reinicia, cierra con Esc y reabre la página.
   */
  it('toggleOptions_restart_escape_andRestore', async () => {
    loginAs()
    let { page } = await openPage('/')
    await page.find('button[aria-label="Abrir ZenBot, tu asistente"]').trigger('click')
    await page.find('#zenbot-input').setValue('hola')
    await page.find('section[data-testid="zenbot"] form').trigger('submit')
    await pause(550)
    expect(page.findAll('[data-starter]')).toHaveLength(0)
    await page.find('button[aria-label="Mostrar opciones de conversación"]').trigger('click')
    expect(page.findAll('[data-starter]')).toHaveLength(10)

    ;({ page } = await openPage('/'))
    await page.find('button[aria-label="Abrir ZenBot, tu asistente"]').trigger('click')
    expect(page.text()).toContain('hola')

    await page.find('button[aria-label="Reiniciar conversación"]').trigger('click')
    expect(page.text()).not.toContain('¿Cómo te sientes hoy?')
    await page.find('section[data-testid="zenbot"]').trigger('keydown', { key: 'Escape' })
    expect(page.find('section[data-testid="zenbot"]').exists()).toBe(false)
  })
})
