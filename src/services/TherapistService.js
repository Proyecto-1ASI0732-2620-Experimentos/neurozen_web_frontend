/**
 * TherapistService - Profesionales y reseñas.
 * @version 2.0.0
 */
import { HttpClient } from './HttpClient.js'

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
    image: raw.image || raw.photoUrl || raw.avatarUrl || DEFAULT_AVATAR
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

  async getTherapists() {
    const response = await this.httpClient.get('/api/v1/professionals')
    return HttpClient.extractList(response).map(normalizeProfessional)
  }

  async getTherapist(id) {
    const response = await this.httpClient.get(`/api/v1/professionals/${encodeURIComponent(id)}`)
    return normalizeProfessional(HttpClient.extractData(response))
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
