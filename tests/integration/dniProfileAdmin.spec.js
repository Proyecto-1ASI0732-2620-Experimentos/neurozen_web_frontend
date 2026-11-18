// Pruebas de integración: DNI en el perfil propio (solo lectura) y en el panel de administración
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { pendingProfessional, backendUsers } from '../mocks/data.js'
import { openPage, loginAs, waitFor, button } from '../helpers.js'

describe('DniProfileAdmin', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: GET /users/{id} devuelve el DNI; debe verse enmascarado, en solo lectura y sin guardarse en la sesión.
   * - ¿Qué hace?: Abre el perfil, ve "****5678", lo muestra completo con el botón y comprueba el almacenamiento.
   */
  it('profile_shouldShowMaskedReadOnlyDni', async () => {
    loginAs('user')
    const { page } = await openPage('/profile')
    await waitFor(() => expect(page.find('#pf-dni').element.value).toBe('****5678'))
    expect(page.find('#pf-dni').attributes('readonly')).toBeDefined()
    await button(page, 'Mostrar DNI').trigger('click')
    expect(page.find('#pf-dni').element.value).toBe('12345678')
    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })
    expect(stored).not.toContain('12345678')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Las cuentas antiguas tienen dni "" y no deben quedar bloqueadas.
   * - ¿Qué hace?: GET /users/{id} con dni vacío → "No registrado", y el perfil se puede guardar.
   */
  it('legacyAccountWithoutDni_shouldShowNotRegisteredAndStillSave', async () => {
    loginAs('user')
    let putBody = null
    server.use(
      http.get(API + '/users/:id', () => HttpResponse.json({ ...backendUsers[7], dni: '' })),
      http.put(API + '/users/:id', async ({ request }) => {
        putBody = await request.json()
        return HttpResponse.json(putBody)
      })
    )
    const { page } = await openPage('/profile')
    await waitFor(() => expect(page.find('#pf-dni').element.value).toBe('No registrado'))

    await button(page, 'Editar').trigger('click')
    await page.find('#pf-phone').setValue('987654321')
    await button(page, 'Guardar Cambios').trigger('click')

    await waitFor(() => expect(putBody).not.toBeNull())
    expect(putBody).not.toHaveProperty('dni')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El DNI no es editable: el PUT /users/{id} no debe enviarlo y la fecha va como YYYY-MM-DD.
   * - ¿Qué hace?: Edita la fecha de nacimiento y comprueba el cuerpo del PUT.
   */
  it('profileUpdate_shouldNotSendDni_andSendIsoDate', async () => {
    loginAs('user')
    let putBody = null
    server.use(http.put(API + '/users/:id', async ({ request }) => {
      putBody = await request.json()
      return HttpResponse.json(putBody)
    }))
    const { page } = await openPage('/profile')
    await waitFor(() => expect(page.find('#pf-dni').element.value).toBe('****5678'))
    await button(page, 'Editar').trigger('click')
    await page.find('#pf-birth').setValue('1990-05-17')
    await button(page, 'Guardar Cambios').trigger('click')
    await waitFor(() => expect(putBody).not.toBeNull())
    expect(putBody).not.toHaveProperty('dni')
    expect(putBody.dateOfBirth).toBe('1990-05-17')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El administrador revisa la identidad con el DNI de la solicitud.
   * - ¿Qué hace?: GET /admin/professionals devuelve "dni" → se muestra en la tarjeta; sin DNI → "No registrado".
   */
  it('admin_shouldSeeDniInPendingRequest', async () => {
    loginAs('admin')
    server.use(http.get(API + '/admin/professionals', () => HttpResponse.json([
      { ...pendingProfessional, dni: '87654321' },
      { ...pendingProfessional, id: 201, name: 'Cuenta Antigua', dni: '' }
    ])))
    const { page } = await openPage('/admin/professionals')
    await waitFor(() => expect(page.find('[data-testid="dni-200"]').exists()).toBe(true))
    expect(page.find('[data-testid="dni-200"]').text()).toBe('87654321')
    expect(page.find('[data-testid="dni-201"]').text()).toBe('No registrado')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El DNI nunca debe aparecer en vistas públicas.
   * - ¿Qué hace?: Aunque la API pública devolviera "dni", el directorio no lo muestra.
   */
  it('publicDirectory_shouldNeverShowDni', async () => {
    loginAs('user')
    server.use(http.get(API + '/professionals', () => HttpResponse.json([{ id: 1, name: 'Dra. Elena Ramírez', specialty: 'clinical', verificationStatus: 'VERIFIED', dni: '87654321' }])))
    const { page } = await openPage('/therapists')
    await waitFor(() => expect(page.text()).toContain('Elena Ramírez'))
    expect(page.text()).not.toContain('87654321')
  })
})
