// Pruebas unitarias: verificación de psicólogos por el administrador (src/services/AdminService.js)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { AdminService } from '../../src/services/AdminService.js'

describe('AdminService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Aprobar a un psicólogo le permite recibir citas; debe aplicarse al correcto.
   * - ¿Qué hace esta prueba?: Aprueba al psicólogo 200 y verifica que la API reciba la verificación de ese id.
   */
  it('approve_shouldVerifyTheSelectedPsychologist', async () => {
    // Arrange
    let verifiedId = null
    server.use(http.patch(API + '/admin/professionals/:id/verify', ({ params }) => {
      verifiedId = params.id
      return HttpResponse.json({})
    }))

    // Act
    await new AdminService().verifyProfessional(200)

    // Assert
    expect(verifiedId).toBe('200')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El psicólogo rechazado necesita saber el motivo para corregir sus datos.
   * - ¿Qué hace esta prueba?: Rechaza con un motivo y verifica que llegue a la API sin espacios sobrantes.
   */
  it('reject_shouldSendTheReason', async () => {
    // Arrange
    let body = null
    server.use(http.patch(API + '/admin/professionals/:id/reject', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({})
    }))

    // Act
    await new AdminService().rejectProfessional(200, '  No figura como HABILITADO  ')

    // Assert
    expect(body).toEqual({ reason: 'No figura como HABILITADO' })
  })
})
