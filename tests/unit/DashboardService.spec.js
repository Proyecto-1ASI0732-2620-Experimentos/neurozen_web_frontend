// Pruebas unitarias: estadísticas del Panel de Inicio (src/services/DashboardService.js)
// Actualizadas para A1: sin registros ya no se generan datos de ejemplo; la escala de los desencadenantes es 1-10 (M7).
import { DashboardService } from '../../src/services/DashboardService.js'
import { setSession } from '../../src/services/session.js'
import { user } from '../mocks/data.js'

const daysAgo = (n, hour = 10) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d
}

describe('DashboardService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El nivel de estrés es el dato principal del Panel y debe salir de los registros
   *   reales del usuario, en su escala original (1-10).
   * - ¿Qué hace esta prueba?: Con registros de nivel 8 (ayer) y 4 (hace 2 días), verifica que se consulten una vez,
   *   que el último registro sea 8/10 y el promedio de la semana 6/10.
   */
  it('userWithoutStressData_shouldCalculateFromTriggers', async () => {
    // Arrange
    setSession({ token: 'token', user })
    const service = new DashboardService()
    service.httpClient.get = vi.fn().mockResolvedValue({ id: 7 })
    service.triggerService.getStressTriggers = vi.fn().mockResolvedValue([
      { stressLevel: 8, triggeredAt: daysAgo(1) },
      { stressLevel: 4, triggeredAt: daysAgo(2) }
    ])

    // Act
    const data = await service.getStressData('week')

    // Assert
    expect(service.triggerService.getStressTriggers).toHaveBeenCalledTimes(1)
    expect(data.source).toBe('triggers')
    expect(data.scaleMax).toBe(10)
    expect(data.currentLevel).toBe(8)
    expect(data.average).toBe(6)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si el backend ya trae los datos de estrés, no hay que hacer consultas extra.
   * - ¿Qué hace esta prueba?: Verifica que use esos datos (escala 0-100) y no consulte los registros.
   */
  it('userWithStressData_shouldNotRequestTriggers', async () => {
    // Arrange
    setSession({ token: 'token', user })
    const service = new DashboardService()
    service.httpClient.get = vi.fn().mockResolvedValue({ stressData: { currentLevel: 40, weeklyData: [{ day: 'monday', value: 40 }] } })
    service.triggerService.getStressTriggers = vi.fn()

    // Act
    const data = await service.getStressData('week')

    // Assert
    expect(data.currentLevel).toBe(40)
    expect(data.scaleMax).toBe(100)
    expect(service.triggerService.getStressTriggers).not.toHaveBeenCalled()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Observación A1 de las entrevistas: un usuario nuevo veía estadísticas de ejemplo
   *   que parecían propias.
   * - ¿Qué hace esta prueba?: Sin stressData ni desencadenantes, verifica que la fuente sea 'empty' y que no haya cifras.
   */
  it('newUserWithoutRecords_shouldReturnEmptyAndNoSampleData', async () => {
    // Arrange
    setSession({ token: 'token', user })
    const service = new DashboardService()
    service.httpClient.get = vi.fn().mockResolvedValue({ id: 7 })
    service.triggerService.getStressTriggers = vi.fn().mockResolvedValue([])

    // Act
    const data = await service.getStressData('week')

    // Assert
    expect(data).toEqual({ source: 'empty' })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: «Error al cargar» y «aún no hay datos» deben distinguirse (antes un error
   *   mostraba datos de ejemplo).
   * - ¿Qué hace esta prueba?: Simula un fallo al pedir los desencadenantes y verifica que el error llegue a la interfaz.
   */
  it('triggersRequestFails_shouldPropagateError', async () => {
    // Arrange
    setSession({ token: 'token', user })
    const service = new DashboardService()
    service.httpClient.get = vi.fn().mockResolvedValue({ id: 7 })
    service.triggerService.getStressTriggers = vi.fn().mockRejectedValue(new Error('Sin conexión'))

    // Act / Assert
    await expect(service.getStressData('week')).rejects.toThrow('Sin conexión')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Con una sola semana de registros no se puede calcular una tendencia; antes se
   *   mostraba «0 %» como si fuera un dato real, y los días sin registros aparecían como nivel 0.
   * - ¿Qué hace esta prueba?: Verifica que la variación semanal sea null y que los días sin registros queden en null.
   */
  it('singleWeekOfRecords_shouldNotInventTrendOrZeroDays', () => {
    // Arrange
    const service = new DashboardService()
    const now = new Date(2026, 10, 26, 18) // jueves
    const triggers = [{ stressLevel: 6, triggeredAt: new Date(2026, 10, 25, 9) }] // miércoles

    // Act
    const data = service._fromTriggers(triggers, 'week', now)

    // Assert
    expect(data.weeklyChange).toBeNull()
    expect(data.weeklyData.find((d) => d.day === 'wednesday').value).toBe(6)
    expect(data.weeklyData.find((d) => d.day === 'monday').value).toBeNull()
  })
})
