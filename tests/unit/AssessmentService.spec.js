// Pruebas unitarias: test de autoevaluación de estrés (src/services/AssessmentService.js)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { scoreAnswers, levelFor, AssessmentService } from '../../src/services/AssessmentService.js'
import { setSession } from '../../src/services/session.js'
import { user } from '../mocks/data.js'

describe('AssessmentService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Las preguntas 4, 5, 7 y 8 son positivas y se puntúan al revés;
   *   si no, el resultado del test sería incorrecto.
   * - ¿Qué hace esta prueba?: Responde "Con frecuencia" (3) a todo y verifica el puntaje 22 (6×3 + 4×1).
   */
  it('positiveQuestions_shouldBeScoredInReverse', () => {
    // Arrange
    const answers = Array(10).fill(3)

    // Act
    const score = scoreAnswers(answers)

    // Assert
    expect(score).toBe(22)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El nivel define las recomendaciones; con nivel alto se sugiere un especialista.
   * - ¿Qué hace esta prueba?: Verifica los valores límite de cada nivel (13, 14, 26 y 27).
   */
  it('scoreBoundaries_shouldMapToTheCorrectLevel', () => {
    // Act + Assert
    expect(levelFor(13)).toBe('low')
    expect(levelFor(14)).toBe('moderate')
    expect(levelFor(26)).toBe('moderate')
    expect(levelFor(27)).toBe('high')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Un test incompleto daría un resultado falso.
   * - ¿Qué hace esta prueba?: Envía 9 respuestas en lugar de 10 y verifica que se lance un error.
   */
  it('incompleteAnswers_shouldThrowError', () => {
    // Arrange
    const answers = Array(9).fill(2)

    // Act + Assert
    expect(() => scoreAnswers(answers)).toThrow('Respuestas incompletas')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si el servidor falla, el usuario no debe perder el test que acaba de responder.
   * - ¿Qué hace esta prueba?: Simula la API caída y verifica que el resultado se guarde en el dispositivo.
   */
  it('submitWithoutServer_shouldKeepTheResultLocally', async () => {
    // Arrange
    setSession({ token: 'token', user })
    server.use(http.post(API + '/assessments', () => HttpResponse.error()))
    server.use(http.get(API + '/assessments', () => HttpResponse.error()))
    const service = new AssessmentService()
    const highStressAnswers = [4, 4, 4, 0, 0, 4, 0, 0, 4, 4] // 40 puntos: estrés alto

    // Act
    const { result, savedRemotely } = await service.submit(highStressAnswers)
    const latest = await service.getLatest()

    // Assert
    expect(savedRemotely).toBe(false)
    expect(result.score).toBe(40)
    expect(result.level).toBe('high')
    expect(latest.score).toBe(result.score)
  })
})
