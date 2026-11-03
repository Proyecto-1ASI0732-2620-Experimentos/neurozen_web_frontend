/**
 * AssessmentService - Test de autoevaluación de estrés (US04).
 *
 * Cuestionario de 10 preguntas sobre el último mes, con 5 opciones (0 a 4), basado en
 * la estructura de la Escala de Estrés Percibido (PSS-10, Cohen). Las preguntas 4, 5, 7 y 8
 * son positivas y se puntúan a la inversa. Puntaje total 0-40:
 *   0-13 bajo · 14-26 moderado · 27-40 alto
 * Es una orientación, NO un diagnóstico clínico.
 *
 * Endpoints (backend):
 *   POST /api/v1/assessments            { userId, answers[], score, level }
 *   GET  /api/v1/assessments?userId={id}
 * Si la API no responde, el resultado se conserva en este dispositivo.
 */
import { HttpClient } from './HttpClient.js'
import { readUserData, writeUserData, getUserId } from './session.js'

export const QUESTION_COUNT = 10
export const REVERSED = [3, 4, 6, 7] // índices (0-based) de las preguntas 4, 5, 7 y 8
export const OPTIONS = [0, 1, 2, 3, 4]
const LOCAL_KEY = 'neurozen_assessments'

/** Puntaje total aplicando la puntuación inversa a las preguntas positivas */
export function scoreAnswers(answers) {
  if (!Array.isArray(answers) || answers.length !== QUESTION_COUNT || answers.some((a) => !OPTIONS.includes(a))) {
    throw new Error('Respuestas incompletas')
  }
  return answers.reduce((sum, value, i) => sum + (REVERSED.includes(i) ? 4 - value : value), 0)
}

export function levelFor(score) {
  if (score <= 13) return 'low'
  if (score <= 26) return 'moderate'
  return 'high'
}

export class AssessmentService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  /** Guarda el resultado; devuelve { result, savedRemotely } */
  async submit(answers) {
    const score = scoreAnswers(answers)
    const result = { userId: getUserId(), answers, score, level: levelFor(score), completedAt: new Date().toISOString() }
    const history = readUserData(LOCAL_KEY, [])
    writeUserData(LOCAL_KEY, [result, ...history].slice(0, 20))
    try {
      await this.httpClient.post('/api/v1/assessments', result)
      return { result, savedRemotely: true }
    } catch {
      return { result, savedRemotely: false }
    }
  }

  /** Último resultado: primero la API y, si falla, el guardado local */
  async getLatest() {
    try {
      const list = HttpClient.extractList(await this.httpClient.get(`/api/v1/assessments?userId=${encodeURIComponent(getUserId())}`))
      if (list.length) {
        return [...list].sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))[0]
      }
    } catch {
      /* se usa el guardado local */
    }
    return readUserData(LOCAL_KEY, [])[0] || null
  }
}
