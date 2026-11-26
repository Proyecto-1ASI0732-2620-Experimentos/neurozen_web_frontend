/**
 * TherapistService - Profesionales y reseñas.
 * @version 2.0.0
 */
import { HttpClient } from './HttpClient.js'
import { normalizeVerification, VERIFICATION } from './roles.js'
import { ApiError } from './ApiError.js'
import { t } from '../i18n/index.js'
import { parseAvailabilityText } from '../utils/scheduleParser.js'

const DEFAULT_AVATAR = '/images-of-professionals/usuariodemo.jpg'

/** Número positivo o null (un valor ausente NO se interpreta como 0) */
function positiveOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Cantidad de reseñas (entero >= 0) o null si el backend no la envía */
function countOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

/**
 * Unifica los posibles nombres de campo del backend (M2).
 *  - price: tarifa real (> 0) o null → la interfaz muestra «Tarifa por definir» (antes null/0 se mostraba como $0).
 *  - rating: solo si hay valoraciones reales; con 0 reseñas → null («Sin valoraciones aún»).
 *  - experienceYears: años de experiencia si el backend los envía.
 */
export function normalizeProfessional(raw = {}) {
  const reviews = countOrNull(raw.reviews ?? raw.reviewsCount ?? raw.reviewCount)
  const rawRating = positiveOrNull(raw.rating ?? raw.averageRating)
  const experienceYears = positiveOrNull(raw.experienceYears ?? raw.yearsOfExperience)
  return {
    id: raw.id ?? raw.professionalId,
    name: raw.name || raw.fullName || [raw.firstName, raw.lastName].filter(Boolean).join(' ') || '—',
    specialty: raw.specialty || raw.specialization || '',
    experience: typeof raw.experience === 'string' ? raw.experience : '',
    experienceYears,
    rating: reviews === 0 ? null : (rawRating != null ? Math.min(5, rawRating) : null),
    reviews,
    price: positiveOrNull(raw.price ?? raw.pricePerSession ?? raw.sessionPrice),
    availability: raw.availability || '',
    bio: raw.bio || raw.biography || raw.description || '',
    image: raw.image || raw.photoUrl || raw.avatarUrl || DEFAULT_AVATAR,
    userId: raw.userId ?? raw.user?.id ?? null,
    email: raw.email || raw.user?.email || '',
    licenseNumber: raw.licenseNumber || raw.cpspNumber || '',
    // Los profesionales cargados antes de existir la verificación se consideran verificados
    verificationStatus: raw.verificationStatus ? normalizeVerification(raw.verificationStatus) : VERIFICATION.VERIFIED,
    rejectionReason: raw.rejectionReason || '',
    // Horario estructurado del backend; si solo hay texto (perfiles antiguos o «Lun, Mié · 09:00 - 13:00», el formato
    // que guarda el propio frontend), se interpreta. Si no es interpretable queda en null (no se inventa).
    availabilitySchedule: (raw.availabilitySchedule && raw.availabilitySchedule.days?.length ? raw.availabilitySchedule : null) || parseAvailabilityText(raw.availability),
    createdAt: raw.createdAt || null
  }
}

export function normalizeReview(raw = {}) {
  return {
    id: raw.id,
    userName: raw.userName || raw.author || '—',
    userImage: raw.userImage || DEFAULT_AVATAR,
    rating: Math.max(0, Math.min(5, Math.round(Number(raw.rating) || 0))),
    comment: raw.comment || raw.text || '',
    date: raw.date || raw.createdAt || null
  }
}

export class TherapistService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  /** Directorio público: solo psicólogos con la colegiatura verificada */
  async getTherapists() {
    const response = await this.httpClient.get('/api/v1/professionals')
    return HttpClient.extractList(response)
      .map(normalizeProfessional)
      .filter((p) => p.verificationStatus === VERIFICATION.VERIFIED)
  }

  /** Perfil público: si el psicólogo no está verificado se trata como inexistente */
  async getTherapist(id) {
    const response = await this.httpClient.get(`/api/v1/professionals/${encodeURIComponent(id)}`)
    const professional = normalizeProfessional(HttpClient.extractData(response))
    if (professional.verificationStatus !== VERIFICATION.VERIFIED) {
      throw new ApiError(t('errors.notFound'), { status: 404 })
    }
    return professional
  }

  /**
   * Reseña del paciente tras una sesión atendida.
   * POST /api/v1/professionals/{id}/reviews  { appointmentId, rating (1-5), comment }
   */
  async addReview(professionalId, { appointmentId, rating, comment }) {
    const response = await this.httpClient.post(`/api/v1/professionals/${encodeURIComponent(professionalId)}/reviews`, {
      appointmentId,
      rating: Math.max(1, Math.min(5, Math.round(rating))),
      comment: comment.trim()
    })
    return normalizeReview(HttpClient.extractData(response) || {})
  }

  /** Las reseñas son opcionales: si el endpoint no existe se devuelve [] */
  async getTherapistReviews(therapistId) {
    try {
      const response = await this.httpClient.get(`/api/v1/professionals/${encodeURIComponent(therapistId)}/reviews`)
      return HttpClient.extractList(response).map(normalizeReview)
    } catch {
      return []
    }
  }
}
