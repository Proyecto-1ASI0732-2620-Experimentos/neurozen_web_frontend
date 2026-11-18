/**
 * AdminResourceService - Gestión de la biblioteca (solo rol ADMIN).
 *
 * Endpoints (contrato del backend):
 *   GET   /api/v1/admin/resource-libraries        → todos los recursos, sin filtro de plan, con requiredPlan y requiredPlanName
 *   GET   /api/v1/admin/resource-libraries/{id}   → un recurso con su plan (para llenar el formulario de edición)
 *   POST  /api/v1/resource-libraries              → crear (201, devuelve el recurso con su plan)
 *   PATCH /api/v1/resource-libraries/{id}         → editar solo los campos enviados; null/ausente = se conserva, "" vacía
 */
import { HttpClient } from './HttpClient.js'

/** Tipos que acepta el backend (valor enviado tal cual). No se pueden cambiar después de crear el recurso. */
export const RESOURCE_TYPES = ['Video', 'Audio', 'Article', 'Exercise']

/** Plan mínimo: 1 = Básico, 2 = Avanzado (por defecto al crear), 3 = Profesional */
export const RESOURCE_PLANS = [1, 2, 3]
export const DEFAULT_PLAN = 2

/** Límites del backend (ResourceLibrary) */
export const RESOURCE_LIMITS = Object.freeze({
  titleMin: 3,
  titleMax: 200,
  descriptionMax: 1000,
  contentMax: 20000,
  authorMax: 120,
  urlMax: 500,
  durationMax: 600,
  tagsMax: 10,
  tagMax: 30
})

/** Normaliza un recurso de la vista de administración */
export function normalizeAdminResource(raw = {}) {
  const plan = Number(raw.requiredPlan)
  return {
    id: raw.id,
    title: raw.title || '',
    description: raw.description || '',
    content: raw.content || '',
    resourceType: RESOURCE_TYPES.find((t) => t.toLowerCase() === String(raw.resourceType || '').toLowerCase()) || raw.resourceType || '',
    contentUrl: raw.contentUrl || '',
    duration: Number(raw.duration) || 0,
    thumbnail: raw.thumbnail || '',
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
    author: raw.author || '',
    createdAt: raw.createdAt || null,
    requiredPlan: RESOURCE_PLANS.includes(plan) ? plan : null,
    requiredPlanName: raw.requiredPlanName || ''
  }
}

export class AdminResourceService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  async list() {
    const response = await this.httpClient.get('/api/v1/admin/resource-libraries')
    return HttpClient.extractList(response).map(normalizeAdminResource)
  }

  async get(id) {
    const response = await this.httpClient.get(`/api/v1/admin/resource-libraries/${encodeURIComponent(id)}`)
    return normalizeAdminResource(HttpClient.extractData(response))
  }

  async create(payload) {
    const response = await this.httpClient.post('/api/v1/resource-libraries', payload)
    return normalizeAdminResource(HttpClient.extractData(response) || {})
  }

  async update(id, changes) {
    const response = await this.httpClient.patch(`/api/v1/resource-libraries/${encodeURIComponent(id)}`, changes)
    return normalizeAdminResource(HttpClient.extractData(response) || {})
  }
}
