/**
 * AdminService - Validación de psicólogos por el equipo de NeuroZen.
 *
 * La verificación es MANUAL: el administrador consulta el número de colegiatura en el
 * portal oficial del Colegio de Psicólogos del Perú (www.cpsp.pe), comprueba que el
 * nombre coincida y que el estado sea "HABILITADO", y luego aprueba o rechaza.
 *
 * Endpoints que usa (solo rol ADMIN):
 *   GET   /api/v1/admin/professionals?status=PENDING|VERIFIED|REJECTED
 *   PATCH /api/v1/admin/professionals/{id}/verify
 *   PATCH /api/v1/admin/professionals/{id}/reject   { reason }
 */
import { HttpClient } from './HttpClient.js'
import { normalizeProfessional } from './TherapistService.js'

export const CPSP_PORTAL_URL = 'https://www.cpsp.pe'

export class AdminService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  async getProfessionals(status) {
    const query = status ? `?status=${encodeURIComponent(status.toUpperCase())}` : ''
    const response = await this.httpClient.get(`/api/v1/admin/professionals${query}`)
    return HttpClient.extractList(response).map((raw) => ({
      ...normalizeProfessional(raw),
      specialty: raw.specialty || raw.specialization || ''
    }))
  }

  async verifyProfessional(id) {
    return this.httpClient.patch(`/api/v1/admin/professionals/${encodeURIComponent(id)}/verify`, {})
  }

  async rejectProfessional(id, reason) {
    return this.httpClient.patch(`/api/v1/admin/professionals/${encodeURIComponent(id)}/reject`, { reason: reason.trim() })
  }
}
