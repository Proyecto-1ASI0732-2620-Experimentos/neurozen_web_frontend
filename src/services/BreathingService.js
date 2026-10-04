/**
 * BreathingService - Ejercicios de respiración y registro de sesiones.
 *
 * La API .NET no expone un endpoint de sesiones de respiración, así que las
 * sesiones completadas se guardan en el historial local del usuario.
 * (Antes el componente llamaba a this.breathingService sin crearlo y nada se guardaba.)
 */
import { readUserData, writeUserData } from './session.js'

const HISTORY_KEY = 'neurozen_breathing_sessions'

/** Patrones en segundos por fase */
export const BREATHING_EXERCISES = [
  { id: 1, key: 'mindful', duration: 300, difficulty: 'beginner', pattern: { inhale: 4, 'hold-in': 4, exhale: 6, 'hold-out': 0 } },
  { id: 2, key: 'box', duration: 240, difficulty: 'intermediate', pattern: { inhale: 4, 'hold-in': 4, exhale: 4, 'hold-out': 4 } },
  { id: 3, key: 'fourSevenEight', duration: 180, difficulty: 'advanced', pattern: { inhale: 4, 'hold-in': 7, exhale: 8, 'hold-out': 0 } }
]

export class BreathingService {
  getExercises() {
    return BREATHING_EXERCISES
  }

  getHistory() {
    return readUserData(HISTORY_KEY, [])
  }

  saveSession({ exerciseId, duration, mood = null, notes = '' }) {
    const entry = {
      id: Date.now(),
      exerciseId,
      duration,
      mood,
      notes: notes.trim().slice(0, 500),
      completedAt: new Date().toISOString()
    }
    const history = [entry, ...this.getHistory()].slice(0, 200)
    writeUserData(HISTORY_KEY, history)
    return entry
  }
}
