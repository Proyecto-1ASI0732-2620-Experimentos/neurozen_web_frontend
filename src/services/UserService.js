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

  async updateProfile(id, { username, email, fullName, phone, address, avatar, birthDate }) {
    const birth = toDate(birthDate)
    return this.httpClient.put(`/api/v1/users/${encodeURIComponent(id)}`, {
      username,
      email,
      fullName,
      phoneNumber: phone || '',
      address: address || '',
      avatarUrl: avatar || '',
      dateOfBirth: birth ? toLocalISODate(birth) : null
    })
  }
}
