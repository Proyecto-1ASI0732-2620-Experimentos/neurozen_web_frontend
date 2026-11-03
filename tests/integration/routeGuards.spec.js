// Pruebas de integración: acceso a las pantallas según el rol (router + sesión)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { pendingProfessional } from '../mocks/data.js'
import { openPage, loginAs } from '../helpers.js'

describe('RouteGuards', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Un trabajador no debe entrar al portal del psicólogo ni al panel de administración.
   * - ¿Qué hace esta prueba?: Con sesión de trabajador abre /pro y /admin, y verifica que vuelva a su inicio.
   */
  it('worker_shouldNotAccessPsychologistOrAdminAreas', async () => {
    // Arrange
    loginAs('user')

    // Act
    const { router } = await openPage('/pro')
    const fromPro = router.currentRoute.value.name
    await router.push('/admin/professionals')

    // Assert
    expect(fromPro).toBe('Dashboard')
    expect(router.currentRoute.value.name).toBe('Dashboard')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Un psicólogo sin verificar no puede usar su panel ni las herramientas del paciente.
   * - ¿Qué hace esta prueba?: Con un psicólogo pendiente abre su panel y una pantalla del trabajador, y verifica
   *   que siempre termine en su estado de verificación.
   */
  it('pendingPsychologist_shouldOnlySeeVerificationStatus', async () => {
    // Arrange
    loginAs('psychologist', { verificationStatus: 'pending' })
    server.use(http.get(API + '/professionals/me', () => HttpResponse.json(pendingProfessional)))

    // Act
    const { router } = await openPage('/pro/schedule')
    const fromPanel = router.currentRoute.value.name
    await router.push('/stress/triggers')

    // Assert
    expect(fromPanel).toBe('ProStatus')
    expect(router.currentRoute.value.name).toBe('ProStatus')
  })
})
