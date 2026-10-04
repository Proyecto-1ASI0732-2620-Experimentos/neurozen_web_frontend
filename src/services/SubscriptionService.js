/**
 * SubscriptionService - Suscripciones a planes.
 *
 * Contrato del backend (POST /api/v1/subscriptions):
 *   { userId, planId, nameUser, lastNameUser, emailUser, numberCard, expirationDate, cvv, isActive }
 * El backend exige los datos de tarjeta; el frontend ya no los registra en consola
 * ni conserva el CVV tras el envío (dependencia del backend documentada).
 */
import { HttpClient } from './HttpClient.js'

export const PLAN_IDS = { basic: 1, advanced: 2, professional: 3 }
export const PLAN_KEYS = { 0: 'free', 1: 'basic', 2: 'advanced', 3: 'professional' }

export class SubscriptionService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  async subscribe({ userId, planKey, firstName, lastName, email, cardNumber, expiry, cvv }) {
    return this.httpClient.post('/api/v1/subscriptions', {
      userId: Number.isNaN(Number(userId)) ? userId : Number(userId),
      planId: PLAN_IDS[planKey],
      nameUser: firstName.trim(),
      lastNameUser: lastName.trim(),
      emailUser: email.trim(),
      numberCard: cardNumber.replace(/\s/g, ''),
      expirationDate: expiry,
      cvv,
      isActive: false
    })
  }

  /** Devuelve la suscripción sin datos sensibles (solo últimos 4 dígitos) o null si no existe */
  async getByUser(userId) {
    try {
      const response = await this.httpClient.get(`/api/v1/subscriptions/user/${encodeURIComponent(userId)}`)
      const list = Array.isArray(response) ? response : [HttpClient.extractData(response)]
      const sub = list.find(Boolean)
      if (!sub) return null
      const card = String(sub.numberCard || '')
      return {
        planId: Number(sub.planId),
        planKey: PLAN_KEYS[Number(sub.planId)] || 'unknown',
        isActive: sub.isActive === true || sub.isActive === 'true',
        holder: [sub.nameUser, sub.lastNameUser].filter(Boolean).join(' '),
        email: sub.emailUser || '',
        cardLast4: card ? card.slice(-4) : ''
      }
    } catch (error) {
      if (error.status === 404) return null
      throw error
    }
  }
}
