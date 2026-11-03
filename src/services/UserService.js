/**
 * UserService - Perfil del usuario (PUT /api/v1/users/{id}).
 * Antes el perfil usaba fetch directo con la URL, saltándose HttpClient y el modo estático.
 */
import { HttpClient } from './HttpClient.js'
import { toLocalISODate, toDate } from '../utils/date.js'

export class UserService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  async getUser(id) {
    return HttpClient.extractData(await this.httpClient.get(`/api/v1/users/${encodeURIComponent(id)}`))
  }

  async updateProfile(id, { username, email, fullName, phone, address, avatar, birthDate, ageRange, occupation, workType }) {
    const birth = toDate(birthDate)
    const payload = {
      username,
      email,
      fullName,
      phoneNumber: phone || '',
      address: address || '',
      avatarUrl: avatar || '',
      dateOfBirth: birth ? toLocalISODate(birth) : null
    }
    // Datos del onboarding (opcionales)
    if (ageRange !== undefined) payload.ageRange = ageRange || null
    if (occupation !== undefined) payload.occupation = occupation || ''
    if (workType !== undefined) payload.workType = workType || null
    return this.httpClient.put(`/api/v1/users/${encodeURIComponent(id)}`, payload)
  }

  /** PUT /api/v1/users/{id}/password  { currentPassword, newPassword } */
  async changePassword(id, { currentPassword, newPassword }) {
    return this.httpClient.put(`/api/v1/users/${encodeURIComponent(id)}/password`, { currentPassword, newPassword })
  }

  /** DELETE /api/v1/users/{id}  (elimina la cuenta y sus datos) */
  async deleteAccount(id) {
    return this.httpClient.delete(`/api/v1/users/${encodeURIComponent(id)}`)
  }
}
