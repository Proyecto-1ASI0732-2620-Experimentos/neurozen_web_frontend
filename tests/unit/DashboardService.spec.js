// Pruebas unitarias: nivel de estrés del Dashboard (src/services/DashboardService.js)
import { DashboardService } from '../../src/services/DashboardService.js'
import { setSession } from '../../src/services/session.js'
import { user } from '../mocks/data.js'

describe('DashboardService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Porque el nivel de estrés es el dato principal que ve el
   *   usuario al entrar a la plataforma. Antes el Dashboard mostraba números aleatorios; ahora debe
   *   calcularse con las situaciones de estrés que el propio usuario registró.
   * - ¿Qué hace esta prueba?: Simula (mock) un usuario sin datos de estrés y con dos registros
   *   (niveles 8 y 4), y verifica que el servicio consulta esos registros una sola vez y calcula
   *   el nivel actual (80) y el promedio (60).
   */
  it('userWithoutStressData_shouldCalculateFromTriggers', async () => {
    // Arrange: usuario sin datos de estrés y con dos registros (mocks de la API)
    setSession({ token: 'token', user })
    const service = new DashboardService()
    service.httpClient.get = vi.fn().mockResolvedValue({ id: 7 })
    service.triggerService.getStressTriggers = vi.fn().mockResolvedValue([
      { stressLevel: 8, triggeredAt: new Date(2026, 9, 8) },
      { stressLevel: 4, triggeredAt: new Date(2026, 9, 7) }
    ])

    // Act
    const data = await service.getStressData('week')

    // Assert: se consultaron los registros una vez (como verify times(1))
    expect(service.triggerService.getStressTriggers).toHaveBeenCalledTimes(1)
    // Assert: nivel actual = último registro (8 → 80) y promedio de 80 y 40 = 60
    expect(data.currentLevel).toBe(80)
    expect(data.average).toBe(60)
  })
})
