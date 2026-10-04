// Pruebas unitarias: validación de la tarjeta al suscribirse (src/utils/validation.js)
import { isCardNumber, isFutureExpiry } from '../../src/utils/validation.js'

describe('CardValidation', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Porque una suscripción no debe enviarse con un número de
   *   tarjeta mal escrito; el pago fallaría y el usuario no sabría por qué.
   * - ¿Qué hace esta prueba?: Valida con el algoritmo de Luhn un número correcto y el mismo número
   *   con un dígito cambiado, y verifica que el primero se acepta y el segundo se rechaza.
   */
  it('cardNumberWithWrongDigit_shouldBeRejected', () => {
    // Arrange: número válido de prueba y el mismo con el último dígito cambiado
    const validCard = '4111 1111 1111 1111'
    const wrongCard = '4111 1111 1111 1112'

    // Act
    const validResult = isCardNumber(validCard)
    const wrongResult = isCardNumber(wrongCard)

    // Assert: el válido se acepta y el mal escrito se rechaza
    expect(validResult).toBe(true)
    expect(wrongResult).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Porque una tarjeta vencida no puede pagar la suscripción;
   *   es mejor avisarlo en el formulario antes de enviar el pago.
   * - ¿Qué hace esta prueba?: Fija la fecha actual en octubre de 2026 y verifica que una tarjeta
   *   que vence en septiembre se rechaza y una que vence en octubre todavía se acepta.
   */
  it('cardExpiredLastMonth_shouldBeRejected', () => {
    // Arrange: hoy es 15 de octubre de 2026
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-15T12:00:00-05:00'))

    // Act
    const september = isFutureExpiry('09/26')
    const october = isFutureExpiry('10/26')

    // Assert: septiembre ya venció, octubre todavía es válido
    expect(september).toBe(false)
    expect(october).toBe(true)
  })
})
