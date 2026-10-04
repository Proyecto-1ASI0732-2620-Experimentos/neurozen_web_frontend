/**
 * ActiveBreaksService - Configuración y agenda de pausas activas.
 * La configuración se guarda localmente por usuario (la API .NET no expone este recurso).
 */
import { readUserData, writeUserData } from './session.js'

const CONFIG_KEY = 'neurozen_active_breaks_config'
export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export const DEFAULT_CONFIG = {
  frequency: 45,
  duration: 5,
  isActive: true,
  settings: {
    workingHours: { start: '09:00', end: '18:00' },
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  }
}

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const toHHMM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

export class ActiveBreaksService {
  getConfiguration() {
    const saved = readUserData(CONFIG_KEY, null)
    if (!saved) return structuredClone(DEFAULT_CONFIG)
    return {
      ...structuredClone(DEFAULT_CONFIG),
      ...saved,
      settings: {
        workingHours: { ...DEFAULT_CONFIG.settings.workingHours, ...(saved.settings?.workingHours || {}) },
        workingDays: Array.isArray(saved.settings?.workingDays) ? saved.settings.workingDays : [...DEFAULT_CONFIG.settings.workingDays]
      }
    }
  }

  saveConfiguration(config) {
    writeUserData(CONFIG_KEY, config)
  }

  /** true si la hora de fin es posterior a la de inicio */
  isValidWorkingHours(config) {
    return toMinutes(config.settings.workingHours.end) > toMinutes(config.settings.workingHours.start)
  }

  isWorkingDay(config, date = new Date()) {
    return config.settings.workingDays.includes(WEEK_DAYS[(date.getDay() + 6) % 7])
  }

  /** Pausas de un día (respeta minutos de inicio/fin, días laborables e interruptor) */
  getSchedule(config, date = new Date()) {
    if (!config.isActive || !this.isWorkingDay(config, date) || !this.isValidWorkingHours(config)) return []
    const start = toMinutes(config.settings.workingHours.start)
    const end = toMinutes(config.settings.workingHours.end)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const schedule = []
    for (let t = start + config.frequency; t + config.duration <= end; t += config.frequency) {
      const status = !isToday ? 'upcoming' : t + config.duration <= nowMins ? 'past' : t <= nowMins ? 'current' : 'upcoming'
      schedule.push({ time: toHHMM(t), status })
    }
    const next = schedule.find((s) => s.status === 'upcoming')
    if (next) next.isNext = true
    return schedule
  }

  /** Resumen semanal calculado a partir de la configuración */
  getWeeklySummary(config) {
    if (!config.isActive || !this.isValidWorkingHours(config)) return { breaksPerWeek: 0, minutesPerWeek: 0, workingDays: config.settings.workingDays.length }
    const monday = new Date()
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    let count = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
      count += this.getSchedule(config, d).length
    }
    return { breaksPerWeek: count, minutesPerWeek: count * config.duration, workingDays: config.settings.workingDays.length }
  }
}
