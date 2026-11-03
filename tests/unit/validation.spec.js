// Pruebas unitarias: validaciones de registro y pago (src/utils/validation.js)
import { isCardNumber, isFutureExpiry, isStrongPassword, isLicenseNumber, normalizeLicenseNumber } from '../../src/utils/validation.js'

describe('Validation', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Una suscripción no debe enviarse con un número de tarjeta mal escrito.
   * - ¿Qué hace esta prueba?: Valida con Luhn una tarjeta correcta (se acepta) y la misma con un dígito cambiado (se rechaza).
   */
  it('cardNumberWithWrongDigit_shouldBeRejected', () => {
    // Act
    const valid = isCardNumber('4111 1111 1111 1111')
    const wrong = isCardNumber('4111 1111 1111 1112')

    // Assert
    expect(valid).toBe(true)
    expect(wrong).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Una tarjeta vencida no puede pagar; se debe avisar antes de enviar el pago.
   * - ¿Qué hace esta prueba?: Con fecha de octubre, rechaza septiembre y acepta octubre (caso límite).
   */
  it('cardExpiredLastMonth_shouldBeRejected', () => {
    // Arrange
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-15T12:00:00-05:00'))

    // Act + Assert
    expect(isFutureExpiry('09/26')).toBe(false)
    expect(isFutureExpiry('10/26')).toBe(true)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: La plataforma maneja datos de salud; la contraseña debe cumplir
   *   reglas de complejidad (mínimo 8 caracteres, con letras y números).
   * - ¿Qué hace esta prueba?: Verifica que una contraseña que cumple las reglas sea aceptada.
   */
  it('passwordWithLettersAndNumbers_shouldBeAccepted', () => {
    // Act + Assert
    expect(isStrongPassword('Segura2026')).toBe(true)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Contraseñas débiles ponen en riesgo la información del usuario.
   * - ¿Qué hace esta prueba?: Rechaza una contraseña corta, una solo con letras y una solo con números.
   */
  it('weakPasswords_shouldBeRejected', () => {
    // Act + Assert
    expect(isStrongPassword('Ab1')).toBe(false)
    expect(isStrongPassword('soloLetras')).toBe(false)
    expect(isStrongPassword('12345678')).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El número de colegiatura del CPsP se escribe de varias formas;
   *   el sistema debe aceptarlas y guardar solo el número para buscarlo en el portal del colegio.
   * - ¿Qué hace esta prueba?: Acepta "C.Ps.P. 45821", "CPsP 45821" y "45821", y normaliza a "45821".
   */
  it('licenseNumberInCommonFormats_shouldBeAcceptedAndNormalized', () => {
    // Act + Assert
    expect(isLicenseNumber('C.Ps.P. 45821')).toBe(true)
    expect(isLicenseNumber('CPsP 45821')).toBe(true)
    expect(isLicenseNumber('45821')).toBe(true)
    expect(normalizeLicenseNumber('C.Ps.P. 45821')).toBe('45821')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Un número de colegiatura inválido no puede verificarse y haría
   *   perder tiempo al administrador.
   * - ¿Qué hace esta prueba?: Rechaza textos sin números, números muy cortos y números con letras.
   */
  it('invalidLicenseNumber_shouldBeRejected', () => {
    // Act + Assert
    expect(isLicenseNumber('psicologo')).toBe(false)
    expect(isLicenseNumber('12')).toBe(false)
    expect(isLicenseNumber('45A21')).toBe(false)
  })
})
