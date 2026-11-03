// Pruebas unitarias: modo demostración (src/services/StaticAPIAdapter.js), el que usa la web publicada
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server.js'
import { StaticAPIAdapter } from '../../src/services/StaticAPIAdapter.js'
import { setSession } from '../../src/services/session.js'

// Base de datos de demostración mínima (equivale a public/data/db.json)
const demoDb = {
  users: [
    { id: '1', email: 'admin@neurozen.com', password: 'Admin2026', role: 'admin', name: 'Admin' },
    { id: '2', email: 'ana@neurozen.com', password: 'Secreta123', role: 'user', name: 'Ana' }
  ],
  professionals: [
    { id: 1, name: 'Dra. Elena Ramírez' },
    { id: 2, userId: '9', name: 'Pedro Gómez', verificationStatus: 'PENDING' }
  ]
}

describe('StaticAPIAdapter', () => {
  beforeEach(() => {
    server.use(http.get('*/data/db.json', () => HttpResponse.json(structuredClone(demoDb))))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: En la web publicada (sin backend) el login debe funcionar con las cuentas
   *   de demostración y nunca devolver la contraseña.
   * - ¿Qué hace esta prueba?: Inicia sesión con una cuenta válida (token, sin contraseña) y con una clave incorrecta (401).
   */
  it('demoLogin_shouldReturnTokenWithoutPassword', async () => {
    // Arrange
    const adapter = new StaticAPIAdapter()

    // Act
    const response = await adapter.request('POST', '/api/v1/authentication/sign-in', { username: 'ana@neurozen.com', password: 'Secreta123' })

    // Assert
    expect(response.token).toBeTruthy()
    expect(response).not.toHaveProperty('password')
    await expect(adapter.request('POST', '/api/v1/authentication/sign-in', { username: 'ana@neurozen.com', password: 'mala' }))
      .rejects.toMatchObject({ status: 401 })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: También en el modo demostración, solo los psicólogos verificados son públicos.
   * - ¿Qué hace esta prueba?: Pide el directorio y verifica que el psicólogo pendiente no aparezca.
   */
  it('demoDirectory_shouldHidePendingPsychologists', async () => {
    // Act
    const list = await new StaticAPIAdapter().request('GET', '/api/v1/professionals')

    // Assert
    expect(list.map((p) => p.name)).toEqual(['Dra. Elena Ramírez'])
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El panel de verificación solo debe estar disponible para administradores.
   * - ¿Qué hace esta prueba?: Un trabajador recibe 403 y el administrador ve la solicitud pendiente.
   */
  it('adminEndpoints_shouldRequireAdminRole', async () => {
    // Arrange
    const adapter = new StaticAPIAdapter()

    // Act + Assert: trabajador
    setSession({ token: 'token', user: { id: '2', role: 'user' } })
    await expect(adapter.request('GET', '/api/v1/admin/professionals?status=PENDING')).rejects.toMatchObject({ status: 403 })

    // Act + Assert: administrador
    setSession({ token: 'token', user: { id: '1', role: 'admin' } })
    const pending = await adapter.request('GET', '/api/v1/admin/professionals?status=PENDING')
    expect(pending.map((p) => p.name)).toEqual(['Pedro Gómez'])
  })
})
