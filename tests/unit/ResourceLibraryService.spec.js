// Pruebas unitarias: biblioteca de recursos (src/services/ResourceLibraryService.js)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { normalizeResource, ResourceLibraryService } from '../../src/services/ResourceLibraryService.js'

describe('ResourceLibraryService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: La API envía la duración en minutos y los datos de ejemplo en segundos;
   *   antes se mostraban duraciones absurdas como "900m".
   * - ¿Qué hace esta prueba?: Normaliza 15 (minutos) y 900 (segundos) y verifica que ambos duren 15 minutos.
   */
  it('durationInMinutesAndSeconds_shouldBeEqual', () => {
    // Act
    const fromApi = normalizeResource({ id: 1, resourceType: 'Video', duration: 15 })
    const fromMock = normalizeResource({ id: 2, category: 'audio', duration: 900 })

    // Assert
    expect(fromApi.durationMinutes).toBe(15)
    expect(fromMock.durationMinutes).toBe(15)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si el servidor falla, la biblioteca no debe quedar vacía.
   * - ¿Qué hace esta prueba?: Simula la API caída y verifica recursos de ejemplo marcados como demostración.
   */
  it('libraryWithoutServer_shouldShowSampleResources', async () => {
    // Arrange
    server.use(http.get(API + '/resource-libraries', () => HttpResponse.error()))
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Act
    const { items, isDemo } = await new ResourceLibraryService().getResources()

    // Assert
    expect(isDemo).toBe(true)
    expect(items.length).toBeGreaterThan(0)
  })
})
