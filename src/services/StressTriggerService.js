/**
 * StressTriggerService - Registro, consulta y eliminación de factores de estrés.
 *
 * @author Juan Carlos Angulo
 * @version 2.0.0
 */
import { HttpClient } from './HttpClient.js'
import { toApiDateTime, toDate } from '../utils/date.js'

export const TRIGGER_CATEGORIES = [
  'meeting', 'deadline', 'interpersonalConflict', 'workOverload',
  'technicalProblems', 'difficultClient', 'organizationalChanges', 'other'
]

/** stressLevel 1-10 -> intensidad que espera el backend */
export function levelToIntensity(level) {
  if (level <= 3) return 'low'
  if (level <= 7) return 'medium'
  return 'high'
}

const INTENSITY_TO_LEVEL = { low: 3, medium: 5, high: 8 }

/** Unifica el formato de la API (.NET) y del mock (date + time) */
export function normalizeTrigger(raw = {}) {
  const when =
    toDate(raw.triggeredAt) ||
    (raw.date ? toDate(`${raw.date}T${raw.time || '00:00'}:00`) : null) ||
    toDate(raw.createdAt)
  const level = Number(raw.stressLevel) ||
    (typeof raw.intensity === 'number' ? Math.round(raw.intensity / 10) : INTENSITY_TO_LEVEL[raw.intensity]) || 5
  return {
    id: raw.id,
    description: raw.description || raw.trigger || '',
    category: raw.category || 'other',
    stressLevel: Math.min(10, Math.max(1, level)),
    triggeredAt: when
  }
}

export class StressTriggerService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  async getStressTriggers(userId) {
    const response = await this.httpClient.get(`/api/v1/triggers?userId=${encodeURIComponent(userId)}`)
    return HttpClient.extractList(response)
      .map(normalizeTrigger)
      .sort((a, b) => (b.triggeredAt || 0) - (a.triggeredAt || 0))
  }

  async addStressTrigger({ userId, date, time, category, description, stressLevel }) {
    const payload = {
      userId: Number.isNaN(Number(userId)) ? userId : Number(userId),
      description: description.trim(),
      category: category || 'other',
      intensity: levelToIntensity(stressLevel),
      stressLevel,
      triggeredAt: toApiDateTime(date, time)
    }
    const response = await this.httpClient.post('/api/v1/triggers', payload)
    return normalizeTrigger(HttpClient.extractData(response) || payload)
  }

  async deleteStressTrigger(triggerId) {
    await this.httpClient.delete(`/api/v1/triggers/${encodeURIComponent(triggerId)}`)
  }

  getStressTriggerCategories() {
    return TRIGGER_CATEGORIES
  }
}
