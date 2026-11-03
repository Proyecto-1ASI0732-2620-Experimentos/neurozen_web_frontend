/**
 * TherapistService - Profesionales y reseñas.
 * @version 2.0.0
 */
import { HttpClient } from './HttpClient.js'
import { normalizeVerification, VERIFICATION } from './roles.js'
import { ApiError } from './ApiError.js'
import { t } from '../i18n/index.js'

const DEFAULT_AVATAR = '/images-of-professionals/usuariodemo.jpg'

/** Unifica los posibles nombres de campo del backend */
export function normalizeProfessional(raw = {}) {
  return {
    id: raw.id ?? raw.professionalId,
    name: raw.name || raw.fullName || [raw.firstName, raw.lastName].filter(Boolean).join(' ') || '—',
    specialty: raw.specialty || raw.specialization || '',
    experience: raw.experience || (raw.yearsOfExperience ? `${raw.yearsOfExperience}` : ''),
    rating: Number(raw.rating) || 0,
    reviews: Number(raw.reviews ?? raw.reviewsCount) || 0,
    price: Number(raw.price ?? raw.pricePerSession ?? raw.sessionPrice) || 0,
    availability: raw.availability || '',
    bio: raw.bio || raw.biography || raw.description || '',
    image: raw.image || raw.photoUrl || raw.avatarUrl || DEFAULT_AVATAR,
    userId: raw.userId ?? raw.user?.id ?? null,
    email: raw.email || raw.user?.email || '',
    licenseNumber: raw.licenseNumber || raw.cpspNumber || '',
    // Los profesionales cargados antes de existir la verificación se consideran verificados
    verificationStatus: raw.verificationStatus ? normalizeVerification(raw.verificationStatus) : VERIFICATION.VERIFIED,
    rejectionReason: raw.rejectionReason || '',
    availabilitySchedule: raw.availabilitySchedule || null,
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
