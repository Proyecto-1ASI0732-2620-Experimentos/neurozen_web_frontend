// Pruebas unitarias: respuestas de ZenBot (src/zenbot/zenbotEngine.js)
import { respond } from '../../src/zenbot/zenbotEngine.js'

describe('ZenBotEngine', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Es la regla de seguridad más importante del asistente: ante ideas de
   *   suicidio debe mostrar ayuda inmediata, aunque el mensaje mencione otros temas.
   * - ¿Qué hace esta prueba?: Envía un mensaje con "trabajo" y "no quiero vivir" y verifica que se detecte crisis.
   */
  it('crisisMessage_shouldHavePriorityOverOtherTopics', () => {
    // Act
    const reply = respond('por el trabajo ya no quiero vivir')

    // Assert
    expect(reply.crisis).toBe(true)
    expect(reply.intent).toBe('crisis')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El usuario escribe con tildes y mayúsculas; ZenBot debe entenderlo igual.
   * - ¿Qué hace esta prueba?: Envía "ESTRÉS" y verifica que responda sobre estrés con un enlace a respiración.
   */
  it('stressMessageWithAccents_shouldSuggestBreathing', () => {
    // Act
    const reply = respond('Tengo mucho ESTRÉS')

    // Assert
    expect(reply.intent).toBe('anxiety')
    expect(reply.links.map((l) => l.to)).toContain('/stress/breathing')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Las palabras cortas generaban falsas coincidencias ("hi" detectaba "hice").
   * - ¿Qué hace esta prueba?: Verifica que "hice ejercicio" no se tome como saludo.
   */
  it('shortKeyword_shouldNotMatchInsideOtherWords', () => {
    // Act
    const reply = respond('hice ejercicio hoy')

    // Assert
    expect(reply.intent).not.toBe('greeting')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Cuando ZenBot no entiende, debe orientar al usuario y no dejarlo sin respuesta.
   * - ¿Qué hace esta prueba?: Envía un texto sin sentido y verifica la respuesta de "no entendí" con un especialista.
   */
  it('unknownMessage_shouldReturnFallbackWithSpecialist', () => {
    // Act
    const reply = respond('asdfgh')

    // Assert
    expect(reply.textKey).toBe('zenbot.answers.fallback')
    expect(reply.links.map((l) => l.to)).toContain('/book-session')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si el usuario insiste y ZenBot sigue sin entender, el caso necesita a una persona.
   * - ¿Qué hace esta prueba?: Simula un segundo mensaje no entendido y verifica que recomiende un especialista.
   */
  it('secondUnknownMessage_shouldRecommendSpecialist', () => {
    // Act
    const reply = respond('qwerty', 1)

    // Assert
    expect(reply.textKey).toBe('zenbot.answers.fallbackSpecialist')
  })
})
