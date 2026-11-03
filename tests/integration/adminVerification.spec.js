// Pruebas de integración: verificación manual de psicólogos por el administrador
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { openPage, loginAs, waitFor, button, dialog, dialogButton } from '../helpers.js'

describe('AdminVerification', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El administrador solo debe aprobar después de comprobar en el portal del CPsP
   *   que el nombre coincide y que el psicólogo está HABILITADO.
   * - ¿Qué hace esta prueba?: Verifica que "Aprobar" esté bloqueado hasta marcar ambas comprobaciones y que luego
   *   la API reciba la verificación del psicólogo 200.
   */
  it('approve_shouldRequireBothChecksBeforeVerifying', async () => {
    // Arrange
    loginAs('admin')
    let verifiedId = null
    server.use(http.patch(API + '/admin/professionals/:id/verify', ({ params }) => {
      verifiedId = params.id
      return HttpResponse.json({})
    }))
    const { page } = await openPage('/admin/professionals')
    await waitFor(() => expect(page.text()).toContain('Pedro Gómez Ruiz'))
    const approveBefore = button(page, 'Aprobar').element.disabled

    // Act
    for (const checkbox of page.findAll('main input[type="checkbox"]')) await checkbox.setValue(true)
    await button(page, 'Aprobar').trigger('click')
    await dialogButton('Aprobar').trigger('click')

    // Assert
    expect(approveBefore).toBe(true)
    await waitFor(() => expect(verifiedId).toBe('200'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Un rechazo sin motivo deja al psicólogo sin saber qué corregir.
   * - ¿Qué hace esta prueba?: Intenta rechazar sin motivo (no se envía nada) y luego con motivo (se envía).
   */
  it('reject_shouldRequireAReason', async () => {
    // Arrange
    loginAs('admin')
    let body = null
    server.use(http.patch(API + '/admin/professionals/:id/reject', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({})
    }))
    const { page } = await openPage('/admin/professionals')
    await waitFor(() => expect(page.text()).toContain('Pedro Gómez Ruiz'))

    // Act: sin motivo
    await button(page, 'Rechazar').trigger('click')
    await dialogButton('Rechazar').trigger('click')
    const errorShown = dialog().text().includes('Escribe al menos 10 caracteres.')

    // Act: con motivo
    await dialog().find('textarea').setValue('No figura como HABILITADO en el CPsP')
    await dialogButton('Rechazar').trigger('click')

    // Assert
    expect(errorShown).toBe(true)
    await waitFor(() => expect(body).toEqual({ reason: 'No figura como HABILITADO en el CPsP' }))
  })
})
