// Pruebas unitarias: suscripciones (src/services/SubscriptionService.js)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { SubscriptionService } from '../../src/services/SubscriptionService.js'

describe('SubscriptionService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El backend identifica el plan por número y necesita la tarjeta sin espacios.
   * - ¿Qué hace esta prueba?: Suscribe al plan "advanced" y verifica planId 2, la tarjeta limpia y la cuenta inactiva
   *   hasta que el backend confirme el pago.
   */
  it('subscription_shouldSendPlanIdAndCleanCardNumber', async () => {
    // Arrange
    let body = null
    server.use(http.post(API + '/subscriptions', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ id: 1 })
    }))

    // Act
    await new SubscriptionService().subscribe({
      userId: '7', planKey: 'advanced', firstName: ' Ana ', lastName: 'Torres', email: 'ana@neurozen.com',
      cardNumber: '4111 1111 1111 1111', expiry: '10/27', cvv: '123'
    })

    // Assert
    expect(body).toMatchObject({ userId: 7, planId: 2, nameUser: 'Ana', numberCard: '4111111111111111', isActive: false })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El perfil no debe mostrar ni conservar el número completo ni el CVV de la tarjeta.
   * - ¿Qué hace esta prueba?: La API devuelve la tarjeta completa y verifica que solo queden los últimos 4 dígitos.
   */
  it('subscriptionData_shouldOnlyKeepLastFourDigits', async () => {
    // Arrange
    server.use(http.get(API + '/subscriptions/user/:id', () =>
      HttpResponse.json({ planId: 2, isActive: true, nameUser: 'Ana', lastNameUser: 'Torres', numberCard: '4111111111111111', cvv: '123' })
    ))

    // Act
    const subscription = await new SubscriptionService().getByUser(7)

    // Assert
    expect(subscription.cardLast4).toBe('1111')
    expect(subscription.planKey).toBe('advanced')
    expect(JSON.stringify(subscription)).not.toContain('4111111111111111')
    expect(subscription).not.toHaveProperty('cvv')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Un usuario sin suscripción no es un error: debe ver la opción de elegir un plan.
   * - ¿Qué hace esta prueba?: La API responde 404 y verifica que el resultado sea "sin suscripción" (null).
   */
  it('userWithoutSubscription_shouldReturnNull', async () => {
    // Act
    const subscription = await new SubscriptionService().getByUser(7)

    // Assert
    expect(subscription).toBeNull()
  })
})
