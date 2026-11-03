// Pruebas de integración: compra de una suscripción (pantalla + SubscriptionService + validaciones)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { openPage, loginAs, waitFor } from '../helpers.js'

// Completa el formulario de pago
async function fillForm(page, { card, expiry, cvv }) {
  await page.find('#p-first').setValue('Ana')
  await page.find('#p-last').setValue('Torres')
  await page.find('#p-email').setValue('ana@neurozen.com')
  await page.find('#p-card').setValue(card)
  await page.find('#p-exp').setValue(expiry)
  await page.find('#p-cvv').setValue(cvv)
}

describe('Purchase', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Un pago con una tarjeta inválida o vencida fallaría; debe detenerse en el formulario.
   * - ¿Qué hace esta prueba?: Envía una tarjeta mal escrita, vencida y con CVV corto, y verifica los 3 errores y que no
   *   se llame a la API.
   */
  it('invalidCard_shouldShowErrorsAndNotBeSent', async () => {
    // Arrange
    loginAs()
    let requests = 0
    server.use(http.post(API + '/subscriptions', () => {
      requests++
      return HttpResponse.json({})
    }))
    const { page } = await openPage('/subscriptions/purchase?plan=advanced')

    // Act
    await fillForm(page, { card: '4111 1111 1111 1112', expiry: '01/20', cvv: '12' })
    await page.find('main form').trigger('submit')

    // Assert
    expect(page.text()).toContain('Número de tarjeta no válido.')
    expect(page.text()).toContain('Fecha de vencimiento no válida o caducada (MM/AA).')
    expect(page.text()).toContain('El CVV debe tener 3 o 4 dígitos.')
    expect(requests).toBe(0)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Con datos válidos, la suscripción debe enviarse al plan elegido y llevar
   *   al usuario a su perfil.
   * - ¿Qué hace esta prueba?: Compra el plan avanzado y verifica planId 2, la tarjeta sin espacios y la redirección.
   */
  it('validCard_shouldSubscribeToTheSelectedPlan', async () => {
    // Arrange
    loginAs()
    let body = null
    server.use(http.post(API + '/subscriptions', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ id: 1 })
    }))
    const { page, router } = await openPage('/subscriptions/purchase?plan=advanced')

    // Act
    await fillForm(page, { card: '4111 1111 1111 1111', expiry: '12/30', cvv: '123' })
    await page.find('main form').trigger('submit')

    // Assert
    await waitFor(() => expect(body).toMatchObject({ planId: 2, numberCard: '4111111111111111' }))
    await waitFor(() => expect(router.currentRoute.value.name).toBe('UserProfile'))
  })
})
