// Pruebas de integración (app real + API simulada MSW): nuevas solicitudes de psicólogos sin recargar la página
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { pendingProfessional } from '../mocks/data.js'
import { openPage, loginAs, waitFor, button } from '../helpers.js'

const newcomer = { ...pendingProfessional, id: 301, userId: 31, name: 'Lucía Vargas Ríos', email: 'lucia@psico.pe', licenseNumber: '77777', dni: '11223344' }

describe('AdminProfessionals refresh', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El administrador debe ver a los psicólogos recién registrados sin recargar la
   *   ventana del navegador.
   * - ¿Qué hace esta prueba?: Abre el panel, registra a una nueva psicóloga en la API simulada y pulsa
   *   «Comprobar nuevas solicitudes»; verifica que aparezca con la marca «Nueva» y el aviso. Luego, sin novedades,
   *   verifica que la lista se mantenga y que se conserven las casillas ya marcadas.
   */
  it('refreshButton_shouldShowNewRequestsWithoutReload', async () => {
    let list = [pendingProfessional]
    server.use(http.get(API + '/admin/professionals', () => HttpResponse.json(list)))
    loginAs('admin')
    const { page } = await openPage('/admin/professionals')
    await waitFor(() => expect(page.text()).toContain('Pedro Gómez Ruiz'))
    expect(page.find('[data-testid="admin-last-update"]').text()).toContain('Actualizado a las')
    await page.findAll('main input[type="checkbox"]')[0].setValue(true)

    list = [pendingProfessional, newcomer]
    await page.find('[data-testid="admin-refresh"]').trigger('click')

    await waitFor(() => expect(page.text()).toContain('Lucía Vargas Ríos'))
    expect(page.find('[data-testid="new-301"]').exists()).toBe(true)
    expect(page.find('[data-testid="new-200"]').exists()).toBe(false)
    expect(page.text()).toContain('1 nueva solicitud de psicólogo')
    expect(page.findAll('main input[type="checkbox"]')[0].element.checked).toBe(true)

    await page.find('[data-testid="admin-refresh"]').trigger('click')
    await waitFor(() => expect(page.text()).toContain('No hay solicitudes nuevas'))
    expect(page.find('[data-testid="new-301"]').exists()).toBe(true)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Además del botón, el panel debe revisar solo cada cierto tiempo.
   * - ¿Qué hace esta prueba?: Avanza 60 s el reloj del intervalo y verifica que la nueva solicitud aparezca sola;
   *   desde la pestaña «Verificados» ofrece «Ver pendientes».
   */
  it('autoRefresh_shouldBringNewRequestsEvery60Seconds', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    let list = [pendingProfessional]
    server.use(http.get(API + '/admin/professionals', () => HttpResponse.json(list)))
    loginAs('admin')
    const { page } = await openPage('/admin/professionals')
    await waitFor(() => expect(page.text()).toContain('Pedro Gómez Ruiz'))
    await page.findAll('[role="radio"]').find((b) => b.text().includes('Verificados')).trigger('click')

    list = [pendingProfessional, newcomer]
    vi.advanceTimersByTime(60_000)

    await waitFor(() => expect(button(page, 'Ver pendientes')).toBeTruthy())
    expect(page.text()).toContain('1 nueva solicitud de psicólogo')
    await button(page, 'Ver pendientes').trigger('click')
    await waitFor(() => expect(page.text()).toContain('Lucía Vargas Ríos'))
  })
})
