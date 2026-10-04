/**
 * DashboardService - Estadísticas de estrés del Dashboard.
 *
 * Orden de prioridad de datos:
 *  1. user.stressData del backend (si existe)
 *  2. Estadísticas calculadas a partir de los triggers registrados por el usuario
 *  3. Datos de demostración, ESTABLES por usuario (antes cambiaban con cada clic)
 *     y marcados con source = 'demo' para avisar en la interfaz.
 *
 * @author Juan Carlos Angulo
 * @version 2.0.0
 */
import { HttpClient } from './HttpClient.js'
import { StressTriggerService } from './StressTriggerService.js'
import { getUserId } from './session.js'

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_HOURS = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00']

const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0)

/** PRNG determinista (mulberry32) para que la demo no cambie en cada recarga */
function seeded(seedText) {
  let h = 1779033703 ^ seedText.length
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

export class DashboardService {
  constructor() {
    this.httpClient = new HttpClient()
    this.triggerService = new StressTriggerService()
    this.cache = null
  }

  /** Carga la fuente de datos una vez; los cambios de período reutilizan la caché */
  async _loadSource() {
    if (this.cache) return this.cache
    const userId = getUserId()
    let source = { type: 'demo', userId }

    if (userId != null) {
      try {
        const user = HttpClient.extractData(await this.httpClient.get(`/api/v1/users/${userId}`))
        if (user && user.stressData && Array.isArray(user.stressData.weeklyData)) {
          source = { type: 'user', userId, stressData: user.stressData }
        }
      } catch {
        /* se intenta con triggers */
      }
      if (source.type === 'demo') {
        try {
          const triggers = await this.triggerService.getStressTriggers(userId)
          if (triggers.length) source = { type: 'triggers', userId, triggers }
        } catch {
          /* se usa demo */
        }
      }
    }
    this.cache = source
    return source
  }

  async getStressData(period = 'week') {
    const source = await this._loadSource()
    if (source.type === 'user' && period === 'week') {
      return { ...source.stressData, source: 'user' }
    }
    if (source.type === 'triggers') {
      return { ...this._fromTriggers(source.triggers, period), source: 'triggers' }
    }
    return { ...this._demo(period, String(source.userId ?? 'guest')), source: 'demo' }
  }

  /** Compatibilidad con el nombre anterior */
  updateStressPeriod(period) {
    return this.getStressData(period)
  }

  _fromTriggers(triggers, period) {
    const now = new Date()
    const dated = triggers.filter((t) => t.triggeredAt)
    const level = (t) => t.stressLevel * 10
    let buckets

    if (period === 'day') {
      buckets = DAY_HOURS.map((label, i) => {
        const from = 6 + i * 3
        const values = dated.filter((t) => { const h = t.triggeredAt.getHours(); return h >= from && h < from + 3 }).map(level)
        return { day: label, value: Math.round(avg(values)) }
      })
    } else if (period === 'month') {
      buckets = [3, 2, 1, 0].map((weeksAgo, i) => {
        const end = new Date(now); end.setDate(now.getDate() - weeksAgo * 7)
        const start = new Date(end); start.setDate(end.getDate() - 7)
        const values = dated.filter((t) => t.triggeredAt > start && t.triggeredAt <= end).map(level)
        return { day: `week${i + 1}`, value: Math.round(avg(values)) }
      })
    } else {
      buckets = WEEK_DAYS.map((day, i) => {
        const values = dated.filter((t) => (t.triggeredAt.getDay() + 6) % 7 === i).map(level)
        return { day, value: Math.round(avg(values)) }
      })
    }

    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
    const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14)
    const thisWeek = avg(dated.filter((t) => t.triggeredAt > weekAgo).map(level))
    const lastWeek = avg(dated.filter((t) => t.triggeredAt > twoWeeksAgo && t.triggeredAt <= weekAgo).map(level))
    const peak = [...dated].sort((a, b) => b.stressLevel - a.stressLevel)[0]
    const peakHour = peak ? peak.triggeredAt.getHours() : null

    return {
      currentLevel: dated.length ? level(dated[0]) : 0,
      average: Math.round(avg(dated.map(level))),
      peakHours: peakHour != null ? `${String(peakHour).padStart(2, '0')}:00 - ${String((peakHour + 2) % 24).padStart(2, '0')}:00` : '--',
      weeklyChange: thisWeek && lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0,
      weeklyData: buckets,
      totalTriggers: dated.length
    }
  }

  _demo(period, seedKey) {
    const rand = seeded(`${seedKey}-${period}`)
    const base = 45 + rand() * 25
    const patterns = {
      day: { labels: DAY_HOURS, factors: [0.6, 0.85, 0.95, 1.2, 1.05, 0.7] },
      week: { labels: WEEK_DAYS, factors: [0.9, 1.0, 1.1, 1.2, 1.1, 0.7, 0.6] },
      month: { labels: ['week1', 'week2', 'week3', 'week4'], factors: [0.85, 1.0, 1.1, 0.9] }
    }
    const { labels, factors } = patterns[period] || patterns.week
    const data = labels.map((day, i) => ({
      day,
      value: Math.round(Math.max(10, Math.min(100, base * factors[i] + (rand() - 0.5) * 12)))
    }))
    const peak = data.reduce((m, d) => (d.value > m.value ? d : m))
    const todayIndex = period === 'week' ? (new Date().getDay() + 6) % 7 : Math.floor(rand() * data.length)
    return {
      currentLevel: data[Math.min(todayIndex, data.length - 1)].value,
      average: Math.round(avg(data.map((d) => d.value))),
      peakHours: period === 'day' ? peak.day : '14:00 - 16:00',
      weeklyChange: Math.round((rand() - 0.5) * 20),
      weeklyData: data
    }
  }
}
