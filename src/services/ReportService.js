/**
 * ReportService - Informes de progreso que el trabajador comparte con su psicólogo (US15).
 *
 * El informe es una "foto" del momento: nivel y promedio de estrés de la semana,
 * cambio respecto a la semana anterior, horas pico, cantidad de registros, categoría
 * más frecuente y el último test de autoevaluación. El paciente decide con quién lo comparte.
 *
 * Endpoints (backend):
 *   POST /api/v1/reports
 *   GET  /api/v1/reports?patientId={id}       (informes que compartí)
 *   GET  /api/v1/reports?professionalId={id}  (informes que recibí, rol psicólogo)
 */
import { HttpClient } from './HttpClient.js'
import { DashboardService } from './DashboardService.js'
import { StressTriggerService } from './StressTriggerService.js'
import { AssessmentService } from './AssessmentService.js'
import { getUserId } from './session.js'

export function normalizeReport(raw = {}) {
  return {
    id: raw.id,
    patientId: raw.patientId,
    patientName: raw.patientName || '',
    professionalId: raw.professionalId,
    appointmentId: raw.appointmentId ?? null,
    stressCurrent: Number(raw.stressCurrent) || 0,
    stressAverage: Number(raw.stressAverage) || 0,
    weeklyChange: Number(raw.weeklyChange) || 0,
    peakHours: raw.peakHours || '',
    triggersCount: Number(raw.triggersCount) || 0,
    topCategory: raw.topCategory || '',
    lastAssessment: raw.lastAssessment || null,
    note: raw.note || '',
    createdAt: raw.createdAt || null
  }
}

export class ReportService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  /** Arma el resumen con los datos actuales del usuario (sin enviarlo) */
  async buildSummary() {
    const userId = getUserId()
    const [stress, triggers, assessment] = await Promise.all([
      new DashboardService().getStressData('week').catch(() => null),
      new StressTriggerService().getStressTriggers(userId).catch(() => []),
      new AssessmentService().getLatest().catch(() => null)
    ])
    const weekAgo = new Date(Date.now() - 7 * 86400000)
    const recent = triggers.filter((t) => t.triggeredAt && t.triggeredAt >= weekAgo)
    const counts = recent.reduce((acc, t) => ({ ...acc, [t.category]: (acc[t.category] || 0) + 1 }), {})
    const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    return {
      stressCurrent: stress?.currentLevel ?? 0,
      stressAverage: stress?.average ?? 0,
      weeklyChange: stress?.weeklyChange ?? 0,
      peakHours: stress?.peakHours || '',
      isDemoData: stress?.source === 'demo',
      triggersCount: recent.length,
      topCategory,
      lastAssessment: assessment ? { score: assessment.score, level: assessment.level, completedAt: assessment.completedAt } : null
    }
  }

  async share({ professionalId, appointmentId, summary, note = '' }) {
    const data = Object.fromEntries(Object.entries(summary).filter(([key]) => key !== 'isDemoData'))
    const payload = { ...data, patientId: getUserId(), professionalId, appointmentId, note: note.trim(), createdAt: new Date().toISOString() }
    return normalizeReport(HttpClient.extractData(await this.httpClient.post('/api/v1/reports', payload)) || payload)
  }

  async getMine() {
    const response = await this.httpClient.get(`/api/v1/reports?patientId=${encodeURIComponent(getUserId())}`)
    return HttpClient.extractList(response).map(normalizeReport)
  }

  async getReceived(professionalId) {
    const response = await this.httpClient.get(`/api/v1/reports?professionalId=${encodeURIComponent(professionalId)}`)
    return HttpClient.extractList(response)
      .map(normalizeReport)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }
}
