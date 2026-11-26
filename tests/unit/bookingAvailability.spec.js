// Pruebas unitarias: disponibilidad del calendario de reservas (A2) y filtro de tarifas (M1/M2)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import {
  AppointmentService, isScheduledDay, nextAvailableDate, slotsFromSchedule, hasSchedule, bookingRange
} from '../../src/services/AppointmentService.js'
import { normalizeProfessional } from '../../src/services/TherapistService.js'
import { matchesFeeRange, formatFee, specialtyLabel } from '../../src/utils/professionalFormat.js'
import { parseAvailabilityText } from '../../src/utils/scheduleParser.js'
import { passwordChecks, isStrongPassword } from '../../src/utils/validation.js'

const MON_WED = { days: ['monday', 'wednesday'], start: '09:00', end: '13:00' }

describe('Booking availability (A2)', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El usuario podía elegir días en los que el psicólogo no atiende.
   * - ¿Qué hace esta prueba?: Con horario lunes y miércoles, verifica que el martes no sea un día disponible.
   */
  it('scheduledDays_shouldFollowPublishedSchedule', () => {
    expect(isScheduledDay('2026-10-19', MON_WED)).toBe(true) // lunes
    expect(isScheduledDay('2026-10-20', MON_WED)).toBe(false) // martes
    expect(isScheduledDay('2026-10-21', MON_WED)).toBe(true) // miércoles
    expect(isScheduledDay('2026-10-19', null)).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si el día elegido no tiene horarios se debe mostrar la próxima fecha disponible.
   * - ¿Qué hace esta prueba?: Desde el martes 20 debe proponer el miércoles 21; si el 21 ya se sabe que está lleno,
   *   el lunes 26.
   */
  it('nextAvailableDate_shouldSkipUnavailableDays', () => {
    const range = { min: '2026-10-10', max: '2026-12-31' }
    expect(nextAvailableDate('2026-10-20', MON_WED, { range })).toBe('2026-10-21')
    expect(nextAvailableDate('2026-10-20', MON_WED, { range, unavailable: new Set(['2026-10-21']) })).toBe('2026-10-26')
    expect(nextAvailableDate(null, MON_WED, { range })).toBe('2026-10-12')
    expect(nextAvailableDate('2026-10-20', null, { range })).toBeNull()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Las fechas fuera del rango permitido no deben ofrecerse.
   * - ¿Qué hace esta prueba?: Verifica que no se proponga una fecha posterior al máximo del rango.
   */
  it('nextAvailableDate_shouldRespectRangeLimit', () => {
    expect(nextAvailableDate('2026-10-21', MON_WED, { range: { min: '2026-10-10', max: '2026-10-25' } })).toBeNull()
    const r = bookingRange(new Date(2026, 9, 10))
    expect(r).toEqual({ min: '2026-10-10', max: '2027-01-08' })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Antes, si el endpoint de horarios fallaba, se inventaban horas fijas.
   * - ¿Qué hace esta prueba?: Sin endpoint, las horas salen del horario publicado; sin horario publicado no hay horas.
   */
  it('slotsWithoutEndpoint_shouldComeFromScheduleOrBeEmpty', async () => {
    server.use(http.get(API + '/professionals/:id/available-slots', () => HttpResponse.json({}, { status: 404 })))
    const service = new AppointmentService()
    const withSchedule = await service.getSlotsForDate(1, '2026-12-21', MON_WED)
    const noSchedule = await service.getSlotsForDate(1, '2026-12-21', null)
    expect(withSchedule).toEqual({ slots: ['09:00', '10:00', '11:00', '12:00'], source: 'schedule' })
    expect(noSchedule).toEqual({ slots: [], source: 'none' })
    expect(slotsFromSchedule(MON_WED, 45)).toEqual(['09:00', '09:45', '10:30', '11:15', '12:00'])
    expect(hasSchedule({ days: ['monday'], start: '10:00', end: '09:00' })).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si el backend expone las horas libres, son la fuente de verdad.
   * - ¿Qué hace esta prueba?: Verifica que se usen las horas de la API (ordenadas y sin duplicados).
   */
  it('slotsFromApi_shouldBeAuthoritative', async () => {
    server.use(http.get(API + '/professionals/:id/available-slots', () => HttpResponse.json([{ time: '11:00' }, '10:00', '10:00'])))
    const result = await new AppointmentService().getSlotsForDate(1, '2026-12-21', MON_WED)
    expect(result).toEqual({ slots: ['10:00', '11:00'], source: 'api' })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Algunos perfiles solo tienen la disponibilidad como texto; sin interpretarla,
   *   esos profesionales no tendrían fechas reservables. Un texto no interpretable no debe convertirse en horario.
   * - ¿Qué hace esta prueba?: Interpreta el formato que guarda el frontend y formatos antiguos; uno libre devuelve null.
   */
  it('availabilityText_shouldBeParsedWithoutGuessing', () => {
    expect(parseAvailabilityText('Lun, Mié · 09:00 - 13:00')).toEqual(MON_WED)
    expect(parseAvailabilityText('Lunes a Viernes, 9 AM - 6 PM')).toEqual({ days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], start: '09:00', end: '18:00' })
    expect(parseAvailabilityText('Lun-Vie: 9:00-17:00')?.days).toHaveLength(5)
    expect(parseAvailabilityText('cuando pueda')).toBeNull()
    expect(normalizeProfessional({ id: 9, availability: 'Sáb, Dom · 10:00 - 14:00' }).availabilitySchedule).toEqual({ days: ['saturday', 'sunday'], start: '10:00', end: '14:00' })
  })
})

describe('Professional cards and fee filter (M1/M2)', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Un valor nulo no debe interpretarse como tarifa 0 ni como 0 estrellas.
   * - ¿Qué hace esta prueba?: Normaliza un profesional sin tarifa ni reseñas y verifica price y rating en null.
   */
  it('missingFeeAndReviews_shouldNotBecomeZero', () => {
    const p = normalizeProfessional({ id: 1, fullName: 'Ana Torres', price: null, rating: 0, reviews: 0 })
    expect(p.price).toBeNull()
    expect(p.rating).toBeNull()
    expect(p.reviews).toBe(0)
    expect(formatFee(p.price)).toBeNull()
    expect(normalizeProfessional({ price: 80, rating: 4.6, reviewsCount: 12 })).toMatchObject({ price: 80, rating: 4.6, reviews: 12 })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El filtro de tarifa debe respetar el rango y no incluir tarifas por definir.
   * - ¿Qué hace esta prueba?: Comprueba límites inclusivos, rangos abiertos y el caso sin tarifa.
   */
  it('feeRange_shouldFilterInclusiveAndExcludeUndefinedFees', () => {
    expect(matchesFeeRange(80, '', '')).toBe(true)
    expect(matchesFeeRange(null, '', '')).toBe(true)
    expect(matchesFeeRange(80, 50, 80)).toBe(true)
    expect(matchesFeeRange(81, 50, 80)).toBe(false)
    expect(matchesFeeRange(40, 50, '')).toBe(false)
    expect(matchesFeeRange(null, 0, 100)).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: La especialidad debe mostrarse en el idioma activo.
   * - ¿Qué hace esta prueba?: Traduce una clave conocida y deja tal cual un texto libre.
   */
  it('specialtyLabel_shouldTranslateKnownKeys', () => {
    const t = (k) => ({ 'specialties.clinical': 'Clinical psychology' }[k] || k)
    expect(specialtyLabel(t, 'clinical')).toBe('Clinical psychology')
    expect(specialtyLabel(t, 'Terapia breve')).toBe('Terapia breve')
  })
})

describe('Backend contract alignment', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El calendario debe usar GET /appointments/availability (contrato del backend
   *   revisado) y seguir funcionando si el endpoint no existe.
   * - ¿Qué hace esta prueba?: Lee días con y sin horas y nextAvailableDate; ante un 404 devuelve null (se usa el horario).
   */
  it('availabilityRange_shouldMapBackendContractOrFallBack', async () => {
    server.use(http.get(API + '/appointments/availability', () => HttpResponse.json({
      professionalId: 1, timeZone: 'America/Lima', slotMinutes: 60,
      days: [{ date: '2026-12-21', slots: ['09:00', '10:00'] }, { date: '2026-12-23', slots: [] }],
      nextAvailableDate: '2026-12-21'
    })))
    const result = await new AppointmentService().getAvailabilityRange(1, '2026-12-01', '2026-12-31')
    expect(result.days).toEqual({ '2026-12-21': ['09:00', '10:00'], '2026-12-23': [] })
    expect(result.nextAvailableDate).toBe('2026-12-21')
    server.use(http.get(API + '/appointments/availability', () => HttpResponse.json({}, { status: 404 })))
    expect(await new AppointmentService().getAvailabilityRange(1, '2026-12-01', '2026-12-31')).toBeNull()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El checklist debe usar exactamente PasswordPolicy del backend (B10): letras y
   *   dígitos Unicode y máximo 72 bytes UTF-8.
   * - ¿Qué hace esta prueba?: Acepta "ññññññññ1" y "Пароль123", rechaza "12345678" y una contraseña de 73 bytes.
   */
  it('passwordPolicy_shouldMatchBackendRules', () => {
    expect(isStrongPassword('ññññññññ1')).toBe(true)
    expect(isStrongPassword('Пароль123')).toBe(true)
    expect(isStrongPassword('12345678')).toBe(false)
    expect(passwordChecks('a1' + 'ñ'.repeat(36)).maxBytes).toBe(false)
    expect(passwordChecks('abc12345').maxBytes).toBe(true)
  })
})
