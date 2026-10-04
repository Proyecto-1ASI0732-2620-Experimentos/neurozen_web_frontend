/**
 * OnboardingService - Pasos de bienvenida.
 * El backend .NET no expone /onboarding, por lo que se usan pasos locales
 * (ahora con step/totalSteps para que se pinte el indicador de progreso).
 */
import { HttpClient } from './HttpClient.js'

export const ONBOARDING_STEPS = [
  { id: '1', step: 1, totalSteps: 3, title: 'welcome', description: 'welcomeDescription', icon: '👋' },
  { id: '2', step: 2, totalSteps: 3, title: 'profile', description: 'profileDescription', icon: '🧭' },
  { id: '3', step: 3, totalSteps: 3, title: 'preferences', description: 'preferencesDescription', icon: '🌿' }
]

export class OnboardingService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  async getOnboardingSteps() {
    return ONBOARDING_STEPS
  }

  async getOnboardingStep(id) {
    const step = ONBOARDING_STEPS.find((s) => String(s.id) === String(id))
    if (!step) throw new Error('Onboarding step not found')
    return step
  }
}
