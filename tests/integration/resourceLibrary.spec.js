// Prueba de integración: biblioteca de recursos → detalle
import { openPage, loginAs, waitFor } from '../helpers.js'

describe('ResourceLibraryPage', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Antes, al hacer clic en un recurso, se volvía al inicio y la biblioteca era inutilizable.
   * - ¿Qué hace esta prueba?: Hace clic en el recurso y verifica que se abra su detalle con el reproductor de video.
   */
  it('clickOnResource_shouldOpenItsDetail', async () => {
    // Arrange
    loginAs()
    const { page, router } = await openPage('/stress/resources')
    await waitFor(() => expect(page.text()).toContain('Respiración para la oficina'))

    // Act
    await page.find('main ul li a').trigger('click')

    // Assert
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/stress/resources/101'))
    await waitFor(() => expect(page.find('iframe').exists()).toBe(true))
  })
})
