// Verifica la exportación de datos personales del perfil (derecho de acceso, Ley N.° 29733):
// el archivo descargado no debe incluir el token de sesión del usuario.
import { describe, it, expect, vi, afterEach } from 'vitest'
import UserProfileComponent from '../../src/user-management/screens/UserProfileComponent.vue'

describe('UserProfileComponent - downloadData', () => {
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('exportedData_shouldNotIncludeSessionToken', () => {
    let exportedBlob
    let clickedLink
    vi.stubGlobal(
      'Blob',
      class {
        constructor(parts, options) {
          this.parts = parts
          this.type = options?.type
        }
      },
    )
    URL.createObjectURL = vi.fn((blob) => {
      exportedBlob = blob
      return 'blob:neurozen-test'
    })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      clickedLink = this
    })

    const context = {
      user: { id: 7, name: 'Ana Torres', email: 'ana@example.com', token: 'secret-session-token' },
      extra: { emergencyContacts: [{ name: 'Luis', phone: '999888777' }] },
    }

    UserProfileComponent.methods.downloadData.call(context)

    const exported = JSON.parse(exportedBlob.parts[0])
    expect(exportedBlob.type).toBe('application/json')
    expect(exported.profile.token).toBeUndefined()
    expect(exported.profile.email).toBe('ana@example.com')
    expect(exported.extra.emergencyContacts).toHaveLength(1)
    expect(exported.exportedAt).toBeTruthy()
    // El usuario en memoria conserva su token: solo se excluye del archivo exportado
    expect(context.user.token).toBe('secret-session-token')
    expect(clickedLink.download).toMatch(/^neurozen_mis_datos_.+\.json$/)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:neurozen-test')
  })
})
