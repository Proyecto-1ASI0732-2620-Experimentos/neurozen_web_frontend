// Pruebas unitarias: nivel de estrés del Dashboard (src/services/DashboardService.js)
import { DashboardService } from '../../src/services/DashboardService.js'
import { setSession } from '../../src/services/session.js'
import { user } from '../mocks/data.js'

describe('DashboardService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El nivel de estrés es el dato principal del Dashboard; antes era aleatorio.
   * - ¿Qué hace esta prueba?: Con registros de nivel 8 y 4 (mocks), verifica que se consulten una vez y que el
   *   nivel actual sea 80 y el promedio 60.
   */
  it('userWithoutStressData_shouldCalculateFromTriggers', async () => {
    // Arrange
    setSession({ token: 'token', user })
    const service = new DashboardService()
    service.httpClient.get = vi.fn().mockResolvedValue({ id: 7 })
    service.triggerService.getStressTriggers = vi.fn().mockResolvedValue([
      { stressLevel: 8, triggeredAt: new Date(2026, 9, 8) },
      { stressLevel: 4, triggeredAt: new Date(2026, 9, 7) }
    ])

    // Act
    const data = await service.getStressData('week')

    // Assert
    expect(service.triggerService.getStressTriggers).toHaveBeenCalledTimes(1)
    expect(data.currentLevel).toBe(80)
    expect(data.average).toBe(60)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si el backend ya trae los datos de estrés, no hay que hacer consultas extra.
   * - ¿Qué hace esta prueba?: Verifica que use esos datos y no consulte los registros (como verifyNoInteractions).
   */
  it('userWithStressData_shouldNotRequestTriggers', async () => {
    // Arrange
    setSession({ token: 'token', user })
    const service = new DashboardService()
    service.httpClient.get = vi.fn().mockResolvedValue({ stressData: { currentLevel: 40, weeklyData: [] } })
    service.triggerService.getStressTriggers = vi.fn()

    // Act
    const data = await service.getStressData('week')

    // Assert
    expect(data.currentLevel).toBe(40)
    expect(service.triggerService.getStressTriggers).not.toHaveBeenCalled()
  })
})
