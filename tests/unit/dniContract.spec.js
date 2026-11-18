// Pruebas unitarias: reglas del registro alineadas con el backend (DNI, nombre, colegiatura),
// payload del sign-up, privacidad del DNI y manejo del 403 de psicólogo no verificado
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import {
  dniError, isDni, onlyDigits, maskDni, fullNameError, normalizeFullName, isLicenseDigits
} from '../../src/utils/validation.js'
import { AuthService, normalizeUser } from '../../src/services/AuthService.js'
import { HttpClient } from '../../src/services/HttpClient.js'
import { fieldErrors, isProfessionalNotVerified, ApiError } from '../../src/services/ApiError.js'
import { setSession, getCurrentUser, setProfessionalNotVerifiedHandler } from '../../src/services/session.js'
import { StaticAPIAdapter } from '../../src/services/StaticAPIAdapter.js'
import { createToken, user, psychologist } from '../mocks/data.js'

describe('DniContract', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El backend acepta solo 8 dígitos 0-9 y recorta los espacios de los extremos.
   * - ¿Qué hace?: Comprueba vacío, 7, 9, letras, símbolos, espacio interno, dígitos no ASCII y extremos con espacios.
   */
  it('dniRules_shouldMatchBackend', () => {
    expect(dniError('')).toBe('dniRequired')
    expect(dniError('   ')).toBe('dniRequired')
    expect(dniError('1234567')).toBe('dniFormat')
    expect(dniError('123456789')).toBe('dniFormat')
    expect(dniError('1234567A')).toBe('dniFormat')
    expect(dniError('1234-567')).toBe('dniFormat')
    expect(dniError('1234 5678')).toBe('dniFormat')
    expect(dniError('١٢٣٤٥٦٧٨')).toBe('dniFormat') // dígitos arábigos: el backend usa [0-9]
    expect(dniError(' 12345678 ')).toBe('')
    expect(isDni('12345678')).toBe(true)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Los campos numéricos deben descartar lo que no sea 0-9, también lo pegado.
   * - ¿Qué hace?: Filtra letras, símbolos, espacios y dígitos no ASCII, y limita la longitud.
   */
  it('onlyDigits_shouldFilterPastedText', () => {
    expect(onlyDigits('12a3-4 5.6789', 8)).toBe('12345678')
    expect(onlyDigits('C.Ps.P. 45821', 6)).toBe('45821')
    expect(onlyDigits('١٢٣', 8)).toBe('')
    expect(maskDni('12345678')).toBe('****5678')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El nombre no debe rechazar nombres legítimos (tildes, ñ, ü, guiones, apóstrofos, otros alfabetos).
   * - ¿Qué hace?: Valida casos aceptados y rechazados y la normalización de espacios.
   */
  it('fullNameRules_shouldMatchBackend', () => {
    expect(fullNameError("María-José O'Connor")).toBe('')
    expect(fullNameError('Peña Müller')).toBe('')
    expect(fullNameError('José’ D’Alessandro')).toBe('')
    expect(fullNameError('J. R. Tolkien')).toBe('')
    expect(fullNameError('Алексей Иванов')).toBe('')
    expect(fullNameError('')).toBe('required')
    expect(fullNameError('Lucía')).toBe('fullName')
    expect(fullNameError('Lucía 2 Mendoza')).toBe('fullNameChars')
    expect(fullNameError('Lucía_Mendoza Ruiz')).toBe('fullNameChars')
    expect(fullNameError(`Ana ${'a'.repeat(120)}`)).toBe('fullNameLength')
    expect(fullNameError('-- ..')).toBe('fullName')
    expect(normalizeFullName('  Ana   Torres  ')).toBe('Ana Torres')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: La colegiatura solo acepta de 3 a 6 dígitos 0-9.
   */
  it('licenseDigits_shouldAcceptOnly3To6AsciiDigits', () => {
    expect(isLicenseDigits('123')).toBe(true)
    expect(isLicenseDigits('123456')).toBe(true)
    expect(isLicenseDigits('12')).toBe(false)
    expect(isLicenseDigits('1234567')).toBe(false)
    expect(isLicenseDigits('12a45')).toBe(false)
    expect(isLicenseDigits('٤٥٨٢١')).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El sign-up debe enviar exactamente los campos del contrato y no guardar el DNI en la sesión.
   * - ¿Qué hace?: Registra un usuario, captura el cuerpo y revisa la sesión aunque GET /users/{id} devuelva el DNI.
   */
  it('register_shouldSendContractFields_andKeepDniOutOfSession', async () => {
    let body = null
    server.use(
      http.post(API + '/authentication/sign-up', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 15, fullName: body.fullName, email: body.email, role: 'USER', token: createToken() }, { status: 201 })
      }),
      http.get(API + '/users/15', () => HttpResponse.json({ id: 15, fullName: 'Lucía Mendoza', email: 'lucia@correo.com', role: 'USER', dni: '12345678' }))
    )
    await new AuthService().register({
      name: '  Lucía   Mendoza ', dni: ' 12345678 ', email: 'lucia@correo.com', password: 'Secreta123',
      confirmPassword: 'Secreta123', acceptedTerms: true, acceptedPrivacyPolicy: true
    })
    expect(body).toMatchObject({
      fullName: 'Lucía Mendoza', dni: '12345678', email: 'lucia@correo.com', password: 'Secreta123',
      confirmPassword: 'Secreta123', role: 'USER', acceptedTerms: true, acceptedPrivacyPolicy: true
    })
    expect(body).not.toHaveProperty('specialty')
    expect(getCurrentUser()).not.toHaveProperty('dni')
    expect(JSON.stringify({ ...localStorage })).not.toContain('12345678')
    expect(normalizeUser({ id: 1, dni: '12345678' })).not.toHaveProperty('dni')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Los errores del 400 llegan como { errors: { campo: [..] } } (a veces en PascalCase).
   */
  it('fieldErrors_shouldReturnFirstMessagePerField', () => {
    const error = new ApiError('x', { status: 400, details: { errors: { Dni: ['A', 'B'], confirmPassword: ['C'] } } })
    expect(fieldErrors(error)).toEqual({ dni: 'A', confirmPassword: 'C' })
    expect(fieldErrors(new ApiError('x'))).toEqual({})
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El 403 «Tu cuenta profesional aún no está verificada» debe marcarse y avisar una vez,
   *   pasando a "pending" a un psicólogo que estaba verificado.
   */
  it('notVerified403_shouldFlagErrorAndNotifyOnce', async () => {
    setSession({ token: createToken(), user: psychologist })
    const handler = vi.fn()
    setProfessionalNotVerifiedHandler(handler)
    server.use(http.get(API + '/appointments/501', () => HttpResponse.json({ message: 'Tu cuenta profesional aún no está verificada' }, { status: 403 })))

    const error = await new HttpClient().get('/api/v1/appointments/501').catch((e) => e)

    expect(isProfessionalNotVerified(error)).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(getCurrentUser().verificationStatus).toBe('pending')
    setProfessionalNotVerifiedHandler(null)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Un 403 distinto (o de un usuario que no es psicólogo) no debe redirigir a la pantalla de pendiente.
   */
  it('other403_shouldNotTriggerPendingRedirect', async () => {
    setSession({ token: createToken(), user })
    const handler = vi.fn()
    setProfessionalNotVerifiedHandler(handler)
    server.use(http.get(API + '/appointments/9', () => HttpResponse.json({ message: 'Acción no permitida' }, { status: 403 })))
    const error = await new HttpClient().get('/api/v1/appointments/9').catch((e) => e)
    expect(isProfessionalNotVerified(error)).toBe(false)
    expect(handler).not.toHaveBeenCalled()
    setProfessionalNotVerifiedHandler(null)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El modo demostración debe seguir el mismo contrato (DNI obligatorio) sin guardar el DNI.
   */
  it('staticDemoSignUp_shouldRequireDniAndNotStoreIt', async () => {
    server.use(http.get('*/data/db.json', () => HttpResponse.json({ users: [], professionals: [] })))
    const adapter = new StaticAPIAdapter()
    await expect(adapter.request('POST', '/api/v1/authentication/sign-up', { email: 'a@b.pe', password: 'Secreta123', fullName: 'Ana Ruiz', role: 'USER', acceptedTerms: true }))
      .rejects.toMatchObject({ status: 400, details: { errors: { dni: ['El DNI es obligatorio'] } } })
    await adapter.request('POST', '/api/v1/authentication/sign-up', { email: 'a@b.pe', password: 'Secreta123', fullName: 'Ana Ruiz', dni: '12345678', role: 'USER', acceptedTerms: true })
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('12345678')
  })
})
