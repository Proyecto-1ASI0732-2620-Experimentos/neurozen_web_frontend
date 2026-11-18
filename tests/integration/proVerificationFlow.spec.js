// Pruebas de integración: psicólogo que vuelve a PENDING (403 en citas y cambio de nombre)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { verifiedProfessional } from '../mocks/data.js'
import { openPage, loginAs, waitFor, button, dialogButton, dialog } from '../helpers.js'
import { getCurrentUser } from '../../src/services/session.js'

const NOT_VERIFIED = { message: 'Tu cuenta profesional aún no está verificada' }

describe('ProVerificationFlow', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Un psicólogo que volvió a PENDING recibe 403 al confirmar una cita; debe ir a la pantalla de
   *   cuenta pendiente, no ver un error genérico.
   * - ¿Qué hace?: Confirmar → 403 → ruta ProStatus y la sesión pasa a "pending".
   */
  it('confirmAppointment403_shouldRedirectToPendingScreen', async () => {
    loginAs('psychologist')
    server.use(http.patch(API + '/appointments/:id/status', () => HttpResponse.json(NOT_VERIFIED, { status: 403 })))
    const { page, router } = await openPage('/pro/schedule')
    await waitFor(() => expect(button(page, 'Confirmar')).toBeTruthy())

    // A partir de aquí el backend ya lo considera pendiente
    server.use(http.get(API + '/professionals/me', () => HttpResponse.json({ ...verifiedProfessional, verificationStatus: 'PENDING' })))
    await button(page, 'Confirmar').trigger('click')

    await waitFor(() => expect(router.currentRoute.value.name).toBe('ProStatus'))
    expect(getCurrentUser().verificationStatus).toBe('pending')
    await waitFor(() => expect(page.text()).toContain('Tu cuenta está en revisión'))
    expect(page.text()).not.toContain('Tu cuenta profesional aún no está verificada')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El listado de citas también responde 403 si la cuenta volvió a revisión.
   * - ¿Qué hace?: Abre el panel con GET /appointments → 403 y comprueba la redirección (sin pantalla de error).
   */
  it('appointmentList403_shouldRedirectToPendingScreen', async () => {
    loginAs('psychologist')
    server.use(http.get(API + '/appointments', () => HttpResponse.json(NOT_VERIFIED, { status: 403 })))
    const { router } = await openPage('/pro')
    server.use(http.get(API + '/professionals/me', () => HttpResponse.json({ ...verifiedProfessional, verificationStatus: 'PENDING' })))
    await waitFor(() => expect(router.currentRoute.value.name).toBe('ProStatus'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: GET /appointments/{id} ahora responde 403 a un psicólogo no verificado.
   * - ¿Qué hace?: Llama al servicio de detalle de cita con sesión de psicólogo → error marcado y redirección.
   */
  it('appointmentDetail403_shouldBeFlaggedAndRedirect', async () => {
    loginAs('psychologist')
    const { router } = await openPage('/pro')
    await waitFor(() => expect(router.currentRoute.value.name).toBe('ProDashboard'))
    server.use(
      http.get(API + '/appointments/:id', () => HttpResponse.json(NOT_VERIFIED, { status: 403 })),
      http.get(API + '/professionals/me', () => HttpResponse.json({ ...verifiedProfessional, verificationStatus: 'PENDING' }))
    )
    const { AppointmentService } = await import('../../src/services/AppointmentService.js')
    const { isProfessionalNotVerified } = await import('../../src/services/ApiError.js')
    const error = await new AppointmentService().getAppointment(501).catch((e) => e)
    expect(isProfessionalNotVerified(error)).toBe(true)
    await waitFor(() => expect(router.currentRoute.value.name).toBe('ProStatus'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Cambiar el nombre devuelve la verificación a PENDING; hay que avisar antes y redirigir después.
   * - ¿Qué hace?: Corrige el nombre → aparece el aviso → al confirmar se envía fullName, se refresca
   *   GET /professionals/me (PENDING) y se va a la pantalla de cuenta pendiente.
   */
  it('verifiedPsychologistChangingName_shouldWarnAndReturnToPending', async () => {
    loginAs('psychologist')
    let putBody = null
    let status = 'VERIFIED'
    server.use(
      http.get(API + '/professionals/me', () => HttpResponse.json({ ...verifiedProfessional, verificationStatus: status })),
      http.put(API + '/professionals/me', async ({ request }) => {
        putBody = await request.json()
        status = 'PENDING'
        return HttpResponse.json({ ...verifiedProfessional, ...putBody, name: putBody.fullName, verificationStatus: status })
      })
    )
    const { page, router } = await openPage('/pro/profile')
    await waitFor(() => expect(button(page, 'Corregir nombre')).toBeTruthy())
    expect(page.text()).toContain('Si cambias tu nombre, tu cuenta volverá a revisión del administrador.')

    await button(page, 'Corregir nombre').trigger('click')
    await page.find('#pp-name').setValue('Elena Ramírez Soto')
    await page.find('main form').trigger('submit')

    // Aviso previo: aún no se envió nada
    await waitFor(() => expect(dialog()).toBeTruthy())
    expect(dialog().text()).toContain('volverá a revisión del administrador')
    expect(putBody).toBeNull()

    await dialogButton('Cambiar y enviar a revisión').trigger('click')
    await waitFor(() => expect(router.currentRoute.value.name).toBe('ProStatus'))
    expect(putBody.fullName).toBe('Elena Ramírez Soto')
    expect(getCurrentUser().verificationStatus).toBe('pending')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Cancelar el aviso no debe cambiar nada.
   * - ¿Qué hace?: Corrige el nombre, cancela el aviso y comprueba que no se envió el PUT.
   */
  it('cancelNameChangeWarning_shouldNotSave', async () => {
    loginAs('psychologist')
    let puts = 0
    server.use(http.put(API + '/professionals/me', () => { puts++; return HttpResponse.json(verifiedProfessional) }))
    const { page, router } = await openPage('/pro/profile')
    await waitFor(() => expect(button(page, 'Corregir nombre')).toBeTruthy())
    await button(page, 'Corregir nombre').trigger('click')
    await page.find('#pp-name').setValue('Otro Nombre')
    await page.find('main form').trigger('submit')
    await waitFor(() => expect(dialog()).toBeTruthy())
    await dialogButton('Cancelar').trigger('click')
    expect(puts).toBe(0)
    expect(router.currentRoute.value.name).toBe('ProProfile')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Un psicólogo rechazado ve el motivo y corrige datos; la colegiatura solo acepta dígitos.
   * - ¿Qué hace?: Con estado REJECTED, pega "C.Ps.P. 12345" (queda "12345") y reenvía.
   */
  it('rejectedPsychologist_shouldSeeReasonAndResubmitDigitsOnlyLicense', async () => {
    loginAs('psychologist', { verificationStatus: 'rejected' })
    let putBody = null
    server.use(
      http.get(API + '/professionals/me', () => HttpResponse.json({ ...verifiedProfessional, verificationStatus: 'REJECTED', rejectionReason: 'El nombre no coincide con el CPsP.' })),
      http.put(API + '/professionals/me', async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json({ ...verifiedProfessional, ...putBody, verificationStatus: 'PENDING' })
      })
    )
    const { page } = await openPage('/pro/status')
    await waitFor(() => expect(page.text()).toContain('El nombre no coincide con el CPsP.'))
    await page.find('#rs-license').setValue('C.Ps.P. 12345')
    expect(page.find('#rs-license').element.value).toBe('12345')
    await page.find('#rs-name').setValue('Elena Ramírez Soto')
    await button(page, 'Reenviar').trigger('click')
    await waitFor(() => expect(putBody).not.toBeNull())
    expect(putBody).toMatchObject({ licenseNumber: '12345', fullName: 'Elena Ramírez Soto' })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Cuando el administrador aprueba, el psicólogo pendiente debe poder entrar a su portal.
   * - ¿Qué hace?: Pendiente en la pantalla de estado; el backend pasa a VERIFIED; "Comprobar estado" lo lleva al portal.
   */
  it('pendingPsychologistApproved_shouldAccessPortal', async () => {
    loginAs('psychologist', { verificationStatus: 'pending' })
    let status = 'PENDING'
    server.use(http.get(API + '/professionals/me', () => HttpResponse.json({ ...verifiedProfessional, verificationStatus: status })))
    const { page, router } = await openPage('/pro')
    await waitFor(() => expect(router.currentRoute.value.name).toBe('ProStatus'))
    await waitFor(() => expect(button(page, 'Comprobar estado')).toBeTruthy())

    status = 'VERIFIED' // el administrador aprobó la solicitud
    await button(page, 'Comprobar estado').trigger('click')

    await waitFor(() => expect(['ProWelcome', 'ProDashboard']).toContain(router.currentRoute.value.name))
    expect(getCurrentUser().verificationStatus).toBe('verified')
  })
})
