/**
 * DashboardService - Estadísticas del Panel de Inicio.
 *
 * SOLO se muestran datos reales de la cuenta. Orden de prioridad:
 *  1. user.stressData que devuelva el backend (escala 0-100 del backend), si existe.
 *  2. Estadísticas calculadas con los desencadenantes registrados por el usuario
 *     (intensidad percibida en su escala original 1-10; NO es una medición clínica).
 *  3. Sin datos → { source: 'empty' }. La interfaz muestra un estado inicial (no hay datos de ejemplo).
 *
 * Antes (v2) se generaban "datos de demostración" estables por usuario cuando no había registros,
 * lo que hacía que un usuario nuevo viera estadísticas y recomendaciones que parecían propias.
 *
 * Si la consulta de desencadenantes falla, se lanza el error para que la interfaz distinga
 * "error al cargar" de "aún no hay datos".
 *
 * @version 3.0.0
 */
import { HttpClient } from './HttpClient.js'
import { StressTriggerService } from './StressTriggerService.js'
import { getUserId } from './session.js'

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_HOURS = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00']

/** Escala de los desencadenantes (slider del formulario de registro) */
export const TRIGGER_SCALE_MAX = 10

const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null)
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10)

export class DashboardService {
  constructor() {
    this.httpClient = new HttpClient()
    this.triggerService = new StressTriggerService()
    this.cache = null
  }

  /** Invalida la caché (p. ej. al volver al panel tras registrar algo) */
  reset() {
    this.cache = null
  }

  /** Carga la fuente de datos una vez; los cambios de período reutilizan la caché */
  async _loadSource() {
    if (this.cache) return this.cache
    const userId = getUserId()
    if (userId == null) return { type: 'empty' }

    try {
      const user = HttpClient.extractData(await this.httpClient.get(`/api/v1/users/${userId}`))
      const sd = user && user.stressData
      if (sd && Array.isArray(sd.weeklyData) && sd.weeklyData.length) {
        this.cache = { type: 'user', stressData: sd }
        return this.cache
      }
    } catch {
      /* el perfil es opcional: se intenta con los desencadenantes */
    }

    // Si esta llamada falla, el error llega a la interfaz (estado de error, no estado vacío)
    const triggers = await this.triggerService.getStressTriggers(userId)
    this.cache = triggers.some((t) => t.triggeredAt) ? { type: 'triggers', triggers } : { type: 'empty' }
    return this.cache
  }

  async getStressData(period = 'week') {
    const source = await this._loadSource()
    if (source.type === 'user') {
      const sd = source.stressData
      return {
        source: 'user',
        scaleMax: 100,
        currentLevel: Number(sd.currentLevel) || 0,
        average: Number(sd.average) || 0,
        peakHours: sd.peakHours || null,
        weeklyChange: typeof sd.weeklyChange === 'number' ? sd.weeklyChange : null,
        weeklyData: sd.weeklyData,
        totalTriggers: null
      }
    }
    if (source.type === 'triggers') return { source: 'triggers', ...this._fromTriggers(source.triggers, period) }
    return { source: 'empty' }
  }

  /** Compatibilidad con el nombre anterior */
  updateStressPeriod(period) {
    return this.getStressData(period)
  }

  /**
   * Estadísticas a partir de los desencadenantes (escala 1-10).
   * Los intervalos sin registros quedan en null (el gráfico no los dibuja como "0").
   */
  _fromTriggers(triggers, period, now = new Date()) {
    const dated = triggers.filter((t) => t.triggeredAt instanceof Date && !Number.isNaN(t.triggeredAt.getTime()))
    const level = (t) => t.stressLevel
    const daysAgo = (n) => { const d = new Date(now); d.setDate(now.getDate() - n); return d }
    let inPeriod
    let buckets

    if (period === 'day') {
      const from = daysAgo(1)
      inPeriod = dated.filter((t) => t.triggeredAt > from && t.triggeredAt <= now)
      buckets = DAY_HOURS.map((label, i) => {
        const start = 6 + i * 3
        const values = inPeriod.filter((t) => { const h = t.triggeredAt.getHours(); return h >= start && h < start + 3 }).map(level)
        return { day: label, value: round1(avg(values)) }
      })
    } else if (period === 'month') {
      inPeriod = dated.filter((t) => t.triggeredAt > daysAgo(28) && t.triggeredAt <= now)
      buckets = [3, 2, 1, 0].map((weeksAgo, i) => {
        const end = daysAgo(weeksAgo * 7)
        const start = daysAgo(weeksAgo * 7 + 7)
        const values = inPeriod.filter((t) => t.triggeredAt > start && t.triggeredAt <= end).map(level)
        return { day: `week${i + 1}`, value: round1(avg(values)) }
      })
    } else {
      inPeriod = dated.filter((t) => t.triggeredAt > daysAgo(7) && t.triggeredAt <= now)
      buckets = WEEK_DAYS.map((day, i) => {
        const values = inPeriod.filter((t) => (t.triggeredAt.getDay() + 6) % 7 === i).map(level)
        return { day, value: round1(avg(values)) }
      })
    }

    const thisWeek = avg(dated.filter((t) => t.triggeredAt > daysAgo(7)).map(level))
    const lastWeek = avg(dated.filter((t) => t.triggeredAt > daysAgo(14) && t.triggeredAt <= daysAgo(7)).map(level))
    const latest = [...dated].sort((a, b) => b.triggeredAt - a.triggeredAt)[0]
    const peak = [...inPeriod].sort((a, b) => b.stressLevel - a.stressLevel)[0]
    const peakHour = peak ? peak.triggeredAt.getHours() : null

    return {
      scaleMax: TRIGGER_SCALE_MAX,
      currentLevel: latest ? latest.stressLevel : null,
      lastRecordedAt: latest ? latest.triggeredAt : null,
      average: round1(avg(inPeriod.map(level))),
      peakHours: peakHour != null ? `${String(peakHour).padStart(2, '0')}:00 - ${String((peakHour + 2) % 24).padStart(2, '0')}:00` : null,
      // Solo se compara si hay registros en ambas semanas (antes se mostraba 0 % como si fuera real)
      weeklyChange: thisWeek != null && lastWeek != null && lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null,
      weeklyData: buckets,
      periodCount: inPeriod.length,
      totalTriggers: dated.length
    }
  }
}
