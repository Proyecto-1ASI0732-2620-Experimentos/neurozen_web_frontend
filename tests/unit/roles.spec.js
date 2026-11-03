// Pruebas unitarias: roles y página de inicio de cada cuenta (src/services/roles.js)
import { normalizeRole, homeRouteFor, PRO_WELCOME_KEY } from '../../src/services/roles.js'
import { setSession, writeUserData } from '../../src/services/session.js'

describe('Roles', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El backend puede enviar el rol con distintos nombres; un rol mal leído
   *   daría acceso a pantallas equivocadas.
   * - ¿Qué hace esta prueba?: Verifica que "PSYCHOLOGIST", "ROLE_ADMIN" y un rol desconocido se interpreten bien.
   */
  it('backendRoleNames_shouldBeNormalized', () => {
    // Act + Assert
    expect(normalizeRole('PSYCHOLOGIST')).toBe('psychologist')
    expect(normalizeRole('ROLE_ADMIN')).toBe('admin')
    expect(normalizeRole('otro')).toBe('user')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Un psicólogo sin verificar no puede usar el portal ni recibir citas.
   * - ¿Qué hace esta prueba?: Verifica que su inicio sea la pantalla de estado de verificación.
   */
  it('pendingPsychologist_shouldStartOnVerificationStatus', () => {
    // Arrange
    const pending = { id: 30, role: 'psychologist', verificationStatus: 'pending' }

    // Act
    const route = homeRouteFor(pending)

    // Assert
    expect(route).toEqual({ name: 'ProStatus' })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Tras ser verificado, el psicólogo ve la bienvenida una sola vez y luego su panel.
   * - ¿Qué hace esta prueba?: Verifica bienvenida la primera vez y panel cuando ya la vio.
   */
  it('verifiedPsychologist_shouldSeeWelcomeOnlyOnce', () => {
    // Arrange
    const verified = { id: 21, role: 'psychologist', verificationStatus: 'verified' }
    setSession({ token: 'token', user: verified })

    // Act
    const first = homeRouteFor(verified)
    writeUserData(PRO_WELCOME_KEY, true)
    const second = homeRouteFor(verified)

    // Assert
    expect(first).toEqual({ name: 'ProWelcome' })
    expect(second).toEqual({ name: 'ProDashboard' })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Cada cuenta debe empezar en su propia área de la plataforma.
   * - ¿Qué hace esta prueba?: Verifica el inicio del administrador y del trabajador.
   */
  it('adminAndWorker_shouldStartOnTheirOwnHome', () => {
    // Act + Assert
    expect(homeRouteFor({ id: 1, role: 'admin' })).toEqual({ name: 'AdminProfessionals' })
    expect(homeRouteFor({ id: 7, role: 'user' })).toEqual({ name: 'Dashboard' })
  })
})
